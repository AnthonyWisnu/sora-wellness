import { Body, Controller, Get, NotFoundException, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ApiCookieAuth, ApiProperty, ApiTags } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, Length, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { Db } from '../shared/db';
import { MidtransNotification } from './midtrans';
import { PaymentsService } from './payments';
import { AuthRequest, assertRole, SessionGuard } from '../shared/security';

export class SyncOrderDto {
  @ApiProperty({ example: 'CLS-cc6135a4-9915-4af8-8231-33cfbbf97d55' })
  @IsString()
  @Length(6, 80)
  orderId!: string;
}

class PageFilter {
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100) limit?: number;
}

@ApiTags('payments')
@Controller()
export class PaymentsController {
  constructor(private readonly db: Db, private readonly payments: PaymentsService) {}

  @Post('webhooks/midtrans')
  async webhook(@Body() notification: MidtransNotification) {
    await this.payments.processNotification(notification);
    return { received: true };
  }

  @Post('bookings/:id/refresh-payment') @UseGuards(SessionGuard) @ApiCookieAuth('wellness.sid')
  async refresh(@Req() req: AuthRequest, @Param('id') id: string) {
    const actor = assertRole(req, 'customer');
    return this.payments.refreshByBooking(id, actor.id);
  }

  @Post('me/payments/sync-order') @UseGuards(SessionGuard) @ApiCookieAuth('wellness.sid')
  async syncOrder(@Req() req: AuthRequest, @Body() body: SyncOrderDto) {
    const actor = assertRole(req, 'customer');
    const order = await this.db.query<{ id: string }>(
      `SELECT p.id FROM payment_transactions p
       LEFT JOIN bookings b ON b.id = p.booking_id
       LEFT JOIN package_purchases pp ON pp.id = p.package_purchase_id
       WHERE p.order_id = $1 AND COALESCE(b.customer_id, pp.customer_id) = $2`,
      [body.orderId, actor.id],
    );
    if (!order.rows[0]) throw new NotFoundException('Pesanan pembayaran tidak ditemukan atau bukan milik akun Anda');
    return this.payments.refreshByOrder(body.orderId);
  }

  @Get('me/wallet') @UseGuards(SessionGuard) @ApiCookieAuth('wellness.sid')
  async wallet(@Req() req: AuthRequest) {
    const actor = assertRole(req, 'customer');
    await this.payments.expirePending(actor.id);
    const found = await this.db.query<{ balance_idr: string }>('SELECT balance_idr FROM wallet_accounts WHERE customer_id=$1', [actor.id]);
    return { balanceIdr: Number(found.rows[0].balance_idr) };
  }

  @Get('me/wallet/entries') @UseGuards(SessionGuard) @ApiCookieAuth('wellness.sid')
  async walletEntries(@Req() req: AuthRequest, @Query() filter: PageFilter) {
    const actor = assertRole(req, 'customer');
    return (await this.db.query(`SELECT id,booking_id AS "bookingId",amount_idr AS "amountIdr",balance_after_idr AS "balanceAfterIdr",kind,reference,created_at AS "createdAt" FROM wallet_entries WHERE customer_id=$1 ORDER BY id DESC LIMIT $2 OFFSET $3`, [actor.id,filter.limit ?? 20,((filter.page ?? 1)-1)*(filter.limit ?? 20)])).rows;
  }

  @Get('me/payments') @UseGuards(SessionGuard) @ApiCookieAuth('wellness.sid')
  async history(@Req() req: AuthRequest, @Query() filter: PageFilter) {
    const actor = assertRole(req, 'customer');
    await this.payments.expirePending(actor.id);
    return (await this.db.query(`SELECT p.id,p.order_id AS "orderId",p.gross_amount_idr AS "grossAmountIdr",p.status,p.provider_status AS "providerStatus",p.created_at AS "createdAt",p.updated_at AS "updatedAt",p.booking_id AS "bookingId",p.package_purchase_id AS "packagePurchaseId",CASE WHEN p.status='pending' THEN p.redirect_url ELSE NULL END AS "redirectUrl" FROM payment_transactions p LEFT JOIN bookings b ON b.id=p.booking_id LEFT JOIN package_purchases pp ON pp.id=p.package_purchase_id WHERE COALESCE(b.customer_id,pp.customer_id)=$1 ORDER BY p.created_at DESC LIMIT $2 OFFSET $3`, [actor.id,filter.limit ?? 20,((filter.page ?? 1)-1)*(filter.limit ?? 20)])).rows;
  }
}
