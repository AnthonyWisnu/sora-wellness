const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const { start, api, save, screenshot, pool, f, base } = require('./browser-common.cjs');
let member, guest, classId;
const sessionIds = [];
(async () => {
  const dates = (await pool.query(`SELECT (now() AT TIME ZONE timezone)::date::text AS today,
    ((now() AT TIME ZONE timezone)::date+29)::text AS last,
    ((now() AT TIME ZONE timezone)::date+30)::text AS outside FROM studio WHERE id=1`)).rows[0];
  const title = 'Verifikasi Jadwal ' + crypto.randomUUID().slice(0, 8);
  classId = (await pool.query(`INSERT INTO class_types(title,category,level,duration_minutes,default_capacity,default_price_idr)
    VALUES($1,'Yoga','beginner',60,3,75000) RETURNING id`, [title])).rows[0].id;
  for (const date of [dates.last, dates.outside]) {
    sessionIds.push((await pool.query(`INSERT INTO class_sessions(class_type_id,coach_id,local_date,starts_at,ends_at,capacity,price_idr)
      SELECT $1,$2,$3::date,($3::date+time '12:00') AT TIME ZONE timezone,
      ($3::date+time '13:00') AT TIME ZONE timezone,3,75000 FROM studio WHERE id=1 RETURNING id`,
    [classId, f.users.coach.id, date])).rows[0].id);
  }
  member = await start('member');
  const allowed = await api(member.context, '/sessions/' + sessionIds[0] + '/booking-options');
  assert.equal(allowed.bookable, true);
  const denied = await api(member.context, '/sessions/' + sessionIds[1] + '/booking-options');
  assert.equal(denied.bookable, false);
  const viewports = [];
  for (const width of [1280, 375]) {
    await member.page.setViewportSize({ width, height: 900 });
    await member.page.goto(base + '/jadwal');
    await member.page.getByText('Pekan 1 dari 5', { exact: true }).waitFor();
    const labels = [];
    for (let week = 1; week <= 5; week++) {
      await member.page.getByText(`Pekan ${week} dari 5`, { exact: true }).waitFor();
      labels.push(...await member.page.locator('.zeira-date-options button').evaluateAll(items => items.map(item => item.getAttribute('aria-label'))));
      if (week < 5) await member.page.getByRole('button', { name: 'Pekan berikutnya', exact: true }).click();
    }
    assert.equal(labels.length, 30);
    assert.equal(new Set(labels).size, 30);
    await member.page.locator('.zeira-date-options button').last().click();
    const card = member.page.locator('.zeira-session-card').filter({ has: member.page.getByRole('heading', { name: title, exact: true }) });
    await card.waitFor();
    await card.getByRole('button', { name: 'Pesan kelas', exact: true }).click();
    await member.page.getByRole('button', { name: 'Konfirmasi reservasi', exact: true }).waitFor();
    viewports.push({ width, visibleDates: labels.length, distinctDates: new Set(labels).size, finalDaySessionVisible: true, bookingDialogAvailable: true });
    if (width === 375) await screenshot(member.page, 'benefit-jadwal-hari-ke-30');
  }
  guest = await start('guest', { width: 375, height: 900 });
  await guest.page.goto(base + '/jadwal');
  await guest.page.locator('.zeira-date-options button').first().waitFor();
  assert.equal(await guest.page.locator('.zeira-date-options button').count(), 7);
  assert.equal(await guest.page.getByRole('button', { name: 'Pekan berikutnya', exact: true }).count(), 0);
  const guestSession = await guest.context.request.get(base + '/api/v1/public/sessions/' + sessionIds[0]);
  assert.equal(guestSession.status(), 404);
  assert.deepEqual([...member.errors, ...guest.errors], []);
  const result = { result: 'PASS', checkedAt: new Date().toISOString(), target: 'fixture lokal', dates,
    window: '30 tanggal, termasuk hari ini, berakhir pada hari ini + 29', memberViewports: viewports,
    finalDayBookable: allowed.bookable, dayBeyondWindowBookable: denied.bookable,
    regularVisibleDates: 7, regularFinalDaySessionHttp: guestSession.status() };
  save('schedule-window-results', result);
  console.log(JSON.stringify(result));
})().catch(error => { console.error(error.stack); process.exitCode = 1; }).finally(async () => {
  if (member) await member.browser.close();
  if (guest) await guest.browser.close();
  if (sessionIds.length) await pool.query('DELETE FROM class_sessions WHERE id=ANY($1::uuid[])', [sessionIds]);
  if (classId) await pool.query('DELETE FROM class_types WHERE id=$1', [classId]);
  await pool.end();
});
