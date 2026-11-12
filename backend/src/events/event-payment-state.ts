import { NotFoundException } from '@nestjs/common';
import { PoolClient } from 'pg';
import { Db } from '../shared/db';
import { MidtransStatus } from '../payments/midtrans';

export type WalletWriter = (client: PoolClient, customerId: string, bookingId: string | null, amount: number, kind: string, reference: string) => Promise<void>;
export const EVENT_CHECKOUT_MINUTES = 15;

export async function expireEventHolds(db: Db, customerId?: string) {
  await db.query(`UPDATE event_registrations SET status='expired' WHERE status='pending_payment'
    AND hold_expires_at<=now() AND ($1::uuid IS NULL OR customer_id=$1)`, [customerId ?? null]);
  await db.query(`UPDATE payment_transactions p SET status='expired',updated_at=now()
    FROM event_registrations r WHERE p.event_registration_id=r.id AND r.status='expired' AND p.status='pending'
    AND ($1::uuid IS NULL OR r.customer_id=$1)`, [customerId ?? null]);
}

export async function applyEventStatus(db: Db, orderId: string, status: MidtransStatus, walletEntry: WalletWriter) {
  return db.transaction(async client => {
    const probe = await client.query<{ customer_id: string; event_id: string; activity_id: string; guest_email: string }>(`
      SELECT r.customer_id,r.event_id,r.activity_id,r.guest_email FROM event_registrations r
      JOIN payment_transactions p ON p.event_registration_id=r.id WHERE p.order_id=$1`, [orderId]);
    if (!probe.rows[0]) throw new NotFoundException('Pembayaran event tidak ditemukan');
    const identity = probe.rows[0];
    const event = await client.query<{ status: string; timezone: string }>(`
      SELECT e.status,s.timezone FROM community_events e CROSS JOIN studio s
      WHERE e.id=$1 AND s.id=1 FOR SHARE OF e`, [identity.event_id]);
    await client.query('SELECT id FROM app_users WHERE id=$1 FOR NO KEY UPDATE', [identity.customer_id]);
    const activity = await client.query<{ capacity: number; local_date: string | null; start_time: string }>(
      'SELECT capacity,local_date::text,start_time FROM event_activities WHERE id=$1 FOR UPDATE', [identity.activity_id]);
    const found = await client.query<{ id: string; status: string; hold_expires_at: Date | null; payment_id: string; payment_status: string; amount: number }>(`
      SELECT r.id,r.status,r.hold_expires_at,p.id AS payment_id,p.status AS payment_status,p.gross_amount_idr AS amount
      FROM event_registrations r JOIN payment_transactions p ON p.event_registration_id=r.id
      WHERE p.order_id=$1 FOR UPDATE OF r,p`, [orderId]);
    const row = found.rows[0];
    if (row.payment_status === 'success') return { paymentStatus: 'success', eventStatus: row.status, creditedBalanceIdr: row.status === 'credited' ? row.amount : 0 };
    const providerStatus = status.transaction_status ?? 'unknown';
    const success = status.status_code === '200' && ['settlement','capture'].includes(providerStatus) && (!status.fraud_status || status.fraud_status.toLowerCase() === 'accept');
    const failed = ['deny','cancel','expire','failure'].includes(providerStatus) || status.fraud_status?.toLowerCase() === 'deny';
    if (success) {
      const a = activity.rows[0];
      let eligible = false;
      if (a?.local_date && event.rows[0]?.status === 'published' && ['pending_payment','expired'].includes(row.status)) {
        const time = await client.query<{ open: boolean }>(`SELECT (($1::date+$2::time) AT TIME ZONE $3)-($4::int*interval '1 minute')>now() AS open`, [a.local_date,a.start_time,event.rows[0].timezone,EVENT_CHECKOUT_MINUTES]);
        const seats = await client.query<{ count: number; duplicate: boolean }>(`SELECT count(*)::int AS count,
          COALESCE(bool_or(customer_id=$3 OR guest_email=$4),false) AS duplicate FROM event_registrations WHERE activity_id=$1 AND id<>$2
          AND (status IN ('registered','attended') OR status='pending_payment' AND hold_expires_at>now())`, [identity.activity_id,row.id,identity.customer_id,identity.guest_email]);
        eligible = (Boolean(row.hold_expires_at && row.hold_expires_at.getTime()>Date.now()) || time.rows[0].open) && seats.rows[0].count<a.capacity && !seats.rows[0].duplicate;
      }
      if (!eligible) await walletEntry(client,identity.customer_id,null,row.amount,'late_payment',`event:${row.id}:late-credit`);
      const next = eligible ? 'registered' : 'credited';
      await client.query('UPDATE event_registrations SET status=$1 WHERE id=$2', [next,row.id]);
      await client.query(`UPDATE payment_transactions SET status='success',provider_status=$1,processed_at=now(),updated_at=now() WHERE id=$2`, [providerStatus,row.payment_id]);
      return { paymentStatus: 'success', eventStatus: next, creditedBalanceIdr: eligible ? 0 : row.amount };
    }
    if (failed) {
      const next = providerStatus === 'expire' ? 'expired' : 'failed';
      await client.query('UPDATE event_registrations SET status=$1 WHERE id=$2', [next,row.id]);
      await client.query('UPDATE payment_transactions SET status=$1,provider_status=$2,updated_at=now() WHERE id=$3', [next,providerStatus,row.payment_id]);
      return { paymentStatus: next, eventStatus: next };
    }
    await client.query('UPDATE payment_transactions SET provider_status=$1,updated_at=now() WHERE id=$2', [providerStatus,row.payment_id]);
    return { paymentStatus: row.payment_status, eventStatus: row.status, providerStatus };
  });
}

export async function refundCancelledEvent(client: PoolClient, eventId: string, walletEntry: WalletWriter) {
  // Caller holds the event row. Acquire customer locks before registration locks,
  // matching checkout and settlement and permitting FK KEY SHARE checks.
  await client.query(`SELECT id FROM app_users WHERE id IN (SELECT customer_id FROM event_registrations WHERE event_id=$1)
    ORDER BY id FOR NO KEY UPDATE`, [eventId]);
  const paid = await client.query<{ id: string; customer_id: string; amount: number }>(`SELECT r.id,r.customer_id,p.gross_amount_idr AS amount
    FROM event_registrations r JOIN payment_transactions p ON p.event_registration_id=r.id
    WHERE r.event_id=$1 AND r.status IN ('registered','attended') AND p.status='success' ORDER BY r.customer_id,r.id FOR UPDATE OF r,p`, [eventId]);
  for (const row of paid.rows) {
    await walletEntry(client,row.customer_id,null,row.amount,'class_refund',`event:${row.id}:studio-cancel-credit`);
    await client.query("UPDATE event_registrations SET status='credited' WHERE id=$1", [row.id]);
  }
  await client.query("UPDATE event_registrations SET status='cancelled' WHERE event_id=$1 AND status IN ('registered','pending_payment')", [eventId]);
  await client.query(`UPDATE payment_transactions p SET status='expired',updated_at=now() FROM event_registrations r
    WHERE p.event_registration_id=r.id AND r.event_id=$1 AND r.status='cancelled' AND p.status='pending'`, [eventId]);
}
