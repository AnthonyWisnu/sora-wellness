const assert=require('node:assert/strict');
const {start,base,pool,f,api,save,screenshot}=require('./browser-common.cjs');
const memberBooking=require('./member-booking-results.json');
const admin=require('./admin-studio-results.json');
let runtime;
(async()=>{
  // Fixture riwayat consent sebelum sesi dimulai, tanpa memalsukan tanggal aplikasi.
  await pool.query(`UPDATE health_profiles h SET consented_at=s.starts_at-interval '1 day',updated_at=s.starts_at-interval '1 day'
    FROM class_sessions s WHERE s.id=$1 AND h.customer_id=$2`,[f.sessions.active,f.users.rosterMember.id]);
  await pool.query(`INSERT INTO health_profile_revisions(customer_id,note,recorded_at)
    SELECT customer_id,note,consented_at FROM health_profiles WHERE customer_id=$1`,[f.users.rosterMember.id]);
  runtime=await start('frontdesk');let {page}=runtime;
  await page.goto(base+'/dashboard/attendance');
  const input=page.getByPlaceholder('Scan atau paste kode QR / ID Booking / Order ID (misal: b210d394...)',{exact:true});
  await input.fill(JSON.stringify({app:'sora-wellness',type:'pass',bookingId:memberBooking.bookingId}));
  let responsePromise=page.waitForResponse(r=>r.url().endsWith('/api/v1/admin/sessions/check-in')&&r.request().method()==='POST');
  await page.getByRole('button',{name:'Verifikasi & Masuk',exact:true}).click();
  const first=await responsePromise;assert.equal(first.status(),201);const result=await first.json();assert.equal(result.lockerCode,admin.lockerCode);
  assert.equal(result.healthNote,undefined);
  await input.fill(f.activeBooking);
  responsePromise=page.waitForResponse(r=>r.url().endsWith('/api/v1/admin/sessions/check-in')&&r.request().method()==='POST');
  await page.getByRole('button',{name:'Verifikasi & Masuk',exact:true}).click();assert.equal((await responsePromise).status(),201);
  assert.equal((await pool.query('SELECT 1 FROM attendance WHERE booking_id=$1',[f.activeBooking])).rowCount,0,'Verifikasi lobi tidak mencatat matras');
  await runtime.browser.close();runtime=await start('coach');page=runtime.page;
  await page.goto(base+'/dashboard/attendance');
  await page.getByRole('button',{name:/^Hari Ini \(/}).click();
  const active=page.locator('article').filter({hasText:'Berlangsung'});
  await active.getByRole('button',{name:'Buka Kelas & Absensi',exact:true}).click();
  await page.getByText('Data sintetis: lutut membutuhkan modifikasi gerakan.',{exact:true}).waitFor();
  await page.getByText('Tiba di Lobi',{exact:true}).waitFor();
  responsePromise=page.waitForResponse(r=>r.url().endsWith(`/attendance/${f.users.rosterMember.id}`)&&r.request().method()==='PUT');
  await page.getByRole('button',{name:'Hadir',exact:true}).click();assert.equal((await responsePromise).status(),200);
  await page.locator('.live-attendance-status.present').waitFor();
  await screenshot(page,'04-coach-roster');
  const same=await api(runtime.context,`/coach/sessions/${f.sessions.active}/participants`);assert.equal(same.participants[0].present,true);
  await runtime.browser.close();runtime=await start('otherCoach');
  const denied=await runtime.context.request.get(base+`/api/v1/coach/sessions/${f.sessions.active}/participants`);assert.equal(denied.status(),404);
  save('attendance-results',{result:'PASS',frontDeskLockerVisible:true,frontDeskHealthExcluded:true,lobbyDidNotMarkMat:true,coachRosterHealthVisible:true,coachMatAttendance:true,otherCoachDenied:denied.status(),browserErrors:runtime.errors});
  assert.deepEqual(runtime.errors,[]);console.log('PASS: lobi dan loker, privasi kesehatan, roster coach aktif, presensi matras, isolasi coach lain');
})().catch(async error=>{console.error(error.stack);if(runtime){console.log((await runtime.page.locator('main').ariaSnapshot()).slice(0,2200));await screenshot(runtime.page,'attendance-failure')}process.exitCode=1}).finally(async()=>{if(runtime)await runtime.browser.close();await pool.end()});
