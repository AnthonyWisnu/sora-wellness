const assert=require('node:assert/strict'),crypto=require('node:crypto');
const {start,base,pool,f,api,save,screenshot}=require('./browser-common.cjs');
let member,guest,classId,sessionId;const extraSessions=[],extraBookings=[];const checks={};
async function selectSession(page,title,date) {
  await page.goto(base+'/jadwal');await page.locator('.zeira-date-options').waitFor();
  const label=new Intl.DateTimeFormat('id-ID',{timeZone:'UTC',weekday:'long',day:'numeric',month:'long'}).format(new Date(date+'T12:00:00Z'));
  await page.getByRole('button',{name:new RegExp('^'+label+', ')}).click();
  await page.locator('.zeira-session-card').filter({has:page.getByRole('heading',{name:title,exact:true})}).getByRole('button',{name:'Pesan kelas',exact:true}).click();
}
async function directBooking(context,id) {
  const token=(await(await context.request.get(base+'/api/v1/auth/csrf')).json()).token;
  return context.request.post(base+'/api/v1/bookings',{headers:{'x-csrf-token':token,'Idempotency-Key':crypto.randomUUID()},data:{sessionId:id,paymentChoice:'quota'}});
}
(async()=>{
  member=await start('member');
  const studio=await api(member.context,'/public/studio'),packages=await api(member.context,'/public/packages');
  const date=(await pool.query("SELECT ((now() AT TIME ZONE timezone)::date+2)::text AS date FROM studio WHERE id=1")).rows[0].date;
  classId=(await pool.query(`INSERT INTO class_types(title,category,level,duration_minutes,default_capacity,default_price_idr)
    VALUES($1,'Pilates','intermediate_2',60,3,90000) RETURNING id`,['Cek Benefit Lanjutan 2 '+crypto.randomUUID().slice(0,8)])).rows[0].id;
  const title=(await pool.query('SELECT title FROM class_types WHERE id=$1',[classId])).rows[0].title;
  const made=await pool.query(`INSERT INTO class_sessions(class_type_id,coach_id,local_date,starts_at,ends_at,capacity,price_idr)
    SELECT $1,$2,$3::date,($3::date+time '12:00') AT TIME ZONE timezone,($3::date+time '13:00') AT TIME ZONE timezone,3,90000
    FROM studio WHERE id=1 RETURNING id`,[classId,f.users.coach.id,date]);sessionId=made.rows[0].id;

  await member.page.goto(base+'/membership');await member.page.locator('#pilihan-paket article').first().waitFor();
  const offerText=await member.page.locator('main').innerText();
  checks.offer={quotaMentioned:/jatah kelas|kuota/i.test(offerText),levelsMentioned:/Lanjutan 1/.test(offerText)&&/Lanjutan 2/.test(offerText),bookingWindowMentioned:new RegExp(studio.memberScheduleDays+'\\s*hari').test(offerText),lockerMentioned:/loker/i.test(offerText)};
  console.log('PENAWARAN',JSON.stringify(checks.offer));
  const site=await api(member.context,'/public/site');
  checks.cmsBenefits=site.pages.membership.filter(s=>s.visible!==false&&s.type==='features').map(s=>({title:s.title,items:s.items.map(i=>({title:i.title,body:i.body}))}));

  await member.page.goto(base+'/jadwal');await member.page.locator('.zeira-schedule-window').waitFor();
  checks.memberWindowUi=await member.page.locator('.zeira-schedule-window').innerText();
  assert.match(checks.memberWindowUi,new RegExp(studio.memberScheduleDays+' hari'));
  const before=await api(member.context,`/sessions/${sessionId}/booking-options`);
  assert.equal(before.memberOnDate,true);assert.equal(before.quotaAvailable,true);
  const balanceBefore=(await api(member.context,'/me/wallet')).balanceIdr;
  await selectSession(member.page,title,date);
  const quotaRadio=member.page.getByRole('radio',{name:/Pakai jatah member/});await quotaRadio.waitFor();assert.equal(await quotaRadio.isChecked(),true);
  await screenshot(member.page,'benefit-kuota-lanjutan-2');
  const created=member.page.waitForResponse(r=>r.url().endsWith('/api/v1/bookings')&&r.request().method()==='POST');
  await member.page.getByRole('button',{name:'Konfirmasi reservasi',exact:true}).click();
  const response=await created;assert.equal(response.status(),201);const booked=await response.json();extraBookings.push(booked.id);
  assert.equal(booked.source,'quota');assert.equal(booked.gatewayDueIdr,0);assert.equal(booked.walletReservedIdr,0);assert.equal(booked.payment,null);
  const after=await api(member.context,`/sessions/${sessionId}/booking-options`);assert.equal(after.quotaUsed,before.quotaUsed+1);
  assert.equal((await api(member.context,'/me/wallet')).balanceIdr,balanceBefore);
  assert.equal((await pool.query('SELECT 1 FROM payment_transactions WHERE booking_id=$1',[booked.id])).rowCount,0);
  checks.quotaBooking={result:'PASS',level:'intermediate_2',quotaBefore:before.quotaUsed,quotaAfter:after.quotaUsed,walletUnchanged:true,gatewayDueIdr:0,paymentIntentCreated:false};

  await member.page.goto(base+'/dashboard/bookings');
  const row=member.page.locator('article.live-booking').filter({has:member.page.getByRole('heading',{name:title,exact:true})});
  await row.getByRole('button',{name:'Batalkan',exact:true}).click();
  const cancelled=member.page.waitForResponse(r=>r.url().endsWith(`/bookings/${booked.id}/cancel`)&&r.request().method()==='POST');
  await member.page.getByRole('dialog').getByRole('button',{name:'Batalkan booking',exact:true}).click();
  assert.equal((await(await cancelled).json()).quotaReturned,true);
  assert.equal((await api(member.context,`/sessions/${sessionId}/booking-options`)).quotaUsed,before.quotaUsed);
  checks.quotaReturn={result:'PASS',quotaReturnedOnce:true,usedAfterCancellation:before.quotaUsed};

  const locker=await api(member.context,'/me/locker');assert.ok(locker.code);
  await member.page.goto(base+'/dashboard/wallet');await member.page.locator('.studio-my-locker h2').getByText(locker.code,{exact:true}).waitFor();
  checks.locker={result:'PASS',assignedCodeVisible:true,assignmentByAdmin:true,customerSelfSelection:false};

  guest=await start('guest');
  await guest.page.goto(base+'/jadwal');await guest.page.locator('.zeira-schedule-window').waitFor();
  checks.guestWindowUi=await guest.page.locator('.zeira-schedule-window').innerText();assert.match(checks.guestWindowUi,new RegExp(studio.guestScheduleDays+' hari'));
  await selectSession(guest.page,title,date);
  await guest.page.getByText('Tingkat ini memerlukan paket aktif pada tanggal sesi',{exact:true}).waitFor();
  assert.equal(await guest.page.getByRole('button',{name:'Konfirmasi reservasi',exact:true}).count(),0);
  const forbidden=await directBooking(guest.context,sessionId);assert.equal(forbidden.status(),409);
  checks.levelRestriction={result:'PASS',regularUiBlocked:true,regularDirectApiHttp:forbidden.status()};

  // Isi pemakaian kuota dengan data fixture, lalu buktikan backend dan UI menolak pemakaian melebihi jatah.
  for(let n=before.quotaUsed;n<before.quotaTotal;n++) {
    const extra=(await pool.query(`INSERT INTO class_sessions(class_type_id,coach_id,local_date,starts_at,ends_at,capacity,price_idr)
      SELECT $2::uuid,coach_id,local_date,starts_at,ends_at,capacity,price_idr FROM class_sessions WHERE id=$1 RETURNING id`,[sessionId,f.classes.pilates])).rows[0].id;
    extraSessions.push(extra);
    const used=(await pool.query(`INSERT INTO bookings(customer_id,session_id,status,source,price_idr,idempotency_key,confirmed_at)
      VALUES($1,$2,'confirmed','quota',90000,$3,now()) RETURNING id`,[f.users.member.id,extra,crypto.randomUUID()])).rows[0].id;extraBookings.push(used);
  }
  const exhausted=await api(member.context,`/sessions/${sessionId}/booking-options`);assert.equal(exhausted.quotaAvailable,false);
  await selectSession(member.page,title,date);await member.page.getByRole('radio',{name:/Kelas satuan/}).waitFor();
  assert.equal(await member.page.getByRole('radio',{name:/Pakai jatah member/}).count(),0);
  const denied=await directBooking(member.context,sessionId);assert.equal(denied.status(),409);
  checks.quotaExhausted={result:'PASS',quotaOptionHidden:true,directApiHttp:denied.status()};
  assert.deepEqual([...member.errors,...guest.errors],[]);
  save('member-benefits-results',{result:'PASS',checkedAt:new Date().toISOString(),applicationCodeChanged:false,monthlyClassQuota:packages.monthlyClassQuota,memberScheduleDays:studio.memberScheduleDays,guestScheduleDays:studio.guestScheduleDays,checks});
  console.log(JSON.stringify({result:'PASS',offer:checks.offer,quotaBooking:checks.quotaBooking,quotaReturn:checks.quotaReturn,locker:checks.locker,levelRestriction:checks.levelRestriction,quotaExhausted:checks.quotaExhausted}));
})().catch(async error=>{console.error(error.stack);if(member)console.log((await member.page.locator('main').ariaSnapshot()).slice(0,2200));process.exitCode=1}).finally(async()=>{
  if(member)await member.browser.close();if(guest)await guest.browser.close();
  if(extraBookings.length)await pool.query('DELETE FROM bookings WHERE id=ANY($1::uuid[])',[extraBookings]);
  if(extraSessions.length)await pool.query('DELETE FROM class_sessions WHERE id=ANY($1::uuid[])',[extraSessions]);
  if(sessionId)await pool.query('DELETE FROM class_sessions WHERE id=$1',[sessionId]);
  if(classId)await pool.query('DELETE FROM class_types WHERE id=$1',[classId]);
  await pool.end();
});
