import assert from 'node:assert/strict';
import { createHash, randomBytes } from 'node:crypto';
import supertest from 'supertest';
import { Pool } from 'pg';
import { hashPassword } from '../src/shared/security';
import { Db } from '../src/shared/db';
import { PaymentSettings } from '../src/payments/payment-settings';

async function main() {
  const base = process.env.API_BASE_URL ?? 'http://127.0.0.1:3000';
  const client = supertest.agent(base);
  const csrf = await client.get('/api/v1/auth/csrf').expect(200);
  const password = `${randomBytes(15).toString('base64url')}A1!`;
  const email = `smoke-${randomBytes(6).toString('hex')}@example.test`;
  await client.post('/api/v1/auth/register').send({ email, fullName: 'Pelanggan Uji', password }).expect(403);
  await client.post('/api/v1/auth/register').set('x-csrf-token', csrf.body.token).send({ email, fullName: 'Pelanggan Uji', password }).expect(201);
  const me = await client.get('/api/v1/me').expect(200);
  assert.equal(me.body.email, email);
  await client.get('/api/v1/admin/policies').expect(403);
  await client.get('/api/v1/admin/payment-settings').expect(403);
  const nextCsrf = await client.get('/api/v1/auth/csrf').expect(200);
  let sessions = await client.get('/api/v1/public/sessions').expect(200);
  let free = sessions.body.find((s: { singlePriceIdr: number; seatsLeft: number }) => s.singlePriceIdr === 0 && s.seatsLeft > 0);
  if (!free) {
    const seededFree = sessions.body.find((s: { singlePriceIdr: number }) => s.singlePriceIdr === 0);
    assert.ok(seededFree, 'Seed harus menyediakan sesi gratis');
    const fixtureDb = new Pool({ connectionString: process.env.DATABASE_URL });
    try { await fixtureDb.query('UPDATE class_sessions SET capacity=capacity+1 WHERE id=$1', [seededFree.id]); }
    finally { await fixtureDb.end(); }
    sessions = await client.get('/api/v1/public/sessions').expect(200);
    free = sessions.body.find((s: { id: string }) => s.id === seededFree.id);
  }
  assert.ok(free && free.seatsLeft > 0, 'Sesi gratis uji harus memiliki kursi');
  const key = randomBytes(16).toString('hex');
  const booked = await client.post('/api/v1/bookings').set('x-csrf-token', nextCsrf.body.token).set('Idempotency-Key', key).send({ sessionId: free.id, paymentChoice: 'single' }).expect(201);
  assert.equal(booked.body.status, 'confirmed');
  assert.equal(booked.body.source, 'free');
  const replay = await client.post('/api/v1/bookings').set('x-csrf-token', nextCsrf.body.token).set('Idempotency-Key', key).send({ sessionId: free.id, paymentChoice: 'single' }).expect(201);
  assert.equal(replay.body.id, booked.body.id);
  const listing = await client.get('/api/v1/bookings').expect(200);
  assert.ok(listing.body.some((b: { id: string }) => b.id === booked.body.id));
  const cancelledFree = await client.post(`/api/v1/bookings/${booked.body.id}/cancel`).set('x-csrf-token', nextCsrf.body.token).expect(201);
  assert.equal(cancelledFree.body.cancellationOrigin, 'customer');
  assert.equal(cancelledFree.body.creditedBalanceIdr, 0);
  const cancelledReplay = await client.post(`/api/v1/bookings/${booked.body.id}/cancel`).set('x-csrf-token', nextCsrf.body.token).expect(201);
  assert.equal(cancelledReplay.body.status, 'cancelled');
  const paidSession = sessions.body.find((s: { singlePriceIdr: number; level: string; seatsLeft: number }) => s.singlePriceIdr > 0 && s.level === 'beginner' && s.seatsLeft > 0);
  assert.ok(paidSession, 'Seed harus menyediakan kelas satuan berbayar');
  const paidKey = randomBytes(16).toString('hex');
  const paid = await client.post('/api/v1/bookings').set('x-csrf-token', nextCsrf.body.token).set('Idempotency-Key', paidKey).send({ sessionId: paidSession.id, paymentChoice: 'single' }).expect(201);
  assert.equal(paid.body.status, 'pending_payment');
  assert.equal(paid.body.gatewayDueIdr, paidSession.singlePriceIdr);
  assert.equal(new URL(paid.body.payment.redirectUrl).hostname, 'app.sandbox.midtrans.com');
  const paidReplay = await client.post('/api/v1/bookings').set('x-csrf-token', nextCsrf.body.token).set('Idempotency-Key', paidKey).send({ sessionId: paidSession.id, paymentChoice: 'single' }).expect(201);
  assert.equal(paidReplay.body.payment.snapToken, paid.body.payment.snapToken);
  const pendingStatus = await client.post(`/api/v1/bookings/${paid.body.id}/refresh-payment`).set('x-csrf-token', nextCsrf.body.token).expect(201);
  assert.equal(pendingStatus.body.paymentStatus, 'pending');
  await client.post('/api/v1/webhooks/midtrans').send({ order_id: paid.body.payment.orderId, status_code: '200', gross_amount: `${paid.body.gatewayDueIdr}.00`, signature_key: 'bad' }).expect(403);
  const settingsDb = new Db();
  try {
    const { serverKey } = await new PaymentSettings(settingsDb).credentials();
    const notice = { order_id: paid.body.payment.orderId as string, status_code: '200', gross_amount: `${paid.body.gatewayDueIdr}.00` };
    const signature_key = createHash('sha512').update(`${notice.order_id}${notice.status_code}${notice.gross_amount}${serverKey}`).digest('hex');
    await client.post('/api/v1/webhooks/midtrans').send({ ...notice, signature_key }).expect(201);
  } finally { await settingsDb.onModuleDestroy(); }
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  try {
    await pool.query(`INSERT INTO memberships (customer_id,starts_on,ends_on) SELECT $1,(now() AT TIME ZONE st.timezone)::date,(now() AT TIME ZONE st.timezone)::date+30 FROM studio st WHERE st.id=1`, [me.body.id]);
    const advanced = await pool.query<{ id: string }>(`SELECT s.id FROM class_sessions s JOIN class_types t ON t.id=s.class_type_id JOIN studio st ON st.id=1 WHERE t.level='intermediate_1' AND s.status='scheduled' AND s.local_date>=(now() AT TIME ZONE st.timezone)::date+1 AND s.local_date<(now() AT TIME ZONE st.timezone)::date+10 ORDER BY s.local_date LIMIT 1`);
    assert.ok(advanced.rows[0], 'Seed harus menyediakan kelas lanjutan dalam sembilan hari ke depan');
    await pool.query(`UPDATE class_sessions s SET capacity=GREATEST(s.capacity,1+(SELECT count(*)::int FROM bookings b WHERE b.session_id=s.id AND (b.status='confirmed' OR b.status='pending_payment' AND b.hold_expires_at>now()))) WHERE s.id=$1`, [advanced.rows[0].id]);
    const advancedBooking = await client.post('/api/v1/bookings').set('x-csrf-token', nextCsrf.body.token).set('Idempotency-Key', randomBytes(16).toString('hex')).send({ sessionId: advanced.rows[0].id, paymentChoice: 'quota' }).expect(201);
    assert.equal(advancedBooking.body.source, 'quota');
    const quota = await client.get('/api/v1/me/membership').expect(200);
    assert.ok(quota.body.quota.some((q: { used: number }) => q.used === 1));
    const fixture = await pool.query<{ id: string }>(`INSERT INTO class_sessions (class_type_id,coach_id,local_date,starts_at,ends_at,capacity,price_idr) SELECT t.id,u.id,x.d,(x.d + time '12:00') AT TIME ZONE st.timezone,((x.d + time '12:00') AT TIME ZONE st.timezone) + interval '1 hour',1,0 FROM class_types t CROSS JOIN app_users u CROSS JOIN studio st CROSS JOIN LATERAL (SELECT (now() AT TIME ZONE st.timezone)::date + 1 AS d) x WHERE t.default_price_idr=0 AND u.role='coach' AND st.id=1 LIMIT 1 RETURNING id`);
    const second = supertest.agent(base);
    const secondCsrf = await second.get('/api/v1/auth/csrf').expect(200);
    const secondUser = await second.post('/api/v1/auth/register').set('x-csrf-token', secondCsrf.body.token).send({ email: `smoke-${randomBytes(6).toString('hex')}@example.test`, fullName: 'Pelanggan Kedua', password }).expect(201);
    const a = await client.get('/api/v1/auth/csrf').expect(200);
    const b = await second.get('/api/v1/auth/csrf').expect(200);
    const attempt = (agent: typeof client, token: string) => agent.post('/api/v1/bookings').set('x-csrf-token', token).set('Idempotency-Key', randomBytes(16).toString('hex')).send({ sessionId: fixture.rows[0].id, paymentChoice: 'single' });
    const outcomes = await Promise.all([attempt(client, a.body.token), attempt(second, b.body.token)]);
    assert.deepEqual(outcomes.map((r) => r.status).sort(), [201, 409]);
    const count = await pool.query<{ count: number }>(`SELECT count(*)::int AS count FROM bookings WHERE session_id=$1 AND status='confirmed'`, [fixture.rows[0].id]);
    assert.equal(count.rows[0].count, 1);
    const temporary = `${randomBytes(15).toString('base64url')}A1!`;
    const replacement = `${randomBytes(15).toString('base64url')}B2!`;
    const admin = await pool.query<{ id: string }>(`INSERT INTO app_users (email,full_name,role,password_hash,password_change_required) VALUES ($1,'Admin Smoke','admin',$2,true) RETURNING id`, [`admin-smoke-${randomBytes(6).toString('hex')}@example.test`, await hashPassword(temporary)]);
    let ruleId: string | undefined;
    try {
      const adminClient = supertest.agent(base);
      const adminCsrf = await adminClient.get('/api/v1/auth/csrf').expect(200);
      const emailResult = await pool.query<{ email: string }>('SELECT email FROM app_users WHERE id=$1', [admin.rows[0].id]);
      await adminClient.post('/api/v1/auth/login').set('x-csrf-token', adminCsrf.body.token).send({ email: emailResult.rows[0].email, password: temporary }).expect(200);
      await adminClient.get('/api/v1/admin/policies').expect(403);
      const changedCsrf = await adminClient.get('/api/v1/auth/csrf').expect(200);
      await adminClient.post('/api/v1/auth/change-password').set('x-csrf-token', changedCsrf.body.token).send({ currentPassword: temporary, newPassword: replacement }).expect(201);
      await adminClient.get('/api/v1/admin/policies').expect(200);
      const paymentSettings = await adminClient.get('/api/v1/admin/payment-settings').expect(200);
      assert.equal(paymentSettings.body.configured, true);
      assert.equal('serverKey' in paymentSettings.body, false);
      const cancelledFixture = await adminClient.post(`/api/v1/admin/sessions/${fixture.rows[0].id}/cancel`).set('x-csrf-token', changedCsrf.body.token).expect(201);
      assert.equal(cancelledFixture.body.bookingsCancelled, 1);
      const cancelledFixtureReplay = await adminClient.post(`/api/v1/admin/sessions/${fixture.rows[0].id}/cancel`).set('x-csrf-token', changedCsrf.body.token).expect(201);
      assert.equal(cancelledFixtureReplay.body.bookingsCancelled, 0);
      const accounts = await adminClient.get('/api/v1/admin/accounts').query({ q: secondUser.body.email }).expect(200);
      assert.ok(accounts.body.some((a: { id: string }) => a.id === secondUser.body.id));
      const fixtureData = await pool.query<{ class_type_id: string; coach_id: string; start: string; finish: string; weekday: number }>(`SELECT t.id AS class_type_id,u.id AS coach_id,((now() AT TIME ZONE st.timezone)::date+1)::text AS start,((now() AT TIME ZONE st.timezone)::date+8)::text AS finish,extract(isodow FROM (now() AT TIME ZONE st.timezone)::date+1)::int AS weekday FROM class_types t CROSS JOIN app_users u CROSS JOIN studio st WHERE t.level='beginner' AND u.role='coach' AND st.id=1 LIMIT 1`);
      const f = fixtureData.rows[0];
      const rule = await adminClient.post('/api/v1/admin/schedule-rules').set('x-csrf-token', changedCsrf.body.token).send({ classTypeId: f.class_type_id, coachId: f.coach_id, localStartTime: '16:00', capacity: 3, priceIdr: 0, isoWeekday: f.weekday, startsOn: f.start, endsOn: f.finish }).expect(201);
      ruleId = rule.body.id;
      assert.equal(rule.body.sessionsCreated, 2);
      const created = await pool.query<{ id: string }>('SELECT id FROM class_sessions WHERE schedule_rule_id=$1 ORDER BY local_date LIMIT 1', [ruleId]);
      await adminClient.patch(`/api/v1/admin/sessions/${created.rows[0].id}`).set('x-csrf-token', changedCsrf.body.token).send({ classTypeId: f.class_type_id, coachId: f.coach_id, localDate: f.start, localStartTime: '17:00', capacity: 4, priceIdr: 50000 }).expect(200);
      await adminClient.post(`/api/v1/admin/sessions/${created.rows[0].id}/cancel`).set('x-csrf-token', changedCsrf.body.token).expect(201);
      await adminClient.patch(`/api/v1/admin/sessions/${free.id}`).set('x-csrf-token', changedCsrf.body.token).send({ classTypeId: f.class_type_id, coachId: f.coach_id, localDate: f.start, localStartTime: '17:00', capacity: 4, priceIdr: 50000 }).expect(409);
      const reset = await adminClient.post(`/api/v1/admin/accounts/${secondUser.body.id}/reset-password`).set('x-csrf-token', changedCsrf.body.token).send({ verificationNote: 'Peminta memperlihatkan akses inbox email akun secara langsung' }).expect(201);
      assert.ok(reset.body.temporaryPassword);
      await second.get('/api/v1/me').expect(401);
      const resetCsrf = await second.get('/api/v1/auth/csrf').expect(200);
      await second.post('/api/v1/auth/login').set('x-csrf-token', resetCsrf.body.token).send({ email: secondUser.body.email, password: reset.body.temporaryPassword }).expect(200);
      await second.get('/api/v1/me').expect(403);
      const changeCsrf = await second.get('/api/v1/auth/csrf').expect(200);
      await second.post('/api/v1/auth/change-password').set('x-csrf-token', changeCsrf.body.token).send({ currentPassword: reset.body.temporaryPassword, newPassword: replacement }).expect(201);
      await second.get('/api/v1/me').expect(200);
    } finally {
      if (ruleId) { await pool.query('DELETE FROM class_sessions WHERE schedule_rule_id=$1', [ruleId]); await pool.query('DELETE FROM schedule_rules WHERE id=$1', [ruleId]); }
      await pool.query('DELETE FROM audit_logs WHERE actor_id=$1', [admin.rows[0].id]);
      await pool.query(`DELETE FROM "session" WHERE sess->>'userId'=$1`, [admin.rows[0].id]);
      await pool.query('DELETE FROM app_users WHERE id=$1', [admin.rows[0].id]);
    }
  } finally { await pool.end(); }
  process.stdout.write('Smoke OK: CSRF, reset akun, Snap, webhook valid/palsu, booking, pembatalan pelanggan/perusahaan, kuota, kursi terakhir, jadwal admin.\n');
}

main().catch((error: unknown) => { console.error(error); process.exitCode = 1; });
