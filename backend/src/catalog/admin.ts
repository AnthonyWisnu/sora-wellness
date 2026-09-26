import { BadRequestException, Body, ConflictException, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ApiCookieAuth, ApiCreatedResponse, ApiTags } from '@nestjs/swagger';
import { Db } from '../shared/db';
import { AuthRequest, assertRole, SessionGuard } from '../shared/security';
import { CancellationsService } from '../booking/cancellations';
import { AdminSessionFilter, ClassTypeDto, PackageChangeDto, PackageDto, PolicyDto, ScheduleRuleDto, SessionDto } from './admin.dto';

@ApiTags('admin') @ApiCookieAuth('wellness.sid') @UseGuards(SessionGuard)
@Controller('admin')
export class AdminController {
  constructor(private readonly db: Db, private readonly cancellations: CancellationsService) {}

  @Get('policies')
  async policies(@Req() req: AuthRequest) {
    assertRole(req, 'admin');
    const found = await this.db.query('SELECT guest_schedule_days AS "guestScheduleDays",member_schedule_days AS "memberScheduleDays",booking_cutoff_minutes AS "bookingCutoffMinutes",cancellation_cutoff_minutes AS "cancellationCutoffMinutes",seat_hold_minutes AS "seatHoldMinutes",monthly_class_quota AS "monthlyClassQuota",locker_enabled AS "lockerEnabled" FROM studio_policy WHERE studio_id=1');
    return found.rows[0];
  }

  @Patch('policies')
  async setPolicies(@Req() req: AuthRequest, @Body() body: PolicyDto) {
    assertRole(req, 'admin');
    await this.db.query('UPDATE studio_policy SET guest_schedule_days=$1,member_schedule_days=$2,booking_cutoff_minutes=$3,cancellation_cutoff_minutes=$4,seat_hold_minutes=$5,monthly_class_quota=$6,locker_enabled=$7,updated_at=now() WHERE studio_id=1', [body.guestScheduleDays,body.memberScheduleDays,body.bookingCutoffMinutes,body.cancellationCutoffMinutes,body.seatHoldMinutes,body.monthlyClassQuota,body.lockerEnabled]);
    return this.policies(req);
  }

  @Get('class-types')
  async classTypes(@Req() req: AuthRequest) { assertRole(req, 'admin'); return (await this.db.query('SELECT * FROM class_types ORDER BY created_at DESC')).rows; }

  @Post('class-types')
  async createClassType(@Req() req: AuthRequest, @Body() b: ClassTypeDto) {
    assertRole(req, 'admin');
    const found = await this.db.query('INSERT INTO class_types (title,category,level,description,duration_minutes,default_capacity,default_price_idr) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id', [b.title,b.category,b.level,b.description,b.durationMinutes,b.defaultCapacity,b.defaultPriceIdr]);
    return found.rows[0];
  }

  @Patch('class-types/:id')
  async changeClassType(@Req() req: AuthRequest, @Param('id') id: string, @Body() b: ClassTypeDto) {
    assertRole(req, 'admin');
    return this.db.transaction(async (client) => {
      const existing = await client.query<{ level: string }>('SELECT level FROM class_types WHERE id=$1 FOR UPDATE', [id]);
      if (!existing.rows[0]) throw new BadRequestException('Jenis kelas tidak ditemukan');
      if (existing.rows[0].level !== b.level) {
        const sessions = await client.query('SELECT 1 FROM class_sessions WHERE class_type_id=$1 LIMIT 1', [id]);
        if (sessions.rowCount) throw new ConflictException('Tingkat jenis kelas yang sudah memiliki sesi tidak dapat diubah');
      }
      return (await client.query('UPDATE class_types SET title=$1,category=$2,level=$3,description=$4,duration_minutes=$5,default_capacity=$6,default_price_idr=$7,updated_at=now() WHERE id=$8 RETURNING id', [b.title,b.category,b.level,b.description,b.durationMinutes,b.defaultCapacity,b.defaultPriceIdr,id])).rows[0];
    });
  }

  @Get('package-options')
  async packages(@Req() req: AuthRequest) { assertRole(req, 'admin'); return (await this.db.query('SELECT * FROM package_options ORDER BY duration_months')).rows; }

  @Post('package-options')
  async createPackage(@Req() req: AuthRequest, @Body() b: PackageDto) {
    assertRole(req, 'admin');
    try { return (await this.db.query('INSERT INTO package_options (duration_months,price_idr) VALUES ($1,$2) RETURNING id', [b.durationMonths,b.priceIdr])).rows[0]; }
    catch (error) { if ((error as { code?: string }).code === '23505') throw new ConflictException('Durasi paket sudah ada'); throw error; }
  }

  @Patch('package-options/:id')
  async changePackage(@Req() req: AuthRequest, @Param('id') id: string, @Body() b: PackageChangeDto) {
    assertRole(req, 'admin');
    const found = await this.db.query('UPDATE package_options SET price_idr=$1,active=$2 WHERE id=$3 RETURNING id,price_idr AS "priceIdr",active', [b.priceIdr,b.active,id]);
    if (!found.rows[0]) throw new BadRequestException('Pilihan paket tidak ditemukan');
    return found.rows[0];
  }

  @Get('sessions')
  async sessions(@Req() req: AuthRequest, @Query() filter: AdminSessionFilter) {
    assertRole(req, 'admin');
    return (await this.db.query('SELECT s.id,s.class_type_id,s.coach_id,s.local_date::text AS local_date,s.starts_at,s.ends_at,s.status,s.capacity,s.price_idr,t.title,u.full_name AS coach_name FROM class_sessions s JOIN class_types t ON t.id=s.class_type_id JOIN app_users u ON u.id=s.coach_id WHERE ($1::date IS NULL OR s.local_date=$1::date) ORDER BY s.starts_at DESC LIMIT 100', [filter.date ?? null])).rows;
  }

  @Get('dashboard-summary')
  async dashboardSummary(@Req() req: AuthRequest) {
    assertRole(req, 'admin');
    const [counts, sessions] = await Promise.all([
      this.db.query<{ upcomingCount: number; todayCount: number; coachCount: number }>(`SELECT count(*)::int AS "upcomingCount",count(*) FILTER (WHERE s.local_date=(now() AT TIME ZONE st.timezone)::date)::int AS "todayCount",count(DISTINCT s.coach_id)::int AS "coachCount" FROM class_sessions s CROSS JOIN studio st WHERE st.id=1 AND s.status='scheduled' AND s.starts_at>=now()`),
      this.db.query(`SELECT s.id,s.class_type_id,s.coach_id,s.local_date::text AS local_date,s.starts_at,s.ends_at,s.status,s.capacity,s.price_idr,t.title,u.full_name AS coach_name FROM class_sessions s JOIN class_types t ON t.id=s.class_type_id JOIN app_users u ON u.id=s.coach_id WHERE s.status='scheduled' AND s.starts_at>=now() ORDER BY s.starts_at ASC LIMIT 8`),
    ]);
    return { ...counts.rows[0], sessions: sessions.rows };
  }

  @Post('sessions')
  async createSession(@Req() req: AuthRequest, @Body() b: SessionDto) {
    assertRole(req, 'admin');
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(b.localStartTime)) throw new BadRequestException('Jam harus HH:mm');
    const result = await this.db.query(`INSERT INTO class_sessions (class_type_id,coach_id,local_date,starts_at,ends_at,capacity,price_idr) SELECT t.id,u.id,$3::date,($3::date + $4::time) AT TIME ZONE st.timezone,(($3::date + $4::time) AT TIME ZONE st.timezone) + t.duration_minutes * interval '1 minute',$5,$6 FROM class_types t JOIN app_users u ON u.id=$2 AND u.role='coach' CROSS JOIN studio st WHERE t.id=$1 AND st.id=1 RETURNING id`, [b.classTypeId,b.coachId,b.localDate,b.localStartTime,b.capacity,b.priceIdr]);
    if (!result.rows[0]) throw new BadRequestException('Jenis kelas atau pelatih tidak valid');
    return result.rows[0];
  }

  @Patch('sessions/:id')
  async changeSession(@Req() req: AuthRequest, @Param('id') id: string, @Body() b: SessionDto) {
    assertRole(req, 'admin');
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(b.localStartTime)) throw new BadRequestException('Jam harus HH:mm');
    return this.db.transaction(async (client) => {
      const existing = await client.query('SELECT id,status FROM class_sessions WHERE id=$1 FOR UPDATE', [id]);
      if (!existing.rows[0]) throw new BadRequestException('Sesi tidak ditemukan');
      if (existing.rows[0].status !== 'scheduled') throw new ConflictException('Sesi tidak aktif');
      const booking = await client.query('SELECT 1 FROM bookings WHERE session_id=$1 LIMIT 1', [id]);
      if (booking.rowCount) throw new ConflictException('Sesi sudah pernah dipesan; batalkan sesi sesuai alur pengembalian');
      const changed = await client.query(`UPDATE class_sessions s SET class_type_id=t.id,coach_id=u.id,local_date=$3::date,starts_at=($3::date+$4::time) AT TIME ZONE st.timezone,ends_at=(($3::date+$4::time) AT TIME ZONE st.timezone)+t.duration_minutes*interval '1 minute',capacity=$5,price_idr=$6 FROM class_types t JOIN app_users u ON u.id=$2 AND u.role='coach' CROSS JOIN studio st WHERE s.id=$7 AND t.id=$1 AND st.id=1 RETURNING s.id`, [b.classTypeId,b.coachId,b.localDate,b.localStartTime,b.capacity,b.priceIdr,id]);
      if (!changed.rows[0]) throw new BadRequestException('Jenis kelas atau pelatih tidak valid');
      return changed.rows[0];
    });
  }

  @Post('sessions/:id/cancel')
  @ApiCreatedResponse({ schema: { example: { id: 'd6d920d7-a0c1-46ac-8793-e5f84b004e2d', status: 'cancelled', bookingsCancelled: 4, previousCancellationsRestored: 1, creditedBalanceIdr: 150000, quotaReturned: 2 } } })
  async cancelSession(@Req() req: AuthRequest, @Param('id', ParseUUIDPipe) id: string) {
    const admin = assertRole(req, 'admin');
    return this.cancellations.cancelSession(id, admin.id);
  }

  @Get('schedule-rules')
  async rules(@Req() req: AuthRequest) {
    assertRole(req, 'admin');
    return (await this.db.query('SELECT r.*,t.title,u.full_name AS coach_name FROM schedule_rules r JOIN class_types t ON t.id=r.class_type_id JOIN app_users u ON u.id=r.coach_id ORDER BY r.starts_on DESC')).rows;
  }

  @Post('schedule-rules')
  async createRule(@Req() req: AuthRequest, @Body() b: ScheduleRuleDto) {
    assertRole(req, 'admin');
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(b.localStartTime)) throw new BadRequestException('Jam harus HH:mm');
    const dates = await this.db.query<{ days: number }>(`SELECT ($2::date-$1::date)::int AS days`, [b.startsOn,b.endsOn]);
    if (dates.rows[0].days < 0 || dates.rows[0].days > 180) throw new BadRequestException('Rentang jadwal 0–180 hari');
    return this.db.transaction(async (client) => {
      const rule = await client.query<{ id: string }>(`INSERT INTO schedule_rules (class_type_id,coach_id,iso_weekday,local_start_time,starts_on,ends_on,capacity,price_idr) SELECT t.id,u.id,$3,$4::time,$5::date,$6::date,$7,$8 FROM class_types t JOIN app_users u ON u.id=$2 AND u.role='coach' WHERE t.id=$1 RETURNING id`, [b.classTypeId,b.coachId,b.isoWeekday,b.localStartTime,b.startsOn,b.endsOn,b.capacity,b.priceIdr]);
      if (!rule.rows[0]) throw new BadRequestException('Jenis kelas atau pelatih tidak valid');
      const sessions = await client.query(`INSERT INTO class_sessions (class_type_id,schedule_rule_id,coach_id,local_date,starts_at,ends_at,capacity,price_idr) SELECT r.class_type_id,r.id,r.coach_id,x.d::date,(x.d::date+r.local_start_time) AT TIME ZONE st.timezone,((x.d::date+r.local_start_time) AT TIME ZONE st.timezone)+t.duration_minutes*interval '1 minute',r.capacity,r.price_idr FROM schedule_rules r JOIN class_types t ON t.id=r.class_type_id CROSS JOIN studio st CROSS JOIN LATERAL generate_series(r.starts_on,r.ends_on,interval '1 day') AS x(d) WHERE r.id=$1 AND extract(isodow FROM x.d)=$2 AND x.d::date >= (now() AT TIME ZONE st.timezone)::date`, [rule.rows[0].id,b.isoWeekday]);
      return { id: rule.rows[0].id, sessionsCreated: sessions.rowCount };
    });
  }
}
