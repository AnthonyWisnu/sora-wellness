import { BadRequestException, Controller, Get, NotFoundException, Param, ParseUUIDPipe, Query, Req, Res, UseGuards } from '@nestjs/common';
import { ApiCookieAuth, ApiOkResponse, ApiPropertyOptional, ApiTags } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDateString, IsIn, IsInt, IsOptional, IsString, Matches, Max, MaxLength, Min } from 'class-validator';
import type { Response } from 'express';
import { Db } from '../shared/db';
import { AuthRequest, assertRole, SessionGuard } from '../shared/security';

class PageFilter {
  @ApiPropertyOptional({ example: 1 }) @IsOptional() @Type(() => Number) @IsInt() @Min(1) page?: number;
  @ApiPropertyOptional({ example: 20 }) @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100) limit?: number;
  @ApiPropertyOptional({ example: 'ayu' }) @IsOptional() @IsString() @MaxLength(100) q?: string;
}
class DatedFilter extends PageFilter {
  @ApiPropertyOptional({ format: 'date', example: '2026-09-01' }) @IsOptional() @IsDateString() @Matches(/^\d{4}-\d{2}-\d{2}$/) from?: string;
  @ApiPropertyOptional({ format: 'date', example: '2026-09-30' }) @IsOptional() @IsDateString() @Matches(/^\d{4}-\d{2}-\d{2}$/) to?: string;
}
class BookingFilter extends DatedFilter {
  @ApiPropertyOptional({ enum: ['pending_payment','confirmed','cancelled','expired'] })
  @IsOptional() @IsIn(['pending_payment','confirmed','cancelled','expired']) status?: string;
}
class PaymentFilter extends DatedFilter {
  @ApiPropertyOptional({ enum: ['pending','success','failed','expired'] })
  @IsOptional() @IsIn(['pending','success','failed','expired']) status?: string;
  @ApiPropertyOptional({ enum: ['class','package'] })
  @IsOptional() @IsIn(['class','package']) kind?: string;
}
class LedgerFilter extends DatedFilter {
  @ApiPropertyOptional({ enum: ['class_refund','late_payment','class_purchase','reservation_release','correction'] })
  @IsOptional() @IsIn(['class_refund','late_payment','class_purchase','reservation_release','correction']) kind?: string;
}

function pageOf(filter: PageFilter) { return { page: filter.page ?? 1, limit: filter.limit ?? 20 }; }
function datesOf(filter: DatedFilter) {
  if (filter.from && filter.to && filter.from > filter.to) throw new BadRequestException('Tanggal awal tidak boleh setelah tanggal akhir');
  return [filter.from ?? null,filter.to ?? null];
}

@ApiTags('admin finance') @ApiCookieAuth('wellness.sid') @UseGuards(SessionGuard)
@Controller('admin')
export class AdminFinanceController {
  constructor(private readonly db: Db) {}

  @Get('bookings')
  @ApiOkResponse({ description: 'Daftar booking terfilter dan dipaginasi tanpa data kesehatan.', schema: { example: { items: [{ id: 'booking-uuid', customerName: 'Ayu', title: 'Gentle Flow', status: 'confirmed', priceIdr: 75000 }], page: 1, limit: 20, total: 1 } } })
  async bookings(@Req() req: AuthRequest, @Query() filter: BookingFilter) {
    assertRole(req, 'admin');
    const { page,limit } = pageOf(filter);
    const [from,to] = datesOf(filter);
    const values = [filter.q?.trim() || null,filter.status ?? null,from,to];
    const where = `FROM bookings b JOIN app_users u ON u.id=b.customer_id
      JOIN class_sessions s ON s.id=b.session_id JOIN class_types t ON t.id=s.class_type_id
      LEFT JOIN payment_transactions p ON p.booking_id=b.id
      WHERE ($1::text IS NULL OR u.full_name ILIKE '%'||$1||'%' OR u.email::text ILIKE '%'||$1||'%')
        AND ($2::text IS NULL OR b.status=$2) AND ($3::date IS NULL OR s.local_date >= $3::date)
        AND ($4::date IS NULL OR s.local_date <= $4::date)`;
    const [total,rows] = await Promise.all([
      this.db.query<{ count: number }>(`SELECT count(*)::int AS count ${where}`,values),
      this.db.query(`SELECT b.id,b.customer_id AS "customerId",u.full_name AS "customerName",u.email AS "customerEmail",
        b.status,b.source,b.price_idr AS "priceIdr",b.wallet_reserved_idr AS "walletReservedIdr",
        b.gateway_due_idr AS "gatewayDueIdr",b.hold_expires_at AS "holdExpiresAt",b.created_at AS "createdAt",
        b.cancelled_at AS "cancelledAt",b.cancellation_origin AS "cancellationOrigin",b.quota_retained AS "quotaRetained",
        s.id AS "sessionId",s.local_date::text AS "localDate",s.starts_at AS "startsAt",t.title,
        p.status AS "paymentStatus",p.order_id AS "orderId" ${where}
        ORDER BY b.created_at DESC,b.id DESC LIMIT $5 OFFSET $6`,[...values,limit,(page-1)*limit]),
    ]);
    return { items: rows.rows,page,limit,total: total.rows[0].count };
  }

  @Get('payments')
  @ApiOkResponse({ description: 'Pembayaran kelas dan paket tanpa token Snap atau kredensial gateway.' })
  async payments(@Req() req: AuthRequest, @Query() filter: PaymentFilter) {
    assertRole(req, 'admin');
    const { page,limit } = pageOf(filter);
    const [from,to] = datesOf(filter);
    const values = [filter.q?.trim() || null,filter.status ?? null,filter.kind ?? null,from,to];
    const where = `FROM payment_transactions p LEFT JOIN bookings b ON b.id=p.booking_id
      LEFT JOIN class_sessions s ON s.id=b.session_id LEFT JOIN class_types t ON t.id=s.class_type_id
      LEFT JOIN package_purchases pp ON pp.id=p.package_purchase_id
      LEFT JOIN package_options po ON po.id=pp.package_option_id
      JOIN app_users u ON u.id=COALESCE(b.customer_id,pp.customer_id)
      CROSS JOIN studio st WHERE st.id=1
        AND ($1::text IS NULL OR u.full_name ILIKE '%'||$1||'%' OR u.email::text ILIKE '%'||$1||'%' OR p.order_id ILIKE '%'||$1||'%')
        AND ($2::text IS NULL OR p.status=$2)
        AND ($3::text IS NULL OR ($3='class' AND p.booking_id IS NOT NULL) OR ($3='package' AND p.package_purchase_id IS NOT NULL))
        AND ($4::date IS NULL OR (p.created_at AT TIME ZONE st.timezone)::date >= $4::date)
        AND ($5::date IS NULL OR (p.created_at AT TIME ZONE st.timezone)::date <= $5::date)`;
    const [total,rows] = await Promise.all([
      this.db.query<{ count: number }>(`SELECT count(*)::int AS count ${where}`,values),
      this.db.query(`SELECT p.id,p.order_id AS "orderId",p.gross_amount_idr AS "grossAmountIdr",p.status,
        p.provider_status AS "providerStatus",p.created_at AS "createdAt",p.updated_at AS "updatedAt",
        p.booking_id AS "bookingId",p.package_purchase_id AS "packagePurchaseId",
        CASE WHEN p.booking_id IS NOT NULL THEN 'class' ELSE 'package' END AS kind,
        u.id AS "customerId",u.full_name AS "customerName",u.email AS "customerEmail",
        t.title AS "classTitle",s.local_date::text AS "localDate",pp.amount_idr AS "packageAmountIdr",
        COALESCE(pp.duration_months,po.duration_months) AS "durationMonths" ${where}
        ORDER BY p.created_at DESC,p.id DESC LIMIT $6 OFFSET $7`,[...values,limit,(page-1)*limit]),
    ]);
    return { items: rows.rows,page,limit,total: total.rows[0].count };
  }

  @Get('payments/export')
  async exportPayments(
    @Req() req: AuthRequest,
    @Query() filter: PaymentFilter,
    @Res() res: Response,
  ) {
    assertRole(req, 'admin');
    const [from, to] = datesOf(filter);
    const values = [filter.q?.trim() || null, filter.status ?? null, filter.kind ?? null, from, to];
    const where = `FROM payment_transactions p LEFT JOIN bookings b ON b.id=p.booking_id
      LEFT JOIN class_sessions s ON s.id=b.session_id LEFT JOIN class_types t ON t.id=s.class_type_id
      LEFT JOIN package_purchases pp ON pp.id=p.package_purchase_id
      LEFT JOIN package_options po ON po.id=pp.package_option_id
      JOIN app_users u ON u.id=COALESCE(b.customer_id,pp.customer_id)
      CROSS JOIN studio st WHERE st.id=1
        AND ($1::text IS NULL OR u.full_name ILIKE '%'||$1||'%' OR u.email::text ILIKE '%'||$1||'%' OR p.order_id ILIKE '%'||$1||'%')
        AND ($2::text IS NULL OR p.status=$2)
        AND ($3::text IS NULL OR ($3='class' AND p.booking_id IS NOT NULL) OR ($3='package' AND p.package_purchase_id IS NOT NULL))
        AND ($4::date IS NULL OR (p.created_at AT TIME ZONE st.timezone)::date >= $4::date)
        AND ($5::date IS NULL OR (p.created_at AT TIME ZONE st.timezone)::date <= $5::date)`;

    const rows = await this.db.query<{
      orderId: string;
      grossAmountIdr: number;
      status: string;
      createdAt: Date;
      kind: string;
      customerName: string;
      customerEmail: string;
      itemName: string;
    }>(
      `SELECT p.order_id AS "orderId", p.gross_amount_idr AS "grossAmountIdr", p.status,
              p.created_at AS "createdAt",
              CASE WHEN p.booking_id IS NOT NULL THEN 'Kelas' ELSE 'Paket Membership' END AS kind,
              u.full_name AS "customerName", u.email AS "customerEmail",
              COALESCE(t.title, 'Membership ' || COALESCE(pp.duration_months, po.duration_months) || ' Bulan') AS "itemName"
       ${where}
       ORDER BY p.created_at DESC, p.id DESC LIMIT 5000`,
      values,
    );

    const escapeCsv = (str: string | number | null | undefined) => {
      const s = String(str ?? '');
      return `"${s.replace(/"/g, '""')}"`;
    };

    const header = [
      'Order ID',
      'Waktu Transaksi',
      'Kategori',
      'Nama Item / Kelas',
      'Nama Pelanggan',
      'Email Pelanggan',
      'Nominal Kotor (IDR)',
      'Estimasi Biaya Gateway (IDR)',
      'Nominal Bersih (IDR)',
      'Status Pembayaran',
    ].join(',');

    const lines = rows.rows.map((r) => {
      const gross = Number(r.grossAmountIdr) || 0;
      const fee = r.status === 'success' ? Math.round(gross * 0.02) : 0;
      const net = gross - fee;
      const timeStr = new Date(r.createdAt).toISOString().replace('T', ' ').slice(0, 19);
      return [
        escapeCsv(r.orderId),
        escapeCsv(timeStr),
        escapeCsv(r.kind),
        escapeCsv(r.itemName),
        escapeCsv(r.customerName),
        escapeCsv(r.customerEmail),
        gross,
        fee,
        net,
        escapeCsv(r.status),
      ].join(',');
    });

    const csvContent = '\ufeff' + [header, ...lines].join('\r\n');
    const dateTag = new Date().toISOString().slice(0, 10);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="sora-laporan-keuangan-${dateTag}.csv"`);
    res.send(csvContent);
  }

  @Get('wallets')
  @ApiOkResponse({ description: 'Saldo kelas per pelanggan; nominal IDR dikirim sebagai angka.' })
  async wallets(@Req() req: AuthRequest, @Query() filter: PageFilter) {
    assertRole(req, 'admin');
    const { page,limit } = pageOf(filter);
    const q = filter.q?.trim() || null;
    const where = `FROM wallet_accounts w JOIN app_users u ON u.id=w.customer_id
      WHERE ($1::text IS NULL OR u.full_name ILIKE '%'||$1||'%' OR u.email::text ILIKE '%'||$1||'%')`;
    const [total,rows] = await Promise.all([
      this.db.query<{ count: number }>(`SELECT count(*)::int AS count ${where}`,[q]),
      this.db.query<{ customerId: string; customerName: string; customerEmail: string; balanceIdr: string; updatedAt: Date }>(`SELECT w.customer_id AS "customerId",u.full_name AS "customerName",u.email AS "customerEmail",
        w.balance_idr AS "balanceIdr",w.updated_at AS "updatedAt" ${where}
        ORDER BY w.balance_idr DESC,u.full_name,w.customer_id LIMIT $2 OFFSET $3`,[q,limit,(page-1)*limit]),
    ]);
    return { items: rows.rows.map(row => ({ ...row,balanceIdr: Number(row.balanceIdr) })),page,limit,total: total.rows[0].count };
  }

  @Get('wallets/:customerId/entries')
  @ApiOkResponse({ description: 'Buku saldo satu pelanggan, termasuk referensi dan saldo sesudah transaksi.' })
  async walletEntries(@Req() req: AuthRequest, @Param('customerId', ParseUUIDPipe) customerId: string, @Query() filter: LedgerFilter) {
    assertRole(req, 'admin');
    const { page,limit } = pageOf(filter);
    const [from,to] = datesOf(filter);
    const account = await this.db.query<{ customerId: string; customerName: string; customerEmail: string; balanceIdr: string }>(`SELECT w.customer_id AS "customerId",u.full_name AS "customerName",u.email AS "customerEmail",w.balance_idr AS "balanceIdr"
      FROM wallet_accounts w JOIN app_users u ON u.id=w.customer_id WHERE w.customer_id=$1`,[customerId]);
    if (!account.rows[0]) throw new NotFoundException('Akun saldo pelanggan tidak ditemukan');
    const values = [customerId,filter.kind ?? null,from,to];
    const where = `FROM wallet_entries e CROSS JOIN studio st WHERE st.id=1 AND e.customer_id=$1
      AND ($2::text IS NULL OR e.kind=$2)
      AND ($3::date IS NULL OR (e.created_at AT TIME ZONE st.timezone)::date >= $3::date)
      AND ($4::date IS NULL OR (e.created_at AT TIME ZONE st.timezone)::date <= $4::date)`;
    const [total,rows] = await Promise.all([
      this.db.query<{ count: number }>(`SELECT count(*)::int AS count ${where}`,values),
      this.db.query<{ id: string; bookingId: string | null; amountIdr: string; balanceAfterIdr: string; kind: string; reference: string; createdAt: Date }>(`SELECT e.id,e.booking_id AS "bookingId",e.amount_idr AS "amountIdr",e.balance_after_idr AS "balanceAfterIdr",
        e.kind,e.reference,e.created_at AS "createdAt" ${where} ORDER BY e.id DESC LIMIT $5 OFFSET $6`,[...values,limit,(page-1)*limit]),
    ]);
    return { customer: { ...account.rows[0],balanceIdr: Number(account.rows[0].balanceIdr) },
      items: rows.rows.map(row => ({ ...row,amountIdr: Number(row.amountIdr),balanceAfterIdr: Number(row.balanceAfterIdr) })),
      page,limit,total: total.rows[0].count };
  }
}
