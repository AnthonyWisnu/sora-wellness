import { Controller, Get, NotFoundException, Param, Query, Req } from '@nestjs/common';
import { ApiOkResponse, ApiPropertyOptional, ApiTags } from '@nestjs/swagger';
import { IsDateString, IsIn, IsInt, IsOptional, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { Db } from '../shared/db';
import { AuthRequest } from '../shared/security';

export class SessionFilter {
  @ApiPropertyOptional({ format: 'date', example: '2026-09-26' })
  @IsOptional() @IsDateString() from?: string;
  @ApiPropertyOptional({ format: 'date', example: '2026-09-30' })
  @IsOptional() @IsDateString() to?: string;
  @ApiPropertyOptional({ enum: ['beginner', 'intermediate_1', 'intermediate_2'] })
  @IsOptional() @IsIn(['beginner', 'intermediate_1', 'intermediate_2']) level?: string;
  @ApiPropertyOptional({ example: 1, minimum: 1 })
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page?: number;
  @ApiPropertyOptional({ example: 20, minimum: 1, maximum: 100 })
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100) limit?: number;
}

@ApiTags('public')
@Controller('public')
export class PublicController {
  constructor(private readonly db: Db) {}

  @Get('studio')
  @ApiOkResponse({ schema: { example: { name: 'Sora Wellness', slug: 'sora-wellness', timezone: 'Asia/Makassar', address: 'Denpasar, Bali', guestScheduleDays: 7, memberScheduleDays: 30 } } })
  async studio() {
    const found = await this.db.query<{ logoMediaId: string | null; heroMediaId: string | null }>('SELECT s.name,s.slug,s.description,s.address,s.timezone,s.hero_title AS "heroTitle",s.hero_subtitle AS "heroSubtitle",s.logo_media_id AS "logoMediaId",s.hero_media_id AS "heroMediaId",p.guest_schedule_days AS "guestScheduleDays",p.member_schedule_days AS "memberScheduleDays" FROM studio s JOIN studio_policy p ON p.studio_id=s.id WHERE s.id=1');
    if (!found.rows[0]) return null;
    const gallery = await this.db.query<{ media_id: string }>('SELECT media_id FROM studio_gallery WHERE studio_id=1 ORDER BY position');
    const { logoMediaId, heroMediaId, ...studio } = found.rows[0];
    return { ...studio, logoUrl: logoMediaId ? `/api/v1/public/media/${logoMediaId}` : null, heroImageUrl: heroMediaId ? `/api/v1/public/media/${heroMediaId}` : null, gallery: gallery.rows.map(row => ({ id: row.media_id, url: `/api/v1/public/media/${row.media_id}` })) };
  }

  @Get('packages')
  @ApiOkResponse({ schema: { example: { monthlyClassQuota: 8, accessLevels: ['beginner', 'intermediate_1', 'intermediate_2'], options: [{ id: 'c1c97f45-40a1-4edb-857a-21d0718780c0', durationMonths: 1, priceIdr: 450000 }] } } })
  async packages() {
    const result = await this.db.query('SELECT id,duration_months AS "durationMonths",price_idr AS "priceIdr" FROM package_options WHERE active=true ORDER BY duration_months');
    const policy = await this.db.query<{ monthly_class_quota: number }>('SELECT monthly_class_quota FROM studio_policy WHERE studio_id=1');
    return { monthlyClassQuota: policy.rows[0].monthly_class_quota, accessLevels: ['beginner', 'intermediate_1', 'intermediate_2'], options: result.rows };
  }

  @Get('class-types')
  async classTypes() {
    const result = await this.db.query('SELECT id,title,category,level,description,duration_minutes AS "durationMinutes",default_price_idr AS "singlePriceIdr" FROM class_types WHERE active=true ORDER BY title');
    return result.rows;
  }

  @Get('sessions')
  @ApiOkResponse({ schema: { example: [{ id: 'a16e4bdf-1b34-43d5-a593-55ccdd9601f9', localDate: '2026-09-26', startsAt: '2026-09-25T23:00:00.000Z', title: 'Gentle Flow', level: 'beginner', singlePriceIdr: 75000, seatsLeft: 10 }] } })
  async sessions(@Req() req: AuthRequest, @Query() filter: SessionFilter) {
    const viewer = await this.viewer(req);
    const result = await this.db.query(`SELECT s.id,s.class_type_id AS "classTypeId",s.local_date::text AS "localDate",s.starts_at AS "startsAt",s.ends_at AS "endsAt",s.capacity,s.price_idr AS "singlePriceIdr",s.status,t.title,t.category,t.level,u.full_name AS "coachName",s.capacity - (SELECT count(*)::int FROM bookings b WHERE b.session_id=s.id AND (b.status='confirmed' OR b.status='pending_payment' AND b.hold_expires_at>now())) AS "seatsLeft" FROM class_sessions s JOIN class_types t ON t.id=s.class_type_id JOIN app_users u ON u.id=s.coach_id CROSS JOIN studio st WHERE s.status='scheduled' AND s.starts_at > now() AND s.local_date >= GREATEST(COALESCE($1::date,(now() AT TIME ZONE st.timezone)::date),(now() AT TIME ZONE st.timezone)::date) AND s.local_date < (now() AT TIME ZONE st.timezone)::date + $2::int AND ($3::date IS NULL OR s.local_date <= $3::date) AND ($4::text IS NULL OR t.level=$4) ORDER BY s.starts_at LIMIT $5 OFFSET $6`, [filter.from ?? null, viewer.days, filter.to ?? null, filter.level ?? null, filter.limit ?? 20, ((filter.page ?? 1) - 1) * (filter.limit ?? 20)]);
    return result.rows;
  }

  @Get('sessions/:id')
  async session(@Req() req: AuthRequest, @Param('id') id: string) {
    const viewer = await this.viewer(req);
    const result = await this.db.query(`SELECT s.id,s.local_date::text AS "localDate",s.starts_at AS "startsAt",s.ends_at AS "endsAt",s.capacity,s.price_idr AS "singlePriceIdr",s.status,t.title,t.category,t.level,t.description,u.full_name AS "coachName",s.capacity - (SELECT count(*)::int FROM bookings b WHERE b.session_id=s.id AND (b.status='confirmed' OR b.status='pending_payment' AND b.hold_expires_at>now())) AS "seatsLeft" FROM class_sessions s JOIN class_types t ON t.id=s.class_type_id JOIN app_users u ON u.id=s.coach_id JOIN studio st ON st.id=1 WHERE s.id=$1 AND s.starts_at>now() AND s.local_date >= (now() AT TIME ZONE st.timezone)::date AND s.local_date < (now() AT TIME ZONE st.timezone)::date + $2::int`, [id, viewer.days]);
    if (!result.rows[0]) throw new NotFoundException('Sesi tidak ditemukan dalam jendela jadwal');
    return result.rows[0];
  }

  private async viewer(req: AuthRequest): Promise<{ days: number }> {
    const policy = await this.db.query<{ guest_schedule_days: number; member_schedule_days: number }>('SELECT guest_schedule_days,member_schedule_days FROM studio_policy WHERE studio_id=1');
    const p = policy.rows[0];
    if (!req.session?.userId) return { days: p.guest_schedule_days };
    const active = await this.db.query('SELECT 1 FROM memberships m JOIN studio st ON st.id=1 WHERE m.customer_id=$1 AND m.starts_on <= (now() AT TIME ZONE st.timezone)::date AND m.ends_on >= (now() AT TIME ZONE st.timezone)::date LIMIT 1', [req.session.userId]);
    return { days: active.rowCount ? p.member_schedule_days : p.guest_schedule_days };
  }
}
