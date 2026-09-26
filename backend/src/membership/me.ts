import { Body, Controller, Get, Patch, Req, UseGuards } from '@nestjs/common';
import { ApiCookieAuth, ApiTags } from '@nestjs/swagger';
import { IsString, Length } from 'class-validator';
import { Db } from '../shared/db';
import { monthlyQuota, DateRange } from './quota';
import { AuthRequest, SessionGuard } from '../shared/security';

class ProfileDto { @IsString() @Length(2, 100) fullName!: string; }

@ApiTags('me') @ApiCookieAuth('wellness.sid') @UseGuards(SessionGuard)
@Controller('me')
export class MeController {
  constructor(private readonly db: Db) {}

  @Get()
  async profile(@Req() req: AuthRequest) {
    const actor = req.actor!;
    return { id: actor.id, email: actor.email, fullName: actor.full_name, role: actor.role, passwordChangeRequired: actor.password_change_required };
  }

  @Patch()
  async edit(@Req() req: AuthRequest, @Body() body: ProfileDto) {
    await this.db.query('UPDATE app_users SET full_name=$1,updated_at=now() WHERE id=$2', [body.fullName.trim(), req.actor!.id]);
    return { fullName: body.fullName.trim() };
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
