import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { ConflictException } from '@nestjs/common';
import { Db } from '../src/shared/db';
import { PaymentSettings } from '../src/payments/payment-settings';
import { PaymentsService } from '../src/payments/payments';
import { CancellationsService } from '../src/booking/cancellations';

async function main() {
  const db = new Db();
  const payments = new PaymentsService(db,new PaymentSettings(db));
  const cancellations = new CancellationsService(db,payments);
  const customers: string[] = [];
  const sessions: string[] = [];
  const bookings: string[] = [];
  const admin = await db.query<{ id: string }>(`SELECT id FROM app_users WHERE role='admin' LIMIT 1`);
  assert.ok(admin.rows[0], 'Seed admin diperlukan');
  try {
    async function customer() {
      const row = await db.query<{ id: string }>(`INSERT INTO app_users (email,full_name,role,password_hash) VALUES ($1,'Pelanggan Pembatalan','customer','fixture-only') RETURNING id`, [`cancel-${randomUUID()}@example.test`]);
      const id = row.rows[0].id;
      customers.push(id);
      await db.query('INSERT INTO wallet_accounts (customer_id) VALUES ($1)', [id]);
      return id;
    }
    async function session(hoursUntilStart: number, priceIdr: number) {
      const row = await db.query<{ id: string }>(`INSERT INTO class_sessions (class_type_id,coach_id,local_date,starts_at,ends_at,capacity,price_idr) SELECT t.id,u.id,((now()+$1::int*interval '1 hour') AT TIME ZONE st.timezone)::date,now()+$1::int*interval '1 hour',now()+($1::int+1)*interval '1 hour',10,$2 FROM class_types t CROSS JOIN app_users u CROSS JOIN studio st WHERE t.level='beginner' AND u.role='coach' AND st.id=1 LIMIT 1 RETURNING id`, [hoursUntilStart,priceIdr]);
      assert.ok(row.rows[0]);
      sessions.push(row.rows[0].id);
      return row.rows[0].id;
    }
    async function booking(customerId: string, sessionId: string, source: 'single' | 'quota', status: 'confirmed' | 'pending_payment', priceIdr: number, walletReservedIdr = 0) {
      const row = await db.query<{ id: string }>(`INSERT INTO bookings (customer_id,session_id,status,source,price_idr,wallet_reserved_idr,gateway_due_idr,hold_expires_at,idempotency_key,confirmed_at) VALUES ($1,$2,$3,$4,$5,$6,$7,CASE WHEN $3='pending_payment' THEN now()+interval '15 minutes' ELSE NULL END,$8,CASE WHEN $3='confirmed' THEN now() ELSE NULL END) RETURNING id`, [customerId,sessionId,status,source,priceIdr,walletReservedIdr,status === 'pending_payment' ? priceIdr-walletReservedIdr : 0,randomUUID()]);
      bookings.push(row.rows[0].id);
      return row.rows[0].id;
    }
    async function balance(customerId: string) {
      const row = await db.query<{ balance_idr: string }>('SELECT balance_idr FROM wallet_accounts WHERE customer_id=$1', [customerId]);
      return Number(row.rows[0].balance_idr);
    }

    const a = await customer();
    const b = await customer();
    const c = await customer();
    const earlySession = await session(48,10000);
    const earlyBooking = await booking(a,earlySession,'single','confirmed',10000);
    const early = await cancellations.cancelCustomer(earlyBooking,a);
    assert.equal(early.creditedBalanceIdr,10000);
    assert.equal(await balance(a),10000);
    const retry = await cancellations.cancelCustomer(earlyBooking,a);
    assert.equal(retry.creditedBalanceIdr,10000);
    assert.equal(await balance(a),10000);
    await assert.rejects(() => cancellations.cancelCustomer(earlyBooking,b), (error: unknown) => error instanceof Error && error.name === 'NotFoundException');

    const lateSession = await session(1,10000);
    const lateBooking = await booking(a,lateSession,'single','confirmed',10000);
    const late = await cancellations.cancelCustomer(lateBooking,a);
    assert.equal(late.creditedBalanceIdr,0);
    assert.equal(await balance(a),10000);
    const lateQuotaBooking = await booking(b,lateSession,'quota','confirmed',10000);
    const lateQuota = await cancellations.cancelCustomer(lateQuotaBooking,b);
    assert.equal(lateQuota.quotaReturned,false);
    const kept = await db.query<{ quota_retained: boolean }>('SELECT quota_retained FROM bookings WHERE id=$1', [lateQuotaBooking]);
    assert.equal(kept.rows[0].quota_retained,true);
    const lateSessionCancelled = await cancellations.cancelSession(lateSession,admin.rows[0].id);
    assert.equal(lateSessionCancelled.bookingsCancelled,0);
    assert.equal(lateSessionCancelled.previousCancellationsRestored,2);
    assert.equal(lateSessionCancelled.quotaReturned,1);
    assert.equal(lateSessionCancelled.creditedBalanceIdr,10000);
    assert.equal(await balance(a),20000);
    const restoredQuota = await db.query<{ quota_retained: boolean }>('SELECT quota_retained FROM bookings WHERE id=$1', [lateQuotaBooking]);
    assert.equal(restoredQuota.rows[0].quota_retained,false);

    const pendingSession = await session(48,10000);
    await db.transaction((client) => payments.walletEntry(client,c,null,4000,'correction',`fixture:${randomUUID()}:seed`));
    const pendingBooking = await booking(c,pendingSession,'single','pending_payment',10000,4000);
    await db.transaction((client) => payments.walletEntry(client,c,pendingBooking,-4000,'class_purchase',`booking:${pendingBooking}:initial-debit`));
    const orderId = `TST-${randomUUID()}`;
    await db.query(`INSERT INTO payment_transactions (booking_id,order_id,gross_amount_idr,status) VALUES ($1,$2,6000,'pending')`, [pendingBooking,orderId]);
    const pendingCancel = await cancellations.cancelCustomer(pendingBooking,c);
    assert.equal(pendingCancel.creditedBalanceIdr,4000);
    assert.equal(await balance(c),4000);
    const settled = { transaction_status: 'settlement', status_code: '200', fraud_status: 'accept' };
    const afterPayment = await payments.applyTrustedStatus(orderId,settled);
    assert.equal(afterPayment.bookingStatus,'cancelled');
    await payments.applyTrustedStatus(orderId,settled);
    assert.equal(await balance(c),10000);

    const companySession = await session(1,20000);
    const companyPaid = await booking(a,companySession,'single','confirmed',20000);
    const companyQuota = await booking(b,companySession,'quota','confirmed',20000);
    const companyPending = await booking(c,companySession,'single','pending_payment',20000,4000);
    await db.transaction((client) => payments.walletEntry(client,c,companyPending,-4000,'class_purchase',`booking:${companyPending}:initial-debit`));
    const companyOrderId = `TST-${randomUUID()}`;
    await db.query(`INSERT INTO payment_transactions (booking_id,order_id,gross_amount_idr,status) VALUES ($1,$2,16000,'pending')`, [companyPending,companyOrderId]);
    const company = await cancellations.cancelSession(companySession,admin.rows[0].id);
    assert.equal(company.bookingsCancelled,3);
    assert.equal(company.creditedBalanceIdr,24000);
    assert.equal(company.quotaReturned,1);
    assert.equal(await balance(a),40000);
    assert.equal(await balance(c),10000);
    const expiredAfterCancel = await payments.applyTrustedStatus(companyOrderId,{ transaction_status: 'expire', status_code: '202' });
    assert.equal(expiredAfterCancel.bookingStatus,'cancelled');
    assert.equal(await balance(c),10000);
    const repeatedCompany = await cancellations.cancelSession(companySession,admin.rows[0].id);
    assert.equal(repeatedCompany.creditedBalanceIdr,0);
    assert.equal(await balance(a),40000);
    const companyRows = await db.query<{ status: string; cancellation_origin: string }>('SELECT status,cancellation_origin FROM bookings WHERE id=ANY($1::uuid[])', [[companyPaid,companyQuota,companyPending]]);
    assert.ok(companyRows.rows.every((row) => row.status === 'cancelled' && row.cancellation_origin === 'studio'));

    const pastSession = await session(-2,0);
    const pastBooking = await booking(a,pastSession,'single','confirmed',0);
    await assert.rejects(() => cancellations.cancelCustomer(pastBooking,a), ConflictException);
    process.stdout.write('Cancellation OK: tepat waktu/terlambat, jatah, saldo, pending, pembayaran terlambat, pembatalan perusahaan, dan retry.\n');
  } finally {
    await db.query(`DELETE FROM audit_logs WHERE action='cancel_session' AND reason=ANY($1::text[])`, [sessions]);
    await db.query('DELETE FROM wallet_entries WHERE customer_id=ANY($1::uuid[])', [customers]);
    await db.query('DELETE FROM payment_transactions WHERE booking_id=ANY($1::uuid[])', [bookings]);
    await db.query('DELETE FROM bookings WHERE id=ANY($1::uuid[])', [bookings]);
    await db.query('DELETE FROM class_sessions WHERE id=ANY($1::uuid[])', [sessions]);
    await db.query('DELETE FROM wallet_accounts WHERE customer_id=ANY($1::uuid[])', [customers]);
    await db.query('DELETE FROM app_users WHERE id=ANY($1::uuid[])', [customers]);
    await db.onModuleDestroy();
  }
}

main().catch((error: unknown) => { console.error(error); process.exitCode = 1; });
