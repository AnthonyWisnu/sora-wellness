import {
  BadRequestException,
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common'
import { ApiCookieAuth, ApiProperty, ApiPropertyOptional, ApiTags } from '@nestjs/swagger'
import { IsIn, IsInt, IsOptional, IsString, Length, Max, Min } from 'class-validator'
import { Db } from '../shared/db'
import { AuthRequest, assertRole, SessionGuard } from '../shared/security'

export class CreateWithdrawalDto {
  @ApiProperty({ example: 50000, minimum: 10000 })
  @IsInt()
  @Min(10000)
  @Max(100000000)
  amountIdr!: number

  @ApiProperty({ enum: ['bank', 'ewallet'] })
  @IsIn(['bank', 'ewallet'])
  destinationType!: 'bank' | 'ewallet'

  @ApiProperty({ example: 'BCA' })
  @IsString()
  @Length(2, 30)
  providerCode!: string

  @ApiProperty({ example: '1234567890' })
  @IsString()
  @Length(4, 50)
  accountNumber!: string

  @ApiProperty({ example: 'Ayu Lestari' })
  @IsString()
  @Length(2, 100)
  accountName!: string
}

export class CompleteWithdrawalDto {
  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsString()
  transferProofMediaId?: string

  @ApiPropertyOptional({ example: 'TRX-BCA-987654' })
  @IsOptional()
  @IsString()
  @Length(1, 200)
  transferRefNote?: string
}

export class RejectWithdrawalDto {
  @ApiProperty({ example: 'Nomor rekening tidak terdaftar atau nama tidak cocok' })
  @IsString()
  @Length(3, 300)
  reason!: string
}

@ApiTags('customer wallet withdrawals')
@ApiCookieAuth('wellness.sid')
@UseGuards(SessionGuard)
@Controller('me/wallet')
export class CustomerWithdrawalController {
  constructor(private readonly db: Db) {}

  @Post('withdraw')
  async request(@Req() req: AuthRequest, @Body() body: CreateWithdrawalDto) {
    const actor = assertRole(req, 'customer')
    return this.db.transaction(async (client) => {
      const wallet = await client.query<{ balance_idr: string }>(
        'SELECT balance_idr FROM wallet_accounts WHERE customer_id=$1 FOR UPDATE',
        [actor.id],
      )
      const currentBalance = Number(wallet.rows[0]?.balance_idr ?? 0)
      if (currentBalance < body.amountIdr) {
        throw new BadRequestException('Saldo tidak mencukupi untuk penarikan ini')
      }

      const pendingCheck = await client.query(
        "SELECT 1 FROM wallet_withdrawals WHERE customer_id=$1 AND status='pending'",
        [actor.id],
      )
      if (pendingCheck.rowCount && pendingCheck.rowCount > 0) {
        throw new BadRequestException('Anda memiliki permohonan penarikan dana yang masih menunggu verifikasi')
      }

      const withdrawal = await client.query<{ id: string }>(
        `INSERT INTO wallet_withdrawals
         (customer_id, amount_idr, destination_type, provider_code, account_number, account_name, status)
         VALUES ($1, $2, $3, $4, $5, $6, 'pending')
         RETURNING id`,
        [
          actor.id,
          body.amountIdr,
          body.destinationType,
          body.providerCode.toUpperCase().trim(),
          body.accountNumber.trim(),
          body.accountName.trim(),
        ],
      )

      const withdrawalId = withdrawal.rows[0].id
      const newBalance = currentBalance - body.amountIdr
      await client.query(
        'UPDATE wallet_accounts SET balance_idr=$1, updated_at=now() WHERE customer_id=$2',
        [newBalance, actor.id],
      )

      await client.query(
        `INSERT INTO wallet_entries
         (customer_id, amount_idr, balance_after_idr, kind, reference)
         VALUES ($1, $2, $3, 'payout_withdrawal', $4)`,
        [actor.id, -body.amountIdr, newBalance, `withdrawal:${withdrawalId}`],
      )

      return {
        id: withdrawalId,
        amountIdr: body.amountIdr,
        destinationType: body.destinationType,
        providerCode: body.providerCode.toUpperCase().trim(),
        accountNumber: body.accountNumber.trim(),
        accountName: body.accountName.trim(),
        status: 'pending',
      }
    })
  }

  @Get('withdrawals')
  async list(@Req() req: AuthRequest) {
    const actor = assertRole(req, 'customer')
    const rows = await this.db.query(
      `SELECT id, amount_idr AS "amountIdr", destination_type AS "destinationType",
              provider_code AS "providerCode", account_number AS "accountNumber",
              account_name AS "accountName", status, rejected_reason AS "rejectedReason",
              transfer_ref_note AS "transferRefNote", created_at AS "createdAt",
              updated_at AS "updatedAt"
       FROM wallet_withdrawals
       WHERE customer_id=$1
       ORDER BY created_at DESC LIMIT 50`,
      [actor.id],
    )
    return rows.rows
  }
}

@ApiTags('admin finance withdrawals')
@ApiCookieAuth('wellness.sid')
@UseGuards(SessionGuard)
@Controller('admin/finance')
export class AdminWithdrawalController {
  constructor(private readonly db: Db) {}

  @Get('withdrawals')
  async list(@Req() req: AuthRequest, @Query('status') status?: string) {
    assertRole(req, 'finance', 'superadmin')
    const values = [status ?? null]
    const rows = await this.db.query(
      `SELECT w.id, w.customer_id AS "customerId", u.full_name AS "customerName",
              u.email AS "customerEmail", w.amount_idr AS "amountIdr",
              w.destination_type AS "destinationType", w.provider_code AS "providerCode",
              w.account_number AS "accountNumber", w.account_name AS "accountName",
              w.status, w.transfer_ref_note AS "transferRefNote",
              w.rejected_reason AS "rejectedReason", w.created_at AS "createdAt",
              w.reviewed_at AS "reviewedAt",
              m.id AS "proofMediaId",
              CASE WHEN m.id IS NOT NULL THEN '/api/v1/public/media/' || m.id ELSE NULL END AS "proofUrl"
       FROM wallet_withdrawals w
       JOIN app_users u ON u.id = w.customer_id
       LEFT JOIN media_assets m ON m.id = w.transfer_proof_media_id
       WHERE ($1::text IS NULL OR w.status = $1)
       ORDER BY CASE WHEN w.status = 'pending' THEN 0 ELSE 1 END, w.created_at DESC
       LIMIT 100`,
      values,
    )
    return rows.rows
  }

  @Post('withdrawals/:id/complete')
  async complete(
    @Req() req: AuthRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: CompleteWithdrawalDto,
  ) {
    const reviewer = assertRole(req, 'finance', 'superadmin')
    return this.db.transaction(async (client) => {
      const probe = await client.query<{ status: string; customer_id: string }>(
        'SELECT status, customer_id FROM wallet_withdrawals WHERE id=$1 FOR UPDATE',
        [id],
      )
      if (!probe.rows[0]) throw new NotFoundException('Data penarikan dana tidak ditemukan')
      if (probe.rows[0].status !== 'pending') {
        throw new BadRequestException('Status penarikan sudah bukan pending')
      }

      await client.query(
        `UPDATE wallet_withdrawals
         SET status='completed', transfer_proof_media_id=$1, transfer_ref_note=$2,
             reviewed_by=$3, reviewed_at=now(), updated_at=now()
         WHERE id=$4`,
        [body.transferProofMediaId ?? null, body.transferRefNote?.trim() ?? null, reviewer.id, id],
      )

      return { ok: true, status: 'completed' }
    })
  }

  @Post('withdrawals/:id/reject')
  async reject(
    @Req() req: AuthRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: RejectWithdrawalDto,
  ) {
    const reviewer = assertRole(req, 'finance', 'superadmin')
    return this.db.transaction(async (client) => {
      const probe = await client.query<{ status: string; customer_id: string; amount_idr: number }>(
        'SELECT status, customer_id, amount_idr FROM wallet_withdrawals WHERE id=$1 FOR UPDATE',
        [id],
      )
      if (!probe.rows[0]) throw new NotFoundException('Data penarikan dana tidak ditemukan')
      if (probe.rows[0].status !== 'pending') {
        throw new BadRequestException('Status penarikan sudah bukan pending')
      }

      const { customer_id: customerId, amount_idr: amountIdr } = probe.rows[0]

      const wallet = await client.query<{ balance_idr: string }>(
        'SELECT balance_idr FROM wallet_accounts WHERE customer_id=$1 FOR UPDATE',
        [customerId],
      )
      const currentBalance = Number(wallet.rows[0]?.balance_idr ?? 0)
      const restoredBalance = currentBalance + amountIdr

      await client.query(
        'UPDATE wallet_accounts SET balance_idr=$1, updated_at=now() WHERE customer_id=$2',
        [restoredBalance, customerId],
      )

      await client.query(
        `INSERT INTO wallet_entries
         (customer_id, amount_idr, balance_after_idr, kind, reference)
         VALUES ($1, $2, $3, 'payout_refund', $4)`,
        [customerId, amountIdr, restoredBalance, `withdrawal:${id}:reject`],
      )

      await client.query(
        `UPDATE wallet_withdrawals
         SET status='rejected', rejected_reason=$1, reviewed_by=$2, reviewed_at=now(), updated_at=now()
         WHERE id=$3`,
        [body.reason.trim(), reviewer.id, id],
      )

      return { ok: true, status: 'rejected' }
    })
  }
}
