import { randomUUID } from 'node:crypto';
import { mkdir, unlink, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { BadRequestException, Body, Controller, Delete, Get, Patch, Post, Req, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBody, ApiConsumes, ApiCookieAuth, ApiTags } from '@nestjs/swagger';
import { IsString, Length } from 'class-validator';
import { Db } from '../shared/db';
import { monthlyQuota, DateRange } from './quota';
import { AuthRequest, SessionGuard } from '../shared/security';
import { imageType, mediaDirectory, Upload } from '../content/content';

class ProfileDto { @IsString() @Length(2, 100) fullName!: string; }

@ApiTags('me') @ApiCookieAuth('wellness.sid') @UseGuards(SessionGuard)
@Controller('me')
export class MeController {
  constructor(private readonly db: Db) {}

  @Get()
  async profile(@Req() req: AuthRequest) {
    const actor = req.actor!;
    const avatarUrl = actor.avatar_media_id ? `/api/v1/public/media/${actor.avatar_media_id}` : null;
    return {
      id: actor.id,
      email: actor.email,
      fullName: actor.full_name,
      role: actor.role,
      permissions: actor.permissions ?? [],
      passwordChangeRequired: actor.password_change_required,
      avatarMediaId: actor.avatar_media_id ?? null,
      avatarUrl,
    };
  }

  @Patch()
  async edit(@Req() req: AuthRequest, @Body() body: ProfileDto) {
    await this.db.query('UPDATE app_users SET full_name=$1,updated_at=now() WHERE id=$2', [body.fullName.trim(), req.actor!.id]);
    return { fullName: body.fullName.trim() };
  }

  @Post('avatar')
  @ApiConsumes('multipart/form-data')
  @ApiBody({ schema: { type: 'object', properties: { file: { type: 'string', format: 'binary' } }, required: ['file'] } })
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 2 * 1024 * 1024, files: 1 } }))
  async uploadAvatar(@Req() req: AuthRequest, @UploadedFile() file?: Upload) {
    const actor = req.actor!;
    if (!file || file.size < 1 || file.size > 2 * 1024 * 1024) throw new BadRequestException('Foto profil wajib ada dan maksimal 2 MB');
    const detected = imageType(file);
    if (!detected) throw new BadRequestException('Hanya gambar JPG, PNG, atau WebP yang didukung');
    const id = randomUUID();
    const storagePath = `avatar-${id}.${detected.extension}`;
    const originalName = file.originalname.replace(/[\\/]/g, '_').slice(0, 255) || storagePath;
    await mkdir(mediaDirectory, { recursive: true });
    await writeFile(resolve(mediaDirectory, storagePath), file.buffer);
    try {
      await this.db.transaction(async (client) => {
        await client.query(
          'INSERT INTO media_assets (id, filename, mime_type, byte_size, storage_path, uploaded_by, purpose) VALUES ($1,$2,$3,$4,$5,$6,\'avatar\')',
          [id, originalName, detected.mime, file.size, storagePath, actor.id],
        );
        const oldAvatarId = actor.avatar_media_id;
        await client.query('UPDATE app_users SET avatar_media_id=$1, updated_at=now() WHERE id=$2', [id, actor.id]);
        if (oldAvatarId) {
          const oldMedia = await client.query<{ storage_path: string }>('SELECT storage_path FROM media_assets WHERE id=$1', [oldAvatarId]);
          await client.query('DELETE FROM media_assets WHERE id=$1', [oldAvatarId]);
          if (oldMedia.rows[0]) {
            await unlink(resolve(mediaDirectory, oldMedia.rows[0].storage_path)).catch(() => undefined);
          }
        }
      });
    } catch (error) {
      await unlink(resolve(mediaDirectory, storagePath)).catch(() => undefined);
      throw error;
    }
    actor.avatar_media_id = id;
    const avatarUrl = `/api/v1/public/media/${id}`;
    return { avatarMediaId: id, avatarUrl };
  }

  @Delete('avatar')
  async deleteAvatar(@Req() req: AuthRequest) {
    const actor = req.actor!;
    const oldAvatarId = actor.avatar_media_id;
    await this.db.transaction(async (client) => {
      await client.query('UPDATE app_users SET avatar_media_id=NULL, updated_at=now() WHERE id=$1', [actor.id]);
      if (oldAvatarId) {
        const oldMedia = await client.query<{ storage_path: string }>('SELECT storage_path FROM media_assets WHERE id=$1', [oldAvatarId]);
        await client.query('DELETE FROM media_assets WHERE id=$1', [oldAvatarId]);
        if (oldMedia.rows[0]) {
          await unlink(resolve(mediaDirectory, oldMedia.rows[0].storage_path)).catch(() => undefined);
        }
      }
    });
    actor.avatar_media_id = null;
    return { deleted: true };
  }

  @Get('membership')
  async membership(@Req() req: AuthRequest) {
    const ranges = await this.db.query<DateRange>(`SELECT starts_on::text,ends_on::text FROM memberships WHERE customer_id=$1 ORDER BY starts_on`, [req.actor!.id]);
    const policy = await this.db.query<{ monthly_class_quota: number; timezone: string }>('SELECT p.monthly_class_quota,s.timezone FROM studio_policy p JOIN studio s ON s.id=p.studio_id WHERE s.id=1');
    const months = new Set<string>();
    for (const range of ranges.rows) {
      const cursor = new Date(`${range.starts_on.slice(0, 7)}-01T00:00:00Z`);
      const last = range.ends_on.slice(0, 7);
      while (cursor.toISOString().slice(0, 7) <= last) {
        months.add(cursor.toISOString().slice(0, 7));
        cursor.setUTCMonth(cursor.getUTCMonth() + 1);
      }
    }
    const quota = [];
    for (const month of [...months].sort()) {
      const used = await this.db.query<{ count: number }>(`SELECT count(*)::int AS count FROM bookings b JOIN class_sessions s ON s.id=b.session_id WHERE b.customer_id=$1 AND b.source='quota' AND to_char(s.local_date,'YYYY-MM')=$2 AND (b.status='confirmed' OR b.status='cancelled' AND b.quota_retained=true)`, [req.actor!.id, month]);
      quota.push({ month, total: monthlyQuota(policy.rows[0].monthly_class_quota, month, ranges.rows), used: used.rows[0].count });
    }
    return { ranges: ranges.rows, quota };
  }
}
