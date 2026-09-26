import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import supertest from 'supertest';
import { Pool } from 'pg';
import { hashPassword } from '../src/shared/security';

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const base = process.env.API_BASE_URL ?? 'http://127.0.0.1:3000';
  const password = 'SmokeFinanceAdmin123!';
  const users: string[] = [];
  const sessions: string[] = [];
  const bookings: string[] = [];
  const payments: string[] = [];
  let purchaseId: string | undefined;
  try {
    async function actor(role: 'admin' | 'coach' | 'customer', name: string) {
      const email = `${role}-${randomUUID()}@example.test`;
      const id = (await pool.query<{ id: string }>('INSERT INTO app_users (email,full_name,role,password_hash) VALUES ($1,$2,$3,$4) RETURNING id', [email,name,role,await hashPassword(password)])).rows[0].id;
      users.push(id);
      if (role === 'customer') await pool.query('INSERT INTO wallet_accounts (customer_id) VALUES ($1)', [id]);
      const agent = supertest.agent(base);
      const csrf = (await agent.get('/api/v1/auth/csrf').expect(200)).body.token as string;
      await agent.post('/api/v1/auth/login').set('x-csrf-token',csrf).send({ email,password }).expect(200);
      return { id,email,agent };
    }
    const admin = await actor('admin','Admin Laporan');
    const coach = await actor('coach','Pelatih Laporan');
    const ayu = await actor('customer','Ayu Laporan');
    const bima = await actor('customer','Bima Laporan');
    const today = (await pool.query<{ day: string }>("SELECT (now() AT TIME ZONE timezone)::date::text AS day FROM studio WHERE id=1")).rows[0].day;
    const type = (await pool.query<{ id: string }>("SELECT id FROM class_types WHERE level='beginner' LIMIT 1")).rows[0].id;
    const option = (await pool.query<{ id: string }>('SELECT id FROM package_options LIMIT 1')).rows[0].id;
    for (const hour of [9,11]) {
      const id = (await pool.query<{ id: string }>(`INSERT INTO class_sessions (class_type_id,coach_id,local_date,starts_at,ends_at,capacity,price_idr)
        SELECT $1,$2,$3::date,($3::date+make_interval(hours=>$4)) AT TIME ZONE timezone,
        (($3::date+make_interval(hours=>$4)) AT TIME ZONE timezone)+interval '1 hour',10,75000 FROM studio WHERE id=1 RETURNING id`, [type,coach.id,today,hour])).rows[0].id;
      sessions.push(id);
    }
    const paidBooking = (await pool.query<{ id: string }>(`INSERT INTO bookings (customer_id,session_id,status,source,price_idr,idempotency_key,confirmed_at)
      VALUES ($1,$2,'confirmed','single',75000,$3,now()) RETURNING id`, [ayu.id,sessions[0],randomUUID()])).rows[0].id;
    bookings.push(paidBooking);
    const cancelledBooking = (await pool.query<{ id: string }>(`INSERT INTO bookings (customer_id,session_id,status,source,price_idr,idempotency_key,cancelled_at,cancellation_origin)
      VALUES ($1,$2,'cancelled','quota',75000,$3,now(),'customer') RETURNING id`, [bima.id,sessions[1],randomUUID()])).rows[0].id;
    bookings.push(cancelledBooking);
    purchaseId = (await pool.query<{ id: string }>(`INSERT INTO package_purchases (customer_id,package_option_id,amount_idr,status,paid_at) VALUES ($1,$2,450000,'paid',now()) RETURNING id`, [ayu.id,option])).rows[0].id;
    for (const [bookingId,packagePurchaseId,amount] of [[paidBooking,null,75000],[null,purchaseId,450000]] as const) {
      const id = (await pool.query<{ id: string }>(`INSERT INTO payment_transactions (booking_id,package_purchase_id,order_id,gross_amount_idr,status,provider_status,snap_token,redirect_url)
        VALUES ($1,$2,$3,$4,'success','settlement','private-token','https://sandbox.example/private') RETURNING id`, [bookingId,packagePurchaseId,`finance-${randomUUID()}`,amount])).rows[0].id;
      payments.push(id);
    }
    await pool.query('UPDATE wallet_accounts SET balance_idr=150000 WHERE customer_id=$1', [ayu.id]);
    await pool.query(`INSERT INTO wallet_entries (customer_id,booking_id,amount_idr,balance_after_idr,kind,reference) VALUES
      ($1,$2,200000,200000,'class_refund',$3),($1,$2,-50000,150000,'class_purchase',$4)`, [ayu.id,paidBooking,`finance-${randomUUID()}`,`finance-${randomUUID()}`]);
    await pool.query("INSERT INTO health_profiles (customer_id,note,consented_at) VALUES ($1,'RAHASIA KESEHATAN',now())", [ayu.id]);

    for (const path of ['/api/v1/admin/bookings','/api/v1/admin/payments','/api/v1/admin/wallets',`/api/v1/admin/wallets/${ayu.id}/entries`]) {
      await coach.agent.get(path).expect(403);
      await ayu.agent.get(path).expect(403);
    }
    const bookingList = await admin.agent.get('/api/v1/admin/bookings').query({ q: 'Ayu Laporan',status: 'confirmed',from: today,to: today }).expect(200);
    assert.equal(bookingList.body.total,1);
    assert.equal(bookingList.body.items[0].id,paidBooking);
    assert.equal(bookingList.body.items[0].customerEmail,ayu.email);
    assert.equal(bookingList.body.items[0].priceIdr,75000);
    assert.equal(bookingList.body.items[0].paymentStatus,'success');
    assert.equal((await admin.agent.get('/api/v1/admin/bookings').query({ page: 2,limit: 1 }).expect(200)).body.items.length,1);
    await admin.agent.get('/api/v1/admin/bookings').query({ status: 'invalid' }).expect(400);
    await admin.agent.get('/api/v1/admin/bookings').query({ from: '2026-10-01T00:00:00Z' }).expect(400);
    await admin.agent.get('/api/v1/admin/bookings').query({ from: '2026-10-02',to: '2026-10-01' }).expect(400);

    const classPayment = await admin.agent.get('/api/v1/admin/payments').query({ kind: 'class',status: 'success',q: ayu.email,from: today,to: today }).expect(200);
    assert.equal(classPayment.body.total,1);
    assert.equal(classPayment.body.items[0].bookingId,paidBooking);
    assert.equal(classPayment.body.items[0].grossAmountIdr,75000);
    const packagePayment = await admin.agent.get('/api/v1/admin/payments').query({ kind: 'package' }).expect(200);
    assert.ok(packagePayment.body.items.some((row: { packagePurchaseId: string }) => row.packagePurchaseId===purchaseId));
    for (const list of [bookingList.body,classPayment.body,packagePayment.body]) {
      const serial = JSON.stringify(list);
      for (const secret of ['private-token','sandbox.example/private','RAHASIA KESEHATAN','serverKey']) assert.ok(!serial.includes(secret));
    }
    const wallets = await admin.agent.get('/api/v1/admin/wallets').query({ q: ayu.email }).expect(200);
    assert.equal(wallets.body.total,1);
    assert.equal(wallets.body.items[0].balanceIdr,150000);
    assert.equal(typeof wallets.body.items[0].balanceIdr,'number');
    const ledger = await admin.agent.get(`/api/v1/admin/wallets/${ayu.id}/entries`).expect(200);
    assert.equal(ledger.body.total,2);
    assert.equal(ledger.body.customer.balanceIdr,150000);
    assert.deepEqual(ledger.body.items.map((row: { amountIdr: number }) => row.amountIdr),[-50000,200000]);
    assert.equal((await admin.agent.get(`/api/v1/admin/wallets/${ayu.id}/entries`).query({ kind: 'class_refund' }).expect(200)).body.total,1);
    assert.equal((await admin.agent.get(`/api/v1/admin/wallets/${bima.id}/entries`).expect(200)).body.total,0);
    await admin.agent.get(`/api/v1/admin/wallets/${randomUUID()}/entries`).expect(404);
    process.stdout.write('Admin finance OK: filter, pagination, booking, pembayaran, saldo, buku transaksi, hak akses, dan batas data.\n');
  } finally {
    await pool.query('DELETE FROM health_profiles WHERE customer_id=ANY($1::uuid[])', [users]);
    await pool.query('DELETE FROM wallet_entries WHERE customer_id=ANY($1::uuid[])', [users]);
    await pool.query('DELETE FROM payment_transactions WHERE id=ANY($1::uuid[])', [payments]);
    if (purchaseId) await pool.query('DELETE FROM package_purchases WHERE id=$1', [purchaseId]);
    await pool.query('DELETE FROM bookings WHERE id=ANY($1::uuid[])', [bookings]);
    await pool.query('DELETE FROM class_sessions WHERE id=ANY($1::uuid[])', [sessions]);
    await pool.query('DELETE FROM wallet_accounts WHERE customer_id=ANY($1::uuid[])', [users]);
    await pool.query(`DELETE FROM "session" WHERE sess->>'userId'=ANY($1::text[])`, [users]);
    await pool.query('DELETE FROM app_users WHERE id=ANY($1::uuid[])', [users]);
    await pool.end();
  }
}

main().catch((error: unknown) => { console.error(error); process.exitCode = 1; });
