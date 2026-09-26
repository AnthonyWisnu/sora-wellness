import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { Db } from '../src/shared/db';
import { PaymentSettings } from '../src/payments/payment-settings';
import { PaymentsService } from '../src/payments/payments';

async function main() {
  const db = new Db();
  const payments = new PaymentsService(db, new PaymentSettings(db));
  const customerIds: string[] = [];
  const sessionIds: string[] = [];
  const bookingIds: string[] = [];
  try {
    const first = await db.query<{ id: string }>(`INSERT INTO app_users (email,full_name,role,password_hash) VALUES ($1,'Pelanggan Status','customer','fixture-only') RETURNING id`, [`payment-smoke-${randomUUID()}@example.test`]);
    const second = await db.query<{ id: string }>(`INSERT INTO app_users (email,full_name,role,password_hash) VALUES ($1,'Pengisi Kursi','customer','fixture-only') RETURNING id`, [`payment-smoke-${randomUUID()}@example.test`]);
    customerIds.push(first.rows[0].id,second.rows[0].id);
    for (const id of customerIds) await db.query('INSERT INTO wallet_accounts (customer_id) VALUES ($1)', [id]);
    await db.transaction((client) => payments.walletEntry(client,first.rows[0].id,null,5000,'correction',`fixture:${randomUUID()}:seed`));

    async function session() {
      const created = await db.query<{ id: string }>(`INSERT INTO class_sessions (class_type_id,coach_id,local_date,starts_at,ends_at,capacity,price_idr) SELECT t.id,u.id,x.d,(x.d+time '15:00') AT TIME ZONE st.timezone,((x.d+time '15:00') AT TIME ZONE st.timezone)+interval '1 hour',1,10000 FROM class_types t CROSS JOIN app_users u CROSS JOIN studio st CROSS JOIN LATERAL (SELECT (now() AT TIME ZONE st.timezone)::date+1 AS d) x WHERE t.level='beginner' AND u.role='coach' AND st.id=1 LIMIT 1 RETURNING id`);
      sessionIds.push(created.rows[0].id);
      return created.rows[0].id;
    }
    async function pending(sessionId: string) {
      const booking = await db.query<{ id: string }>(`INSERT INTO bookings (customer_id,session_id,status,source,price_idr,wallet_reserved_idr,gateway_due_idr,hold_expires_at,idempotency_key) VALUES ($1,$2,'pending_payment','single',10000,4000,6000,now()-interval '1 minute',$3) RETURNING id`, [first.rows[0].id,sessionId,randomUUID()]);
      bookingIds.push(booking.rows[0].id);
      await db.transaction((client) => payments.walletEntry(client,first.rows[0].id,booking.rows[0].id,-4000,'class_purchase',`booking:${booking.rows[0].id}:initial-debit`));
      const orderId = `TST-${randomUUID()}`;
      await db.query(`INSERT INTO payment_transactions (booking_id,order_id,gross_amount_idr,status) VALUES ($1,$2,6000,'pending')`, [booking.rows[0].id,orderId]);
      return { bookingId: booking.rows[0].id, orderId };
    }
    const fullSession = await session();
    const lateFull = await pending(fullSession);
    const seat = await db.query<{ id: string }>(`INSERT INTO bookings (customer_id,session_id,status,source,price_idr,idempotency_key,confirmed_at) VALUES ($1,$2,'confirmed','single',10000,$3,now()) RETURNING id`, [second.rows[0].id,fullSession,randomUUID()]);
    bookingIds.push(seat.rows[0].id);
    const settled = { transaction_status: 'settlement', status_code: '200', fraud_status: 'accept' };
    const credited = await payments.applyTrustedStatus(lateFull.orderId, settled);
    assert.equal(credited.bookingStatus, 'expired');
    assert.equal(credited.creditedBalanceIdr, 6000);
    await payments.applyTrustedStatus(lateFull.orderId, settled);
    const balanceAfterCredit = await db.query<{ balance_idr: string }>('SELECT balance_idr FROM wallet_accounts WHERE customer_id=$1', [first.rows[0].id]);
    assert.equal(Number(balanceAfterCredit.rows[0].balance_idr), 11000);
    const creditCount = await db.query<{ count: number }>(`SELECT count(*)::int AS count FROM wallet_entries WHERE booking_id=$1 AND kind='late_payment'`, [lateFull.bookingId]);
    assert.equal(creditCount.rows[0].count, 1);

    const availableSession = await session();
    const lateAvailable = await pending(availableSession);
    const confirmed = await payments.applyTrustedStatus(lateAvailable.orderId, settled);
    assert.equal(confirmed.bookingStatus, 'confirmed');
    assert.equal(confirmed.creditedBalanceIdr, 0);
    const balanceAfterRebooking = await db.query<{ balance_idr: string }>('SELECT balance_idr FROM wallet_accounts WHERE customer_id=$1', [first.rows[0].id]);
    assert.equal(Number(balanceAfterRebooking.rows[0].balance_idr), 7000);
    const confirmedBooking = await db.query<{ status: string }>('SELECT status FROM bookings WHERE id=$1', [lateAvailable.bookingId]);
    assert.equal(confirmedBooking.rows[0].status, 'confirmed');

    const failedSession = await session();
    const failedBooking = await pending(failedSession);
    const failed = await payments.applyTrustedStatus(failedBooking.orderId, { transaction_status: 'expire', status_code: '202' });
    assert.equal(failed.paymentStatus, 'expired');
    const balanceAfterFailure = await db.query<{ balance_idr: string }>('SELECT balance_idr FROM wallet_accounts WHERE customer_id=$1', [first.rows[0].id]);
    assert.equal(Number(balanceAfterFailure.rows[0].balance_idr), 7000);

    const lowBalanceSession = await session();
    const lowBalance = await pending(lowBalanceSession);
    await payments.expireBooking(lowBalance.bookingId);
    await db.transaction((client) => payments.walletEntry(client,first.rows[0].id,null,-5000,'correction',`fixture:${randomUUID()}:other-use`));
    const fallback = await payments.applyTrustedStatus(lowBalance.orderId, settled);
    assert.equal(fallback.bookingStatus, 'expired');
    assert.equal(fallback.creditedBalanceIdr, 6000);
    const finalBalance = await db.query<{ balance_idr: string }>('SELECT balance_idr FROM wallet_accounts WHERE customer_id=$1', [first.rows[0].id]);
    assert.equal(Number(finalBalance.rows[0].balance_idr), 8000);
    process.stdout.write('Payment state OK: terlambat, duplikat, kedaluwarsa, dan saldo gabungan yang berubah diuji.\n');
  } finally {
    await db.query('DELETE FROM wallet_entries WHERE customer_id=ANY($1::uuid[])', [customerIds]);
    await db.query('DELETE FROM payment_transactions WHERE booking_id=ANY($1::uuid[])', [bookingIds]);
    await db.query('DELETE FROM bookings WHERE id=ANY($1::uuid[])', [bookingIds]);
    await db.query('DELETE FROM class_sessions WHERE id=ANY($1::uuid[])', [sessionIds]);
    await db.query('DELETE FROM wallet_accounts WHERE customer_id=ANY($1::uuid[])', [customerIds]);
    await db.query('DELETE FROM app_users WHERE id=ANY($1::uuid[])', [customerIds]);
    await db.onModuleDestroy();
  }
}

main().catch((error: unknown) => { console.error(error); process.exitCode = 1; });
