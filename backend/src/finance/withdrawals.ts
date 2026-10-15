import { randomUUID } from 'node:crypto'
import { mkdir, readFile, unlink, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
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
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common'
import { FileInterceptor } from '@nestjs/platform-express'
import { ApiConsumes, ApiCookieAuth, ApiProperty, ApiPropertyOptional, ApiTags } from '@nestjs/swagger'
import { IsIn, IsInt, IsOptional, IsString, Length, Max, Min } from 'class-validator'
import type { Response } from 'express'
import { Db } from '../shared/db'
import { AuthRequest, assertPermission, assertRole, SessionGuard } from '../shared/security'
import { imageType, maxBytes, mediaDirectory, type Upload } from '../content/content'

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
              transfer_ref_note AS "transferRefNote",
              (transfer_proof_media_id IS NOT NULL) AS "hasProof",
              CASE WHEN transfer_proof_media_id IS NOT NULL THEN '/api/v1/me/wallet/withdrawals/' || id || '/proof' ELSE NULL END AS "proofUrl",
              created_at AS "createdAt",
              updated_at AS "updatedAt"
       FROM wallet_withdrawals
       WHERE customer_id=$1
       ORDER BY created_at DESC LIMIT 50`,
      [actor.id],
    )
    return rows.rows
  }

  @Get('withdrawals/:id/proof')
  async proof(
    @Req() req: AuthRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Res() response: Response,
  ) {
    const actor = assertRole(req, 'customer')
    const found = await this.db.query<{ storage_path: string; mime_type: string }>(
      `SELECT m.storage_path, m.mime_type
       FROM wallet_withdrawals w
       JOIN media_assets m ON m.id = w.transfer_proof_media_id
       WHERE w.id = $1 AND w.customer_id = $2`,
      [id, actor.id],
    )
    if (!found.rows[0]) throw new NotFoundException('Bukti transfer tidak ditemukan')
    try {
      const bytes = await readFile(resolve(mediaDirectory, found.rows[0].storage_path))
      response.setHeader('Content-Type', found.rows[0].mime_type)
      response.setHeader('Cache-Control', 'private, no-store')
      response.send(bytes)
    } catch (error) {
      if ((error as { code?: string }).code === 'ENOENT') {
        throw new NotFoundException('Berkas bukti transfer fisik tidak ditemukan')
      }
      throw error
    }
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
              CASE WHEN m.id IS NOT NULL THEN '/api/v1/admin/finance/withdrawals/' || w.id || '/proof' ELSE NULL END AS "proofUrl"
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
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('proof', { limits: { fileSize: maxBytes, files: 1 } }))
  async complete(
    @Req() req: AuthRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: CompleteWithdrawalDto,
    @UploadedFile() file?: Upload,
  ) {
    const reviewer = assertPermission(req, 'finance_payouts')
    const refNote = body.transferRefNote?.trim() || null

    if (!refNote && !file) {
      throw new BadRequestException('Harap sertakan nomor referensi transfer atau unggah bukti transfer.')
    }

    let mediaId: string | null = null
    let writtenFilePath: string | null = null

    if (file) {
      if (file.size < 1 || file.size > maxBytes) {
        throw new BadRequestException('Berkas bukti transfer maksimal 5 MB')
      }
      const detected = imageType(file)
      if (!detected) {
        throw new BadRequestException('Hanya berkas gambar JPG, PNG, atau WebP yang valid sebagai bukti transfer')
      }
      mediaId = randomUUID()
      const storagePath = `${mediaId}.${detected.extension}`
      const fullPath = resolve(mediaDirectory, storagePath)
      await mkdir(mediaDirectory, { recursive: true })
      await writeFile(fullPath, file.buffer)
      writtenFilePath = fullPath

      try {
        await this.db.query(
          `INSERT INTO media_assets (id, filename, mime_type, byte_size, storage_path, purpose, uploaded_by)
           VALUES ($1, $2, $3, $4, $5, 'withdrawal_proof', $6)`,
          [
            mediaId,
            file.originalname.replace(/[\\/]/g, '_').slice(0, 255) || storagePath,
            detected.mime,
            file.size,
            storagePath,
            reviewer.id,
          ],
        )
      } catch (err) {
        if (writtenFilePath) await unlink(writtenFilePath).catch(() => null)
        throw err
      }
    }

    try {
      return await this.db.transaction(async (client) => {
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
          [mediaId, refNote, reviewer.id, id],
        )

        return { ok: true, status: 'completed' }
      })
    } catch (err) {
      if (writtenFilePath) await unlink(writtenFilePath).catch(() => null)
      throw err
    }
  }

  @Post('withdrawals/:id/reject')
  async reject(
    @Req() req: AuthRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: RejectWithdrawalDto,
  ) {
    const reviewer = assertPermission(req, 'finance_payouts')
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

  @Get('withdrawals/:id/proof')
  async proof(
    @Req() req: AuthRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Res() response: Response,
  ) {
    assertPermission(req, 'finance_payouts')
    const found = await this.db.query<{ storage_path: string; mime_type: string }>(
      `SELECT m.storage_path, m.mime_type
       FROM wallet_withdrawals w
       JOIN media_assets m ON m.id = w.transfer_proof_media_id
       WHERE w.id = $1`,
      [id],
    )
    if (!found.rows[0]) throw new NotFoundException('Bukti transfer tidak ditemukan')
    try {
      const bytes = await readFile(resolve(mediaDirectory, found.rows[0].storage_path))
      response.setHeader('Content-Type', found.rows[0].mime_type)
      response.setHeader('Cache-Control', 'private, no-store')
      response.send(bytes)
    } catch (error) {
      if ((error as { code?: string }).code === 'ENOENT') {
        throw new NotFoundException('Berkas bukti transfer fisik tidak ditemukan')
      }
      throw error
    }
  }
}
