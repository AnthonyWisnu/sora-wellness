import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PoolClient } from 'pg';
import { Db } from '../shared/db';
import { PaymentsService } from '../payments/payments';

type Booking = {
  id: string;
  customer_id: string;
  session_id: string;
  status: string;
  source: string;
  price_idr: number;
  wallet_reserved_idr: number;
  quota_retained: boolean;
  cancellation_origin: string | null;
  confirmed_at: Date | null;
};

export function isCancellationTimely(nowMs: number, startsAtMs: number, cutoffMinutes: number): boolean {
  return nowMs < startsAtMs - cutoffMinutes * 60000;
}

@Injectable()
export class CancellationsService {
  constructor(private readonly db: Db, private readonly payments: PaymentsService) {}

  private async credited(client: PoolClient, bookingId: string): Promise<number> {
    const result = await client.query<{ total: string }>(`SELECT COALESCE(sum(amount_idr),0)::text AS total FROM wallet_entries WHERE booking_id=$1 AND kind IN ('class_refund','reservation_release')`, [bookingId]);
    return Number(result.rows[0].total);
  }

  private async cancelLocked(client: PoolClient, booking: Booking, origin: 'customer' | 'studio', timely: boolean) {
    if (booking.status === 'cancelled') return {
      id: booking.id, status: 'cancelled', cancellationOrigin: booking.cancellation_origin,
      creditedBalanceIdr: await this.credited(client, booking.id),
      quotaReturned: booking.source === 'quota' && !booking.quota_retained,
    };
    if (!['confirmed', 'pending_payment'].includes(booking.status)) throw new ConflictException('Booking tidak aktif');
    const quotaRetained = booking.source === 'quota' && !timely;
    await client.query(`UPDATE bookings SET status='cancelled',cancelled_at=now(),cancellation_origin=$2,quota_retained=$3 WHERE id=$1`, [booking.id,origin,quotaRetained]);
    await client.query(`UPDATE payment_transactions SET status='expired',provider_status='booking_cancelled',updated_at=now() WHERE booking_id=$1 AND status='pending'`, [booking.id]);
    const credit = booking.status === 'pending_payment' ? booking.wallet_reserved_idr : booking.source === 'single' && timely ? booking.price_idr : 0;
    if (credit > 0) await this.payments.walletEntry(client,booking.customer_id,booking.id,credit,booking.status === 'pending_payment' ? 'reservation_release' : 'class_refund',`booking:${booking.id}:${booking.status === 'pending_payment' ? 'release' : 'refund'}`);
    return { id: booking.id, status: 'cancelled', cancellationOrigin: origin, creditedBalanceIdr: credit, quotaReturned: booking.source === 'quota' && timely };
  }

  async cancelCustomer(bookingId: string, customerId: string) {
    return this.db.transaction(async (client) => {
      await client.query('SELECT id FROM app_users WHERE id=$1 FOR UPDATE', [customerId]);
      const probe = await client.query<{ session_id: string }>('SELECT session_id FROM bookings WHERE id=$1 AND customer_id=$2', [bookingId,customerId]);
      if (!probe.rows[0]) throw new NotFoundException('Booking tidak ditemukan');
      const session = await client.query<{ status: string; starts_at: Date; cancellation_cutoff_minutes: number }>(`SELECT s.status,s.starts_at,p.cancellation_cutoff_minutes FROM class_sessions s JOIN studio_policy p ON p.studio_id=1 WHERE s.id=$1 FOR UPDATE OF s`, [probe.rows[0].session_id]);
      const result = await client.query<Booking>('SELECT * FROM bookings WHERE id=$1 AND customer_id=$2 FOR UPDATE', [bookingId,customerId]);
      const booking = result.rows[0];
      if (booking.status === 'cancelled') return this.cancelLocked(client,booking,'customer',true);
      if (session.rows[0].status !== 'scheduled') throw new ConflictException('Sesi tidak aktif');
      const now = Date.now();
      if (now >= session.rows[0].starts_at.getTime()) throw new ConflictException('Kelas sudah dimulai');
      const timely = isCancellationTimely(now,session.rows[0].starts_at.getTime(),session.rows[0].cancellation_cutoff_minutes);
      return this.cancelLocked(client,booking,'customer',timely);
    });
  }

  async cancelSession(sessionId: string, adminId: string) {
    return this.db.transaction(async (client) => {
      const session = await client.query<{ status: string }>('SELECT status FROM class_sessions WHERE id=$1 FOR UPDATE', [sessionId]);
      if (!session.rows[0]) throw new NotFoundException('Sesi tidak ditemukan');
      if (session.rows[0].status === 'cancelled') return { id: sessionId, status: 'cancelled', bookingsCancelled: 0, previousCancellationsRestored: 0, creditedBalanceIdr: 0, quotaReturned: 0 };
      if (session.rows[0].status !== 'scheduled') throw new ConflictException('Sesi tidak dapat dibatalkan');
      const bookings = await client.query<Booking>(`SELECT * FROM bookings WHERE session_id=$1 AND status IN ('confirmed','pending_payment','cancelled') ORDER BY customer_id,id FOR UPDATE`, [sessionId]);
      let creditedBalanceIdr = 0;
      let quotaReturned = 0;
      let bookingsCancelled = 0;
      let previousCancellationsRestored = 0;
      for (const booking of bookings.rows) {
        if (booking.status === 'cancelled') {
          let restored = false;
          if (booking.source === 'quota' && booking.quota_retained) {
            await client.query('UPDATE bookings SET quota_retained=false WHERE id=$1', [booking.id]);
            quotaReturned++;
            restored = true;
          }
          if (booking.source === 'single' && booking.confirmed_at && booking.price_idr > 0 && await this.credited(client,booking.id) === 0) {
            await this.payments.walletEntry(client,booking.customer_id,booking.id,booking.price_idr,'class_refund',`booking:${booking.id}:refund`);
            creditedBalanceIdr += booking.price_idr;
            restored = true;
          }
          if (restored) previousCancellationsRestored++;
          continue;
        }
        const result = await this.cancelLocked(client,booking,'studio',true);
        bookingsCancelled++;
        creditedBalanceIdr += result.creditedBalanceIdr;
        if (result.quotaReturned) quotaReturned++;
      }
      await client.query(`UPDATE class_sessions SET status='cancelled',cancelled_at=now() WHERE id=$1`, [sessionId]);
      await client.query(`INSERT INTO audit_logs (actor_id,action,reason) VALUES ($1,'cancel_session',$2)`, [adminId,sessionId]);
      return { id: sessionId, status: 'cancelled', bookingsCancelled, previousCancellationsRestored, creditedBalanceIdr, quotaReturned };
    });
  }
}
