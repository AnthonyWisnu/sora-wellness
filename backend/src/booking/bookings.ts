import { BadRequestException, Body, ConflictException, Controller, Get, Headers, NotFoundException, Param, ParseUUIDPipe, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ApiCookieAuth, ApiCreatedResponse, ApiHeader, ApiOkResponse, ApiProperty, ApiPropertyOptional, ApiTags } from '@nestjs/swagger';
import { IsBoolean, IsIn, IsInt, IsOptional, IsUUID, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { PoolClient } from 'pg';
import { Db } from '../shared/db';
import { AuthRequest, assertRole, SessionGuard } from '../shared/security';
import { monthlyQuota, DateRange } from '../membership/quota';
import { PaymentsService } from '../payments/payments';
import { CancellationsService } from './cancellations';

export class BookingDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID() sessionId!: string;
  @ApiProperty({ enum: ['quota', 'single'], example: 'single' })
  @IsIn(['quota', 'single']) paymentChoice!: 'quota' | 'single';
  @ApiPropertyOptional({ description: 'Bila true, gunakan saldo sebanyak mungkin untuk pembelian satuan.' })
  @IsOptional() @IsBoolean() useBalance?: boolean;
}
export class BookingListFilter {
  @ApiPropertyOptional({ example: 1 }) @IsOptional() @Type(() => Number) @IsInt() @Min(1) page?: number;
  @ApiPropertyOptional({ example: 20 }) @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100) limit?: number;
}

type SessionRow = { id: string; local_date: string; starts_at: Date; status: string; capacity: number; price_idr: number; level: string; booking_cutoff_minutes: number; seat_hold_minutes: number; monthly_class_quota: number; guest_schedule_days: number; member_schedule_days: number; timezone: string };

@ApiTags('bookings') @ApiCookieAuth('wellness.sid')
@Controller()
@UseGuards(SessionGuard)
export class BookingController {
  constructor(private readonly db: Db, private readonly payments: PaymentsService, private readonly cancellations: CancellationsService) {}

  @Get('sessions/:id/booking-options')
  @ApiOkResponse({ schema: { example: { bookable: true, reason: null, seatsLeft: 5, memberOnDate: true, quotaTotal: 8, quotaUsed: 2, quotaAvailable: true, singlePriceIdr: 75000 } } })
  async options(@Req() req: AuthRequest, @Param('id') id: string) {
    const actor = assertRole(req, 'customer');
    await this.payments.expirePending(actor.id);
    return this.db.transaction(async (client) => {
      const session = await this.getSession(client, id, false);
      const options = await this.eligibility(client, actor.id, session);
      const wallet = await client.query<{ balance_idr: string }>('SELECT balance_idr FROM wallet_accounts WHERE customer_id=$1', [actor.id]);
      return { ...options, balanceIdr: Number(wallet.rows[0].balance_idr) };
    });
  }

  @Post('bookings')
  @ApiCreatedResponse({ description: 'Gratis, jatah, atau saldo penuh langsung confirmed. Bila masih ada tagihan, respons berisi token dan URL Snap Sandbox.', schema: { example: { id: 'd6d920d7-a0c1-46ac-8793-e5f84b004e2d', status: 'pending_payment', source: 'single', priceIdr: 75000, walletReservedIdr: 0, gatewayDueIdr: 75000, holdExpiresAt: '2026-09-25T07:00:00.000Z', payment: { orderId: 'CLS-d6d920d7-a0c1-46ac-8793-e5f84b004e2d', snapToken: 'token-dari-Midtrans', redirectUrl: 'https://app.sandbox.midtrans.com/snap/v2/vtweb/token-dari-Midtrans' } } } })
  @ApiHeader({ name: 'Idempotency-Key', required: true, description: 'Kunci unik 8–128 karakter untuk satu upaya booking.' })
  async create(@Req() req: AuthRequest, @Body() body: BookingDto, @Headers('idempotency-key') key: string | undefined) {
    const actor = assertRole(req, 'customer');
    if (!key || key.length < 8 || key.length > 128) throw new BadRequestException('Header Idempotency-Key wajib 8–128 karakter');
    if (body.paymentChoice === 'quota' && body.useBalance) throw new BadRequestException('Saldo tidak dipakai bersama jatah member');
    await this.payments.expirePending(actor.id);
    return this.db.transaction(async (client) => {
      await client.query('SELECT id FROM app_users WHERE id=$1 FOR UPDATE', [actor.id]);
      const prior = await client.query<{ id: string; session_id: string; status: string; source: string; price_idr: number; wallet_reserved_idr: number; gateway_due_idr: number; hold_expires_at: Date | null; order_id: string | null; snap_token: string | null; redirect_url: string | null }>('SELECT b.id,b.session_id,b.status,b.source,b.price_idr,b.wallet_reserved_idr,b.gateway_due_idr,b.hold_expires_at,p.order_id,p.snap_token,p.redirect_url FROM bookings b LEFT JOIN payment_transactions p ON p.booking_id=b.id WHERE b.customer_id=$1 AND b.idempotency_key=$2', [actor.id, key]);
      if (prior.rows[0]) {
        if (prior.rows[0].session_id !== body.sessionId) throw new ConflictException('Idempotency-Key sudah dipakai untuk sesi lain');
        if (prior.rows[0].source !== 'free' && prior.rows[0].source !== body.paymentChoice) throw new ConflictException('Idempotency-Key sudah dipakai untuk pilihan pembayaran lain');
        const b = prior.rows[0];
        return { id: b.id, status: b.status, source: b.source, priceIdr: b.price_idr, walletReservedIdr: b.wallet_reserved_idr, gatewayDueIdr: b.gateway_due_idr, holdExpiresAt: b.hold_expires_at, payment: b.order_id && b.status === 'pending_payment' ? { orderId: b.order_id, snapToken: b.snap_token, redirectUrl: b.redirect_url } : null };
      }
      const session = await this.getSession(client, body.sessionId, true);
      await client.query(`UPDATE bookings SET status='expired' WHERE session_id=$1 AND status='pending_payment' AND hold_expires_at <= now()`, [session.id]);
      const options = await this.eligibility(client, actor.id, session);
      if (!options.bookable) throw new ConflictException(options.reason);
      if (options.seatsLeft <= 0) throw new ConflictException('Kelas penuh');
      const duplicate = await client.query(`SELECT 1 FROM bookings WHERE customer_id=$1 AND session_id=$2 AND status IN ('confirmed','pending_payment')`, [actor.id, session.id]);
      if (duplicate.rowCount) throw new ConflictException('Sudah ada booking aktif pada sesi ini');
      let source: 'free' | 'quota' | 'single';
      let status: 'confirmed' | 'pending_payment';
      let walletReservedIdr = 0;
      let gatewayDueIdr = 0;
      if (session.price_idr === 0) { source = 'free'; status = 'confirmed'; }
      else if (body.paymentChoice === 'quota') {
        if (!options.quotaAvailable) throw new ConflictException('Jatah kelas tidak tersedia');
        source = 'quota'; status = 'confirmed';
      } else {
        source = 'single';
        if (body.useBalance) {
          const wallet = await client.query<{ balance_idr: string }>('SELECT balance_idr FROM wallet_accounts WHERE customer_id=$1 FOR UPDATE', [actor.id]);
          walletReservedIdr = Math.min(Number(wallet.rows[0].balance_idr),session.price_idr);
        }
        gatewayDueIdr = session.price_idr - walletReservedIdr;
        status = gatewayDueIdr > 0 ? 'pending_payment' : 'confirmed';
      }
      const result = await client.query<{ id: string; holdExpiresAt: Date | null }>(`INSERT INTO bookings (customer_id,session_id,status,source,price_idr,wallet_reserved_idr,gateway_due_idr,hold_expires_at,idempotency_key,confirmed_at) VALUES ($1,$2,$3,$4,$5,$6,$7,CASE WHEN $3='pending_payment' THEN now()+($8::int * interval '1 minute') ELSE NULL END,$9,CASE WHEN $3='confirmed' THEN now() ELSE NULL END) RETURNING id,hold_expires_at AS "holdExpiresAt"`, [actor.id,session.id,status,source,session.price_idr,walletReservedIdr,gatewayDueIdr,session.seat_hold_minutes,key]);
      const bookingId = result.rows[0].id;
      if (walletReservedIdr > 0) await this.payments.walletEntry(client,actor.id,bookingId,-walletReservedIdr,'class_purchase',`booking:${bookingId}:initial-debit`);
      const payment = gatewayDueIdr > 0 ? await this.payments.createSnapForBooking(client,bookingId,gatewayDueIdr,session.seat_hold_minutes) : null;
      return { id: bookingId, status, source, priceIdr: session.price_idr, walletReservedIdr, gatewayDueIdr, holdExpiresAt: result.rows[0].holdExpiresAt, payment };
    });
  }

  @Get('bookings')
  async list(@Req() req: AuthRequest, @Query() filter: BookingListFilter) {
    const actor = assertRole(req, 'customer');
    const found = await this.db.query(`SELECT b.id,b.status,b.source,b.price_idr AS "priceIdr",b.wallet_reserved_idr AS "walletReservedIdr",b.gateway_due_idr AS "gatewayDueIdr",b.hold_expires_at AS "holdExpiresAt",b.created_at AS "createdAt",b.cancelled_at AS "cancelledAt",b.cancellation_origin AS "cancellationOrigin",b.quota_retained AS "quotaRetained",s.local_date::text AS "localDate",s.starts_at AS "startsAt",t.title FROM bookings b JOIN class_sessions s ON s.id=b.session_id JOIN class_types t ON t.id=s.class_type_id WHERE b.customer_id=$1 ORDER BY b.created_at DESC LIMIT $2 OFFSET $3`, [actor.id, filter.limit ?? 20, ((filter.page ?? 1) - 1) * (filter.limit ?? 20)]);
    return found.rows;
  }

  @Get('bookings/:id')
  async detail(@Req() req: AuthRequest, @Param('id') id: string) {
    const actor = assertRole(req, 'customer');
    const found = await this.db.query(`SELECT b.id,b.session_id AS "sessionId",b.status,b.source,b.price_idr AS "priceIdr",b.wallet_reserved_idr AS "walletReservedIdr",b.gateway_due_idr AS "gatewayDueIdr",b.hold_expires_at AS "holdExpiresAt",b.created_at AS "createdAt",b.cancelled_at AS "cancelledAt",b.cancellation_origin AS "cancellationOrigin",b.quota_retained AS "quotaRetained",COALESCE((SELECT sum(w.amount_idr) FROM wallet_entries w WHERE w.booking_id=b.id AND w.kind IN ('class_refund','reservation_release')),0)::int AS "creditedBalanceIdr",p.status AS "paymentStatus",CASE WHEN b.status='pending_payment' THEN p.snap_token ELSE NULL END AS "snapToken",CASE WHEN b.status='pending_payment' THEN p.redirect_url ELSE NULL END AS "redirectUrl" FROM bookings b LEFT JOIN payment_transactions p ON p.booking_id=b.id WHERE b.id=$1 AND b.customer_id=$2`, [id, actor.id]);
    if (!found.rows[0]) throw new NotFoundException();
    return found.rows[0];
  }

  @Post('bookings/:id/cancel')
  @ApiCreatedResponse({ schema: { example: { id: 'd6d920d7-a0c1-46ac-8793-e5f84b004e2d', status: 'cancelled', cancellationOrigin: 'customer', creditedBalanceIdr: 75000, quotaReturned: false } } })
  async cancel(@Req() req: AuthRequest, @Param('id', ParseUUIDPipe) id: string) {
    const actor = assertRole(req, 'customer');
    return this.cancellations.cancelCustomer(id, actor.id);
  }

  private async getSession(client: PoolClient, id: string, lock: boolean): Promise<SessionRow> {
    const found = await client.query<SessionRow>(`SELECT s.id,s.local_date::text,s.starts_at,s.status,s.capacity,s.price_idr,t.level,p.booking_cutoff_minutes,p.seat_hold_minutes,p.monthly_class_quota,p.guest_schedule_days,p.member_schedule_days,st.timezone FROM class_sessions s JOIN class_types t ON t.id=s.class_type_id JOIN studio_policy p ON p.studio_id=1 JOIN studio st ON st.id=1 WHERE s.id=$1 ${lock ? 'FOR UPDATE OF s' : ''}`, [id]);
    if (!found.rows[0]) throw new NotFoundException('Sesi tidak ditemukan');
    return found.rows[0];
  }

  private async eligibility(client: PoolClient, customerId: string, session: SessionRow) {
    const ranges = await client.query<DateRange>(`SELECT starts_on::text,ends_on::text FROM memberships WHERE customer_id=$1 AND starts_on < (date_trunc('month',$2::date) + interval '1 month')::date AND ends_on >= date_trunc('month',$2::date)::date`, [customerId, session.local_date]);
    const memberOnDate = ranges.rows.some((r) => r.starts_on <= session.local_date && r.ends_on >= session.local_date);
    const currentMembership = await client.query('SELECT 1 FROM memberships WHERE customer_id=$1 AND starts_on <= (now() AT TIME ZONE $2)::date AND ends_on >= (now() AT TIME ZONE $2)::date LIMIT 1', [customerId, session.timezone]);
    const maxDays = currentMembership.rowCount ? session.member_schedule_days : session.guest_schedule_days;
    const window = await client.query<{ within: boolean }>('SELECT $1::date >= (now() AT TIME ZONE $2)::date AND $1::date < (now() AT TIME ZONE $2)::date + $3::int AS within', [session.local_date, session.timezone, maxDays]);
    const month = session.local_date.slice(0, 7);
    const quotaTotal = monthlyQuota(session.monthly_class_quota, month, ranges.rows);
    const used = await client.query<{ count: number }>(`SELECT count(*)::int AS count FROM bookings b JOIN class_sessions s ON s.id=b.session_id WHERE b.customer_id=$1 AND b.source='quota' AND to_char(s.local_date,'YYYY-MM')=$2 AND (b.status='confirmed' OR b.status='cancelled' AND b.quota_retained=true)`, [customerId, month]);
    const seats = await client.query<{ count: number }>(`SELECT count(*)::int AS count FROM bookings WHERE session_id=$1 AND (status='confirmed' OR status='pending_payment' AND hold_expires_at>now())`, [session.id]);
    let reason: string | null = null;
    if (session.status !== 'scheduled') reason = 'Sesi tidak aktif';
    else if (!window.rows[0].within) reason = 'Di luar jendela jadwal';
    else if (Date.now() >= session.starts_at.getTime() - session.booking_cutoff_minutes * 60000) reason = 'Booking sudah ditutup';
    else if (session.level !== 'beginner' && !memberOnDate) reason = 'Tingkat ini memerlukan paket aktif pada tanggal sesi';
    return { bookable: !reason, reason, seatsLeft: session.capacity - seats.rows[0].count, memberOnDate, quotaTotal, quotaUsed: used.rows[0].count, quotaAvailable: session.price_idr > 0 && memberOnDate && used.rows[0].count < quotaTotal, singlePriceIdr: session.price_idr };
  }
}
