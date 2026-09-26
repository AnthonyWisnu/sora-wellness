import { Body, Controller, Get, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ApiCookieAuth, ApiTags } from '@nestjs/swagger';
import { IsInt, IsOptional, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { Db } from '../shared/db';
import { MidtransNotification } from './midtrans';
import { PaymentsService } from './payments';
import { AuthRequest, assertRole, SessionGuard } from '../shared/security';

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
    return (await this.db.query(`SELECT p.id,p.order_id AS "orderId",p.gross_amount_idr AS "grossAmountIdr",p.status,p.provider_status AS "providerStatus",p.created_at AS "createdAt",p.updated_at AS "updatedAt",p.booking_id AS "bookingId",p.package_purchase_id AS "packagePurchaseId" FROM payment_transactions p LEFT JOIN bookings b ON b.id=p.booking_id LEFT JOIN package_purchases pp ON pp.id=p.package_purchase_id WHERE COALESCE(b.customer_id,pp.customer_id)=$1 ORDER BY p.created_at DESC LIMIT $2 OFFSET $3`, [actor.id,filter.limit ?? 20,((filter.page ?? 1)-1)*(filter.limit ?? 20)])).rows;
  }
}
