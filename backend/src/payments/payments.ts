import { ForbiddenException, Injectable, NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { PoolClient } from 'pg';
import { Db } from '../shared/db';
import { MidtransClient, MidtransNotification, MidtransStatus } from './midtrans';
import { PACKAGE_CHECKOUT_MINUTES } from '../membership/package-policy';
import { PaymentSettings } from './payment-settings';
import { amountIdr, BookingPaymentRow } from './payment-guards';

@Injectable()
export class PaymentsService {
  constructor(private readonly db: Db, private readonly settings: PaymentSettings) {}

  async createSnapForBooking(client: PoolClient, bookingId: string, amount: number, holdMinutes: number) {
    const { serverKey } = await this.settings.credentials();
    const orderId = `CLS-${bookingId}`;
    const payment = await client.query<{ id: string }>(`INSERT INTO payment_transactions (booking_id,order_id,gross_amount_idr,status) VALUES ($1,$2,$3,'pending') RETURNING id`, [bookingId,orderId,amount]);
    const snap = await new MidtransClient(serverKey).createSnapTransaction(orderId, amount, holdMinutes);
    await client.query('UPDATE payment_transactions SET snap_token=$1,redirect_url=$2,updated_at=now() WHERE id=$3', [snap.token,snap.redirect_url,payment.rows[0].id]);
    return { paymentId: payment.rows[0].id, orderId, snapToken: snap.token, redirectUrl: snap.redirect_url };
  }

  async createSnapForPackage(client: PoolClient, purchaseId: string, amount: number) {
    const { serverKey } = await this.settings.credentials();
    const orderId = `PKG-${purchaseId}`;
    const payment = await client.query<{ id: string }>(`INSERT INTO payment_transactions (package_purchase_id,order_id,gross_amount_idr,status) VALUES ($1,$2,$3,'pending') RETURNING id`, [purchaseId,orderId,amount]);
    const snap = await new MidtransClient(serverKey).createSnapTransaction(orderId,amount,PACKAGE_CHECKOUT_MINUTES);
    await client.query('UPDATE payment_transactions SET snap_token=$1,redirect_url=$2,updated_at=now() WHERE id=$3', [snap.token,snap.redirect_url,payment.rows[0].id]);
    return { orderId, redirectUrl: snap.redirect_url };
  }

  async walletEntry(client: PoolClient, customerId: string, bookingId: string | null, amount: number, kind: string, reference: string) {
    if (amount === 0) return;
    const changed = await client.query<{ balance_idr: string }>(`UPDATE wallet_accounts SET balance_idr=balance_idr+$2,updated_at=now() WHERE customer_id=$1 AND balance_idr+$2 >= 0 RETURNING balance_idr`, [customerId,amount]);
    if (!changed.rows[0]) throw new ForbiddenException('Saldo tidak cukup');
    await client.query(`INSERT INTO wallet_entries (customer_id,booking_id,amount_idr,balance_after_idr,kind,reference) VALUES ($1,$2,$3,$4,$5,$6)`, [customerId,bookingId,amount,changed.rows[0].balance_idr,kind,reference]);
  }

  private async expireLocked(client: PoolClient, booking: { id: string; customer_id: string; status: string; wallet_reserved_idr: number; hold_expires_at: Date | null }) {
    if (booking.status !== 'pending_payment' || !booking.hold_expires_at || booking.hold_expires_at.getTime() > Date.now()) return false;
    await client.query(`UPDATE bookings SET status='expired' WHERE id=$1`, [booking.id]);
    if (booking.wallet_reserved_idr > 0) await this.walletEntry(client,booking.customer_id,booking.id,booking.wallet_reserved_idr,'reservation_release',`booking:${booking.id}:release`);
    await client.query(`UPDATE payment_transactions SET status='expired',updated_at=now() WHERE booking_id=$1 AND status='pending'`, [booking.id]);
    return true;
  }

  async expireBooking(bookingId: string) {
    await this.db.transaction(async (client) => {
      const probe = await client.query<{ customer_id: string; session_id: string }>('SELECT customer_id,session_id FROM bookings WHERE id=$1', [bookingId]);
      if (!probe.rows[0]) return;
      const { customer_id, session_id } = probe.rows[0];
      await client.query('SELECT id FROM app_users WHERE id=$1 FOR UPDATE', [customer_id]);
      await client.query('SELECT id FROM class_sessions WHERE id=$1 FOR UPDATE', [session_id]);
      const found = await client.query<{ id: string; customer_id: string; status: string; wallet_reserved_idr: number; hold_expires_at: Date | null }>('SELECT id,customer_id,status,wallet_reserved_idr,hold_expires_at FROM bookings WHERE id=$1 FOR UPDATE', [bookingId]);
      if (found.rows[0]) await this.expireLocked(client, found.rows[0]);
    });
  }

  async expirePending(customerId?: string) {
    const pending = await this.db.query<{ id: string }>(`SELECT id FROM bookings WHERE status='pending_payment' AND hold_expires_at<=now() AND ($1::uuid IS NULL OR customer_id=$1) ORDER BY hold_expires_at LIMIT 100`, [customerId ?? null]);
    for (const booking of pending.rows) await this.expireBooking(booking.id);
  }

  async processNotification(body: MidtransNotification) {
    const credentials = await this.settings.credentials();
    const midtrans = new MidtransClient(credentials.serverKey);
    if (!body || typeof body.order_id !== 'string' || !midtrans.verifyNotificationSignature(body)) throw new ForbiddenException('Notifikasi Midtrans tidak valid');
    return this.refreshByOrder(body.order_id);
  }

  async refreshByBooking(bookingId: string, customerId: string) {
    const payment = await this.db.query<{ order_id: string }>(`SELECT p.order_id FROM payment_transactions p JOIN bookings b ON b.id=p.booking_id WHERE b.id=$1 AND b.customer_id=$2`, [bookingId,customerId]);
    if (!payment.rows[0]) throw new NotFoundException('Pembayaran booking tidak ditemukan');
    return this.refreshByOrder(payment.rows[0].order_id);
  }

  async refreshByPackage(purchaseId: string, customerId: string) {
    const payment = await this.db.query<{ order_id: string }>(`SELECT p.order_id FROM payment_transactions p JOIN package_purchases b ON b.id=p.package_purchase_id WHERE b.id=$1 AND b.customer_id=$2`, [purchaseId,customerId]);
    if (!payment.rows[0]) throw new NotFoundException('Pembayaran paket tidak ditemukan');
    return this.refreshByOrder(payment.rows[0].order_id);
  }

  async expirePendingPackages(customerId?: string) {
    const expired = await this.db.query<{ order_id: string }>(`SELECT p.order_id FROM package_purchases b JOIN payment_transactions p ON p.package_purchase_id=b.id WHERE b.status='pending_payment' AND b.expires_at<=now() AND ($1::uuid IS NULL OR b.customer_id=$1) ORDER BY b.expires_at LIMIT 100`, [customerId ?? null]);
    for (const row of expired.rows) await this.refreshByOrder(row.order_id);
  }

  async refreshByOrder(orderId: string) {
    const credentials = await this.settings.credentials();
    const payment = await this.db.query<{ gross_amount_idr: number; status: string; package_purchase_id: string | null; package_expires_at: Date | null }>('SELECT p.gross_amount_idr,p.status,p.package_purchase_id,b.expires_at AS package_expires_at FROM payment_transactions p LEFT JOIN package_purchases b ON b.id=p.package_purchase_id WHERE p.order_id=$1', [orderId]);
    if (!payment.rows[0]) throw new NotFoundException('Order pembayaran tidak ditemukan');
    const status = await new MidtransClient(credentials.serverKey).getTransactionStatus(orderId);
    if (status.status_code === '404') {
      if (payment.rows[0].package_purchase_id && payment.rows[0].package_expires_at && payment.rows[0].package_expires_at.getTime() <= Date.now()) return this.expireUnstartedPackage(orderId);
      return { paymentStatus: payment.rows[0].status, providerStatus: 'not_started' };
    }
    if (status.order_id !== orderId || status.merchant_id !== credentials.merchantId || amountIdr(status.gross_amount) !== payment.rows[0].gross_amount_idr) throw new ServiceUnavailableException('Data status Midtrans tidak cocok dengan order');
    return payment.rows[0].package_purchase_id ? this.applyTrustedPackageStatus(orderId,status) : this.applyTrustedStatus(orderId, status);
  }

  private async expireUnstartedPackage(orderId: string) {
    return this.db.transaction(async (client) => {
      const probe = await client.query<{ customer_id: string }>('SELECT b.customer_id FROM payment_transactions p JOIN package_purchases b ON b.id=p.package_purchase_id WHERE p.order_id=$1', [orderId]);
      if (!probe.rows[0]) throw new NotFoundException('Order paket tidak ditemukan');
      await client.query('SELECT id FROM app_users WHERE id=$1 FOR UPDATE', [probe.rows[0].customer_id]);
      const found = await client.query<{ purchase_id: string; purchase_status: string; payment_status: string }>(`SELECT b.id AS purchase_id,b.status AS purchase_status,p.status AS payment_status FROM payment_transactions p JOIN package_purchases b ON b.id=p.package_purchase_id WHERE p.order_id=$1 FOR UPDATE OF p,b`, [orderId]);
      if (found.rows[0].purchase_status !== 'pending_payment') return { paymentStatus: found.rows[0].payment_status, purchaseStatus: found.rows[0].purchase_status };
      await client.query("UPDATE package_purchases SET status='expired' WHERE id=$1", [found.rows[0].purchase_id]);
      await client.query("UPDATE payment_transactions SET status='expired',provider_status='snap_page_expired',updated_at=now() WHERE order_id=$1", [orderId]);
      return { paymentStatus: 'expired', purchaseStatus: 'expired' };
    });
  }

  async applyTrustedPackageStatus(orderId: string, status: MidtransStatus) {
    return this.db.transaction(async (client) => {
      const probe = await client.query<{ customer_id: string }>('SELECT b.customer_id FROM payment_transactions p JOIN package_purchases b ON b.id=p.package_purchase_id WHERE p.order_id=$1', [orderId]);
      if (!probe.rows[0]) throw new NotFoundException('Order paket tidak ditemukan');
      await client.query('SELECT id FROM app_users WHERE id=$1 FOR UPDATE', [probe.rows[0].customer_id]);
      const found = await client.query<{ payment_id: string; payment_status: string; purchase_id: string; purchase_status: string; customer_id: string; package_option_id: string; amount_idr: number; duration_months: number }>(`SELECT p.id AS payment_id,p.status AS payment_status,b.id AS purchase_id,b.status AS purchase_status,b.customer_id,b.package_option_id,b.amount_idr,b.duration_months FROM payment_transactions p JOIN package_purchases b ON b.id=p.package_purchase_id WHERE p.order_id=$1 FOR UPDATE OF p,b`, [orderId]);
      const row = found.rows[0];
      if (row.payment_status === 'success') return { paymentStatus: 'success', purchaseStatus: row.purchase_status };
      const providerStatus = status.transaction_status ?? 'unknown';
      const success = status.status_code === '200' && ['settlement','capture'].includes(providerStatus) && (!status.fraud_status || status.fraud_status.toLowerCase() === 'accept');
      const failed = ['deny','cancel','expire','failure'].includes(providerStatus) || status.fraud_status?.toLowerCase() === 'deny';
      if (success) {
        const { activatePurchase } = await import('../membership/membership-purchases');
        const range = await activatePurchase(client,{ id: row.purchase_id, customer_id: row.customer_id, duration_months: row.duration_months });
        await client.query(`UPDATE payment_transactions SET status='success',provider_status=$1,processed_at=now(),updated_at=now() WHERE id=$2`, [providerStatus,row.payment_id]);
        return { paymentStatus: 'success', purchaseStatus: 'paid', ...range };
      }
      if (failed) {
        const finalStatus = providerStatus === 'expire' ? 'expired' : 'failed';
        await client.query('UPDATE package_purchases SET status=$1 WHERE id=$2', [finalStatus,row.purchase_id]);
        await client.query('UPDATE payment_transactions SET status=$1,provider_status=$2,processed_at=now(),updated_at=now() WHERE id=$3', [finalStatus,providerStatus,row.payment_id]);
        return { paymentStatus: finalStatus, purchaseStatus: finalStatus };
      }
      await client.query('UPDATE payment_transactions SET provider_status=$1,updated_at=now() WHERE id=$2', [providerStatus,row.payment_id]);
      return { paymentStatus: row.payment_status, purchaseStatus: row.purchase_status, providerStatus };
    });
  }

  async applyTrustedStatus(orderId: string, status: MidtransStatus) {
    return this.db.transaction(async (client) => {
      const probe = await client.query<BookingPaymentRow>(`SELECT p.id AS payment_id,p.order_id,p.gross_amount_idr AS amount_idr,p.status AS payment_status,b.id AS booking_id,b.customer_id,b.session_id,b.status AS booking_status,b.hold_expires_at,b.wallet_reserved_idr FROM payment_transactions p JOIN bookings b ON b.id=p.booking_id WHERE p.order_id=$1`, [orderId]);
      if (!probe.rows[0]) throw new NotFoundException('Order pembayaran tidak ditemukan');
      const row = probe.rows[0];
      await client.query('SELECT id FROM app_users WHERE id=$1 FOR UPDATE', [row.customer_id]);
      const session = await client.query<{ id: string; status: string; starts_at: Date; capacity: number; local_date: string; level: string; booking_cutoff_minutes: number; guest_schedule_days: number; member_schedule_days: number; timezone: string }>(`SELECT s.id,s.status,s.starts_at,s.capacity,s.local_date::text,t.level,p.booking_cutoff_minutes,p.guest_schedule_days,p.member_schedule_days,st.timezone FROM class_sessions s JOIN class_types t ON t.id=s.class_type_id JOIN studio_policy p ON p.studio_id=1 JOIN studio st ON st.id=1 WHERE s.id=$1 FOR UPDATE OF s`, [row.session_id]);
      const booking = await client.query<BookingPaymentRow>(`SELECT p.id AS payment_id,p.order_id,p.gross_amount_idr AS amount_idr,p.status AS payment_status,b.id AS booking_id,b.customer_id,b.session_id,b.status AS booking_status,b.hold_expires_at,b.wallet_reserved_idr FROM payment_transactions p JOIN bookings b ON b.id=p.booking_id WHERE p.id=$1 FOR UPDATE OF p,b`, [row.payment_id]);
      const current = booking.rows[0];
      if (current.payment_status === 'success') return { paymentStatus: 'success', bookingStatus: current.booking_status };
      const providerStatus = status.transaction_status ?? 'unknown';
      const success = status.status_code === '200' && ['settlement','capture'].includes(providerStatus) && (!status.fraud_status || status.fraud_status.toLowerCase() === 'accept');
      const failed = ['deny','cancel','expire','failure'].includes(providerStatus) || status.fraud_status?.toLowerCase() === 'deny';
      if (success) {
        const wasOnTime = current.booking_status === 'pending_payment' && current.hold_expires_at && current.hold_expires_at.getTime() > Date.now();
        if (!wasOnTime && current.booking_status === 'pending_payment') {
          await this.expireLocked(client, { id: current.booking_id, customer_id: current.customer_id, status: current.booking_status, wallet_reserved_idr: current.wallet_reserved_idr, hold_expires_at: current.hold_expires_at });
        }
        let confirm = Boolean(wasOnTime);
        if (!confirm && ['pending_payment','expired'].includes(current.booking_status) && session.rows[0]) confirm = await this.canConfirmLate(client,current,session.rows[0]);
        if (confirm && !wasOnTime && current.wallet_reserved_idr > 0) await this.walletEntry(client,current.customer_id,current.booking_id,-current.wallet_reserved_idr,'class_purchase',`booking:${current.booking_id}:late-redebit`);
        if (confirm) await client.query(`UPDATE bookings SET status='confirmed',confirmed_at=now() WHERE id=$1`, [current.booking_id]);
        else await this.walletEntry(client,current.customer_id,current.booking_id,current.amount_idr,'late_payment',`payment:${current.payment_id}:late-credit`);
        await client.query(`UPDATE payment_transactions SET status='success',provider_status=$1,processed_at=now(),updated_at=now() WHERE id=$2`, [providerStatus,current.payment_id]);
        return { paymentStatus: 'success', bookingStatus: confirm ? 'confirmed' : current.booking_status === 'cancelled' ? 'cancelled' : 'expired', creditedBalanceIdr: confirm ? 0 : current.amount_idr };
      }
      if (failed) {
        if (current.booking_status === 'pending_payment') {
          await client.query(`UPDATE bookings SET hold_expires_at=now() WHERE id=$1`, [current.booking_id]);
          await this.expireLocked(client, { id: current.booking_id, customer_id: current.customer_id, status: current.booking_status, wallet_reserved_idr: current.wallet_reserved_idr, hold_expires_at: new Date(0) });
        }
        await client.query(`UPDATE payment_transactions SET status=$1,provider_status=$2,processed_at=now(),updated_at=now() WHERE id=$3`, [providerStatus === 'expire' ? 'expired' : 'failed',providerStatus,current.payment_id]);
        return { paymentStatus: providerStatus === 'expire' ? 'expired' : 'failed', bookingStatus: current.booking_status === 'cancelled' ? 'cancelled' : 'expired' };
      }
      const expired = current.booking_status === 'pending_payment' && current.hold_expires_at && current.hold_expires_at.getTime() <= Date.now()
        ? await this.expireLocked(client, { id: current.booking_id, customer_id: current.customer_id, status: current.booking_status, wallet_reserved_idr: current.wallet_reserved_idr, hold_expires_at: current.hold_expires_at })
        : false;
      await client.query('UPDATE payment_transactions SET provider_status=$1,updated_at=now() WHERE id=$2', [providerStatus,current.payment_id]);
      return { paymentStatus: expired ? 'expired' : current.payment_status, bookingStatus: expired ? 'expired' : current.booking_status, providerStatus };
    });
  }

  private async canConfirmLate(client: PoolClient, booking: BookingPaymentRow, session: { id: string; status: string; starts_at: Date; capacity: number; local_date: string; level: string; booking_cutoff_minutes: number; guest_schedule_days: number; member_schedule_days: number; timezone: string }) {
    if (session.status !== 'scheduled' || Date.now() >= session.starts_at.getTime() - session.booking_cutoff_minutes * 60000) return false;
    const membership = await client.query('SELECT 1 FROM memberships WHERE customer_id=$1 AND starts_on<=$2::date AND ends_on>=$2::date LIMIT 1', [booking.customer_id,session.local_date]);
    if (session.level !== 'beginner' && !membership.rowCount) return false;
    const currentMember = await client.query('SELECT 1 FROM memberships WHERE customer_id=$1 AND starts_on<=(now() AT TIME ZONE $2)::date AND ends_on>=(now() AT TIME ZONE $2)::date LIMIT 1', [booking.customer_id,session.timezone]);
    const days = currentMember.rowCount ? session.member_schedule_days : session.guest_schedule_days;
    const window = await client.query<{ within: boolean }>('SELECT $1::date >= (now() AT TIME ZONE $2)::date AND $1::date < (now() AT TIME ZONE $2)::date + $3::int AS within', [session.local_date,session.timezone,days]);
    if (!window.rows[0].within) return false;
    const active = await client.query<{ count: number }>(`SELECT count(*)::int AS count FROM bookings WHERE session_id=$1 AND (status='confirmed' OR status='pending_payment' AND hold_expires_at>now())`, [session.id]);
    if (active.rows[0].count >= session.capacity) return false;
    const duplicate = await client.query(`SELECT 1 FROM bookings WHERE session_id=$1 AND customer_id=$2 AND status IN ('confirmed','pending_payment') AND id<>$3 LIMIT 1`, [session.id,booking.customer_id,booking.booking_id]);
    if (duplicate.rowCount) return false;
    if (booking.wallet_reserved_idr > 0) {
      const wallet = await client.query<{ balance_idr: string }>('SELECT balance_idr FROM wallet_accounts WHERE customer_id=$1 FOR UPDATE', [booking.customer_id]);
      if (Number(wallet.rows[0].balance_idr) < booking.wallet_reserved_idr) return false;
    }
    return true;
  }
}
