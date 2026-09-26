import { BadRequestException, ConflictException, Controller, Get, Headers, Injectable, Param, Post, Body, Req, UseGuards } from '@nestjs/common';
import { ApiCookieAuth, ApiCreatedResponse, ApiHeader, ApiProperty, ApiTags } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';
import { PoolClient } from 'pg';
import { Db } from '../shared/db';
import { membershipEndDate } from './membership-dates';
import { PACKAGE_CHECKOUT_MINUTES } from './package-policy';
import { PaymentsService } from '../payments/payments';
import { AuthRequest, assertRole, SessionGuard } from '../shared/security';

class PurchaseDto { @ApiProperty({ format: 'uuid', description: 'ID dari GET /api/v1/public/packages' }) @IsUUID() packageOptionId!: string; }

type Purchase = { id: string; customer_id: string; package_option_id: string; amount_idr: number; duration_months: number; status: string; expires_at: Date | null };

export async function membershipStart(client: PoolClient, customerId: string): Promise<string> {
  const now = await client.query<{ today: string }>("SELECT (now() AT TIME ZONE timezone)::date::text AS today FROM studio WHERE id=1");
  const today = now.rows[0].today;
  const last = await client.query<{ starts_on: string; ends_on: string }>('SELECT starts_on::text,ends_on::text FROM memberships WHERE customer_id=$1 ORDER BY ends_on DESC LIMIT 1', [customerId]);
  const range = last.rows[0];
  if (!range || range.ends_on < today) return today;
  if (range.starts_on > today) throw new ConflictException('Satu paket berikutnya sudah terjadwal');
  const allowed = await client.query<{ allowed: boolean }>('SELECT $1::date <= $2::date + 30 AS allowed', [range.ends_on, today]);
  if (!allowed.rows[0].allowed) throw new ConflictException('Perpanjangan tersedia mulai 30 hari sebelum paket berakhir');
  const next = new Date(`${range.ends_on}T00:00:00Z`);
  next.setUTCDate(next.getUTCDate() + 1);
  return next.toISOString().slice(0, 10);
}

export async function activatePurchase(client: PoolClient, purchase: Pick<Purchase,'id' | 'customer_id' | 'duration_months'>) {
  const start = await membershipStart(client, purchase.customer_id);
  const end = membershipEndDate(start, purchase.duration_months);
  await client.query('INSERT INTO memberships (customer_id,purchase_id,starts_on,ends_on) VALUES ($1,$2,$3,$4)', [purchase.customer_id,purchase.id,start,end]);
  await client.query("UPDATE package_purchases SET status='paid',paid_at=now() WHERE id=$1", [purchase.id]);
  return { startsOn: start, endsOn: end };
}

@Injectable()
export class MembershipPurchasesService {
  constructor(private readonly db: Db, private readonly payments: PaymentsService) {}

  async create(customerId: string, optionId: string, key: string) {
    if (!key || key.length < 8 || key.length > 128) throw new BadRequestException('Header Idempotency-Key wajib 8–128 karakter');
    await this.payments.expirePendingPackages(customerId);
    return this.db.transaction(async (client) => {
      await client.query('SELECT id FROM app_users WHERE id=$1 FOR UPDATE', [customerId]);
      const prior = await client.query<Purchase>(`SELECT * FROM package_purchases WHERE customer_id=$1 AND idempotency_key=$2`, [customerId,key]);
      if (prior.rows[0]) {
        if (prior.rows[0].package_option_id !== optionId) throw new ConflictException('Idempotency-Key sudah dipakai untuk pilihan paket lain');
        return this.details(client, prior.rows[0]);
      }
      const pending = await client.query('SELECT 1 FROM package_purchases WHERE customer_id=$1 AND status=$2', [customerId,'pending_payment']);
      if (pending.rowCount) throw new ConflictException('Selesaikan atau periksa pembayaran paket yang masih menunggu');
      await membershipStart(client, customerId);
      const option = await client.query<{ id: string; duration_months: number; price_idr: number }>('SELECT id,duration_months,price_idr FROM package_options WHERE id=$1 AND active=true', [optionId]);
      if (!option.rows[0]) throw new BadRequestException('Pilihan paket tidak tersedia');
      const o = option.rows[0];
      const purchase = await client.query<Purchase>(`INSERT INTO package_purchases (customer_id,package_option_id,amount_idr,duration_months,status,idempotency_key,expires_at) VALUES ($1,$2,$3,$4,$5,$6,CASE WHEN $5='pending_payment' THEN now()+($7::int * interval '1 minute') ELSE NULL END) RETURNING *`, [customerId,o.id,o.price_idr,o.duration_months,o.price_idr === 0 ? 'paid' : 'pending_payment',key,PACKAGE_CHECKOUT_MINUTES]);
      const p = purchase.rows[0];
      if (o.price_idr === 0) await activatePurchase(client,p);
      else await this.payments.createSnapForPackage(client,p.id,o.price_idr);
      return this.details(client,p);
    });
  }

  async list(customerId: string) {
    const found = await this.db.query<Purchase>('SELECT * FROM package_purchases WHERE customer_id=$1 ORDER BY created_at DESC LIMIT 100', [customerId]);
    return Promise.all(found.rows.map(p => this.details(this.db.pool,p)));
  }

  async one(customerId: string, id: string) {
    const found = await this.db.query<Purchase>('SELECT * FROM package_purchases WHERE id=$1 AND customer_id=$2', [id,customerId]);
    if (!found.rows[0]) throw new BadRequestException('Pembelian paket tidak ditemukan');
    return this.details(this.db.pool,found.rows[0]);
  }

  private async details(client: Pick<PoolClient,'query'>, purchase: Purchase) {
    const payment = await client.query<{ order_id: string; redirect_url: string; status: string }>('SELECT order_id,redirect_url,status FROM payment_transactions WHERE package_purchase_id=$1', [purchase.id]);
    const membership = await client.query<{ starts_on: string; ends_on: string }>('SELECT starts_on::text,ends_on::text FROM memberships WHERE purchase_id=$1', [purchase.id]);
    return { id: purchase.id, packageOptionId: purchase.package_option_id, durationMonths: purchase.duration_months, amountIdr: purchase.amount_idr, status: membership.rows[0] ? 'paid' : purchase.status, startsOn: membership.rows[0]?.starts_on ?? null, endsOn: membership.rows[0]?.ends_on ?? null, expiresAt: purchase.expires_at, payment: payment.rows[0] ? { orderId: payment.rows[0].order_id, redirectUrl: payment.rows[0].redirect_url, status: payment.rows[0].status } : null };
  }
}

@ApiTags('membership-purchases') @ApiCookieAuth('wellness.sid') @UseGuards(SessionGuard)
@Controller('me/membership-purchases')
export class MembershipPurchasesController {
  constructor(private readonly service: MembershipPurchasesService, private readonly payments: PaymentsService) {}
  @Post() @ApiHeader({ name: 'Idempotency-Key', required: true })
  @ApiCreatedResponse({ description: 'Paket gratis langsung aktif; paket berbayar menunggu Midtrans Sandbox selama 15 menit.', schema: { example: { id: '2f4db4a9-7554-4c8e-a659-e24c49554a8f', durationMonths: 1, amountIdr: 450000, status: 'pending_payment', startsOn: null, endsOn: null, expiresAt: '2026-09-25T05:15:00.000Z', payment: { orderId: 'PKG-2f4db4a9-7554-4c8e-a659-e24c49554a8f', redirectUrl: 'https://app.sandbox.midtrans.com/snap/v2/vtweb/token' } } } })
  async create(@Req() req: AuthRequest, @Body() body: PurchaseDto, @Headers('idempotency-key') key: string) {
    return this.service.create(assertRole(req,'customer').id,body.packageOptionId,key);
  }
  @Get()
  async list(@Req() req: AuthRequest) { return this.service.list(assertRole(req,'customer').id); }
  @Get(':id')
  async one(@Req() req: AuthRequest, @Param('id') id: string) { return this.service.one(assertRole(req,'customer').id,id); }
  @Post(':id/refresh-payment')
  async refresh(@Req() req: AuthRequest, @Param('id') id: string) { return this.payments.refreshByPackage(id,assertRole(req,'customer').id); }
}
