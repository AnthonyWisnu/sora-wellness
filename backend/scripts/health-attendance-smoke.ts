import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import supertest from 'supertest';
import { Pool } from 'pg';
import { hashPassword } from '../src/shared/security';

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const base = process.env.API_BASE_URL ?? 'http://127.0.0.1:3000';
  const password = 'SmokeKesehatan123!';
  const email = `health-${randomUUID()}@example.test`;
  const ids: string[] = [];
  const sessions: string[] = [];
  let customerId: string | undefined;
  try {
    const customer = supertest.agent(base);
    const registerToken = (await customer.get('/api/v1/auth/csrf').expect(200)).body.token as string;
    const registered = await customer.post('/api/v1/auth/register').set('x-csrf-token',registerToken).send({ email,fullName: 'Pelanggan Sehat',password }).expect(201);
    customerId = registered.body.id;
    ids.push(customerId!);
    const customerToken = (await customer.get('/api/v1/auth/csrf').expect(200)).body.token as string;
    await customer.put('/api/v1/me/health').set('x-csrf-token',customerToken).send({ note: 'Riwayat patah tulang',consent: false }).expect(400);
    await customer.put('/api/v1/me/health').set('x-csrf-token',customerToken).send({ note: 'Riwayat patah tulang',consent: true }).expect(200);
    assert.equal((await customer.get('/api/v1/me/health').expect(200)).body.note,'Riwayat patah tulang');
    await pool.query("UPDATE health_profile_revisions SET recorded_at=now()-interval '2 hours' WHERE customer_id=$1", [customerId]);

    async function staff(role: 'coach' | 'admin') {
      const created = await pool.query<{ id: string; email: string }>(`INSERT INTO app_users (email,full_name,role,password_hash) VALUES ($1,$2,$3,$4) RETURNING id,email`, [`${role}-${randomUUID()}@example.test`,role==='coach' ? 'Pelatih Uji' : 'Admin Uji',role,await hashPassword(password)]);
      ids.push(created.rows[0].id);
      const agent = supertest.agent(base);
      const csrf = (await agent.get('/api/v1/auth/csrf').expect(200)).body.token as string;
      await agent.post('/api/v1/auth/login').set('x-csrf-token',csrf).send({ email: created.rows[0].email,password }).expect(200);
      return { id: created.rows[0].id, agent, token: (await agent.get('/api/v1/auth/csrf').expect(200)).body.token as string };
    }
    const coach = await staff('coach');
    const otherCoach = await staff('coach');
    const admin = await staff('admin');
    const classType = await pool.query<{ id: string }>("SELECT id FROM class_types WHERE level='beginner' LIMIT 1");
    assert.ok(classType.rows[0]);
    async function session(coachId: string, startOffset: string, endOffset: string) {
      const made = await pool.query<{ id: string }>(`INSERT INTO class_sessions (class_type_id,coach_id,local_date,starts_at,ends_at,capacity,price_idr) SELECT $1,$2,((now()+$3::interval) AT TIME ZONE st.timezone)::date,now()+$3::interval,now()+$4::interval,5,0 FROM studio st WHERE st.id=1 RETURNING id`, [classType.rows[0].id,coachId,startOffset,endOffset]);
      sessions.push(made.rows[0].id);
      return made.rows[0].id;
    }
    const historical = await session(coach.id,'-1 hour','-30 minutes');
    const future = await session(coach.id,'1 hour','2 hours');
    const tooOld = await session(coach.id,'-27 hours','-26 hours');
    const expiredHistory = await session(coach.id,'-370 days','-369 days 23 hours');
    const localDate = (await pool.query<{ local_date: string }>('SELECT local_date::text FROM class_sessions WHERE id=$1', [historical])).rows[0].local_date;
    assert.ok((await coach.agent.get('/api/v1/coach/sessions').query({ date: localDate }).expect(200)).body.some((row: { id: string }) => row.id === historical));
    assert.ok((await admin.agent.get('/api/v1/admin/sessions').query({ date: localDate }).expect(200)).body.some((row: { id: string }) => row.id === historical));
    for (const sessionId of [historical,future,tooOld,expiredHistory]) await pool.query(`INSERT INTO bookings (customer_id,session_id,status,source,price_idr,idempotency_key,confirmed_at) VALUES ($1,$2,'confirmed','free',0,$3,now())`, [customerId,sessionId,randomUUID()]);
    await pool.query(`INSERT INTO health_snapshots (booking_id,customer_id,note,delete_after) SELECT id,$1,'Catatan yang harus kedaluwarsa',now()-interval '1 minute' FROM bookings WHERE session_id=$2 AND customer_id=$1`, [customerId,expiredHistory]);
    await otherCoach.agent.get(`/api/v1/coach/sessions/${historical}/participants`).expect(404);
    assert.equal((await otherCoach.agent.get('/api/v1/coach/sessions').expect(200)).body.length,0);
    await admin.agent.get(`/api/v1/coach/sessions/${historical}/participants`).expect(403);
    await admin.agent.get('/api/v1/me/health').expect(403);
    await customer.get(`/api/v1/coach/sessions/${historical}/participants`).expect(403);
    const first = await coach.agent.get(`/api/v1/coach/sessions/${historical}/participants`).expect(200);
    assert.equal(first.body.participants[0].healthNote,'Riwayat patah tulang');
    assert.equal(first.body.participants[0].healthSource,'snapshot');
    assert.equal((await coach.agent.get(`/api/v1/coach/sessions/${expiredHistory}/participants`).expect(200)).body.participants[0].healthNote,null);
    const adminParticipants = await admin.agent.get(`/api/v1/admin/sessions/${historical}/participants`).expect(200);
    assert.equal(adminParticipants.body[0].fullName,'Pelanggan Sehat');
    assert.equal('healthNote' in adminParticipants.body[0],false);
    assert.equal('email' in adminParticipants.body[0],false);
    await customer.put('/api/v1/me/health').set('x-csrf-token',customerToken).send({ note: 'Kondisi terbaru',consent: true }).expect(200);
    const past = await coach.agent.get(`/api/v1/coach/sessions/${historical}/participants`).expect(200);
    assert.equal(past.body.participants[0].healthNote,'Riwayat patah tulang');
    const upcoming = await coach.agent.get(`/api/v1/coach/sessions/${future}/participants`).expect(200);
    assert.equal(upcoming.body.participants[0].healthNote,'Kondisi terbaru');
    await coach.agent.put(`/api/v1/coach/sessions/${future}/attendance/${customerId}`).set('x-csrf-token',coach.token).send({ present: true }).expect(409);
    await coach.agent.put(`/api/v1/coach/sessions/${historical}/attendance/${customerId}`).set('x-csrf-token',coach.token).send({ present: true }).expect(200);
    await otherCoach.agent.put(`/api/v1/coach/sessions/${historical}/attendance/${customerId}`).set('x-csrf-token',otherCoach.token).send({ present: false }).expect(404);
    await coach.agent.put(`/api/v1/coach/sessions/${tooOld}/attendance/${customerId}`).set('x-csrf-token',coach.token).send({ present: false }).expect(409);
    await admin.agent.put(`/api/v1/admin/sessions/${tooOld}/attendance/${customerId}`).set('x-csrf-token',admin.token).send({ present: false,reason: 'Koreksi daftar hadir manual' }).expect(200);
    const corrections = await admin.agent.get(`/api/v1/admin/sessions/${tooOld}/attendance-corrections`).expect(200);
    assert.equal(corrections.body.length,1);
    assert.equal(corrections.body[0].adminName,'Admin Uji');
    await customer.delete('/api/v1/me/health').set('x-csrf-token',customerToken).expect(200);
    assert.equal((await customer.get('/api/v1/me/health').expect(200)).body.note,null);
    assert.equal((await coach.agent.get(`/api/v1/coach/sessions/${historical}/participants`).expect(200)).body.participants[0].healthNote,null);
    assert.equal((await pool.query<{ count: number }>('SELECT count(*)::int AS count FROM health_profile_revisions WHERE customer_id=$1', [customerId])).rows[0].count,0);
    await pool.query("UPDATE bookings SET status='cancelled',cancelled_at=now(),cancellation_origin='customer' WHERE customer_id=$1 AND session_id=$2", [customerId,future]);
    assert.equal((await coach.agent.get(`/api/v1/coach/sessions/${future}/participants`).expect(200)).body.participants.length,0);
    process.stdout.write('Health/attendance OK: consent, akses pelatih, snapshot historis, penghapusan, absensi 24 jam, dan audit admin.\n');
  } finally {
    await pool.query('DELETE FROM attendance_corrections WHERE session_id=ANY($1::uuid[])', [sessions]);
    await pool.query('DELETE FROM attendance WHERE session_id=ANY($1::uuid[])', [sessions]);
    await pool.query('DELETE FROM health_snapshots WHERE customer_id=$1', [customerId ?? null]);
    await pool.query('DELETE FROM health_profile_revisions WHERE customer_id=$1', [customerId ?? null]);
    await pool.query('DELETE FROM health_profiles WHERE customer_id=$1', [customerId ?? null]);
    await pool.query('DELETE FROM bookings WHERE session_id=ANY($1::uuid[])', [sessions]);
    await pool.query('DELETE FROM class_sessions WHERE id=ANY($1::uuid[])', [sessions]);
    await pool.query('DELETE FROM wallet_accounts WHERE customer_id=$1', [customerId ?? null]);
    await pool.query(`DELETE FROM "session" WHERE sess->>'userId'=ANY($1::text[])`, [ids]);
    await pool.query('DELETE FROM app_users WHERE id=ANY($1::uuid[])', [ids]);
    await pool.end();
  }
}

main().catch((error: unknown) => { console.error(error); process.exitCode = 1; });
