import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PoolClient } from 'pg';
import { Db } from '../shared/db';
import { PaymentsService } from '../payments/payments';
import { EVENT_CHECKOUT_MINUTES, refundCancelledEvent } from './event-payment-state';

type TicketRow = {
  id: string; status: string; priceIdr: number; holdExpiresAt: Date | null;
  ticketCode: string | null; guestName: string; activityTitle: string; eventTitle: string;
  localDate: string | null; startTime: string; endTime: string; timezone: string;
  orderId: string | null; paymentStatus: string | null; redirectUrl: string | null; snapToken: string | null;
};

@Injectable()
export class EventCheckoutService {
  constructor(private readonly db: Db, private readonly payments: PaymentsService) {}

  async create(slug: string, activityId: string, customerId: string, key: string | undefined) {
    if (!key || key.length<8 || key.length>128) throw new BadRequestException('Header Idempotency-Key wajib 8-128 karakter');
    await this.payments.expirePendingEvents(customerId);
    const id = await this.db.transaction(async client => {
      const event = await client.query<{ id: string; timezone: string; prefix: string }>(`SELECT e.id,s.timezone,COALESCE(s.booking_code_prefix,'SORA') AS prefix FROM community_events e CROSS JOIN studio s
        WHERE e.slug=$1 AND e.status='published' AND s.id=1 FOR SHARE OF e`, [slug]);
      if (!event.rows[0]) throw new NotFoundException('Event tidak aktif');
      const customer = await client.query<{ email: string; full_name: string }>('SELECT email,full_name FROM app_users WHERE id=$1 AND role=\'customer\' FOR NO KEY UPDATE', [customerId]);
      if (!customer.rows[0]) throw new NotFoundException('Akun pelanggan tidak ditemukan');
      const prior = await client.query<{ id: string; activity_id: string }>('SELECT id,activity_id FROM event_registrations WHERE customer_id=$1 AND idempotency_key=$2', [customerId,key]);
      if (prior.rows[0]) {
        if (prior.rows[0].activity_id!==activityId) throw new ConflictException('Idempotency-Key sudah dipakai untuk kegiatan lain');
        return prior.rows[0].id;
      }
      const found = await client.query<{ price_idr: number; capacity: number; local_date: string | null; start_time: string }>(
        'SELECT price_idr,capacity,local_date::text,start_time FROM event_activities WHERE event_id=$1 AND id=$2 FOR UPDATE', [event.rows[0].id,activityId]);
      const activity = found.rows[0];
      if (!activity || !activity.local_date) throw new BadRequestException('Tanggal kegiatan belum tersedia');
      if (activity.price_idr<=0) throw new BadRequestException('Gunakan pendaftaran gratis untuk kegiatan ini');
      if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(activity.start_time)) throw new BadRequestException('Jam kegiatan tidak valid');
      const time = await client.query<{ open: boolean }>(`SELECT (($1::date+$2::time) AT TIME ZONE $3)-($4::int*interval '1 minute')>now() AS open`, [activity.local_date,activity.start_time,event.rows[0].timezone,EVENT_CHECKOUT_MINUTES]);
      if (!time.rows[0].open) throw new ConflictException('Pendaftaran berbayar ditutup 15 menit sebelum kegiatan');
      const seats = await client.query<{ count: number; duplicate: boolean }>(`SELECT count(*)::int AS count,
        COALESCE(bool_or(customer_id=$2 OR guest_email=$3),false) AS duplicate FROM event_registrations WHERE activity_id=$1
        AND (status IN ('registered','attended') OR status='pending_payment' AND hold_expires_at>now())`, [activityId,customerId,customer.rows[0].email]);
      if (seats.rows[0].duplicate) throw new ConflictException('Sudah ada pendaftaran aktif pada kegiatan ini');
      if (seats.rows[0].count>=activity.capacity) throw new ConflictException('Kegiatan sudah penuh');
      const registration = await client.query<{ id: string }>(`INSERT INTO event_registrations
        (event_id,activity_id,customer_id,guest_name,guest_email,ticket_code,status,price_idr,hold_expires_at,idempotency_key)
        VALUES($1,$2,$3,$4,$5,$9||'-EVT-'||upper(substr(replace(gen_random_uuid()::text,'-',''),1,12)),
          'pending_payment',$6,now()+($7::int*interval '1 minute'),$8) RETURNING id`,
      [event.rows[0].id,activityId,customerId,customer.rows[0].full_name,customer.rows[0].email,activity.price_idr,EVENT_CHECKOUT_MINUTES,key,event.rows[0].prefix]);
      await this.payments.createEventIntent(client,registration.rows[0].id,activity.price_idr);
      return registration.rows[0].id;
    });
    const ticket = await this.one(customerId,id);
    if (ticket.status==='pending_payment' && ticket.payment) await this.payments.prepareSnap(ticket.payment.orderId);
    return this.one(customerId,id);
  }

  async one(customerId: string, id: string) {
    await this.payments.expirePendingEvents(customerId);
    const found = await this.db.query<TicketRow>(`SELECT r.id,r.status,r.price_idr AS "priceIdr",r.hold_expires_at AS "holdExpiresAt",
      CASE WHEN r.status IN ('registered','attended') THEN r.ticket_code ELSE NULL END AS "ticketCode",
      r.guest_name AS "guestName",a.title AS "activityTitle",e.title AS "eventTitle",a.local_date::text AS "localDate",
      a.start_time AS "startTime",a.end_time AS "endTime",s.timezone,p.order_id AS "orderId",p.status AS "paymentStatus",
      CASE WHEN r.status='pending_payment' THEN p.redirect_url ELSE NULL END AS "redirectUrl",
      CASE WHEN r.status='pending_payment' THEN p.snap_token ELSE NULL END AS "snapToken"
      FROM event_registrations r JOIN event_activities a ON a.id=r.activity_id JOIN community_events e ON e.id=r.event_id
      CROSS JOIN studio s LEFT JOIN payment_transactions p ON p.event_registration_id=r.id
      WHERE r.id=$1 AND r.customer_id=$2 AND s.id=1`, [id,customerId]);
    const row = found.rows[0];
    if (!row) throw new NotFoundException('Pendaftaran tidak ditemukan');
    const { orderId,paymentStatus,redirectUrl,snapToken,...ticket } = row;
    return { ...ticket, payment: orderId ? { orderId,status: paymentStatus,redirectUrl,snapToken } : null };
  }

  async latest(slug: string, activityId: string, customerId: string) {
    await this.payments.expirePendingEvents(customerId);
    const row = await this.db.query<{ id: string }>(`SELECT r.id FROM event_registrations r JOIN community_events e ON e.id=r.event_id
      WHERE e.slug=$1 AND r.activity_id=$2 AND r.customer_id=$3 AND r.status IN ('pending_payment','registered','attended')
      ORDER BY r.created_at DESC,r.id DESC LIMIT 1`, [slug,activityId,customerId]);
    return row.rows[0] ? this.one(customerId,row.rows[0].id) : null;
  }

  async resume(customerId: string, id: string) {
    const ticket = await this.one(customerId,id);
    if (ticket.status!=='pending_payment' || !ticket.payment) throw new ConflictException('Pesanan tidak lagi menunggu pembayaran');
    return this.payments.prepareSnap(ticket.payment.orderId);
  }

  async refresh(customerId: string, id: string) {
    const ticket = await this.one(customerId,id);
    if (!ticket.payment) return { eventStatus: ticket.status, paymentStatus: null };
    return this.payments.refreshByOrder(ticket.payment.orderId);
  }

  refundCancelled(client: PoolClient, eventId: string) {
    return refundCancelledEvent(client,eventId,this.payments.walletEntry.bind(this.payments));
  }
}
