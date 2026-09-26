import { Body, ConflictException, Controller, Get, Injectable, NotFoundException, Param, ParseUUIDPipe, Put, Query, Req, UseGuards } from '@nestjs/common';
import { ApiCookieAuth, ApiProperty, ApiPropertyOptional, ApiTags } from '@nestjs/swagger';
import { IsBoolean, IsDateString, IsOptional, IsString, Length } from 'class-validator';
import { PoolClient } from 'pg';
import { Db } from '../shared/db';
import { AuthRequest, assertRole, SessionGuard } from '../shared/security';

class AttendanceDto { @ApiProperty({ example: true }) @IsBoolean() present!: boolean; }
class CorrectionDto extends AttendanceDto { @ApiProperty({ minLength: 5, maxLength: 500 }) @IsString() @Length(5,500) reason!: string; }
class CoachSessionFilter { @ApiPropertyOptional({ format: 'date', example: '2026-09-25' }) @IsOptional() @IsDateString() date?: string; }

type SessionRow = { id: string; coach_id: string; status: string; starts_at: Date; ends_at: Date };

@Injectable()
export class AttendanceService {
  constructor(private readonly db: Db) {}

  async coachSessions(coachId: string, date?: string) {
    return (await this.db.query(`SELECT s.id,s.local_date::text AS "localDate",s.starts_at AS "startsAt",s.ends_at AS "endsAt",s.status,s.capacity,t.title,t.level,t.category,(SELECT count(*)::int FROM bookings b WHERE b.session_id=s.id AND b.status='confirmed') AS "participantCount" FROM class_sessions s JOIN class_types t ON t.id=s.class_type_id WHERE s.coach_id=$1 AND ($2::date IS NOT NULL OR s.ends_at >= now()-interval '1 year') AND ($2::date IS NULL OR s.local_date=$2::date) ORDER BY abs(extract(epoch FROM (s.starts_at-now()))) ASC LIMIT 100`, [coachId,date ?? null])).rows;
  }

  async coachSummary(coachId: string) {
    const [counts, sessions] = await Promise.all([
      this.db.query<{ assignedCount: number; upcomingCount: number; participantCount: number }>(`SELECT count(*) FILTER (WHERE s.status='scheduled')::int AS "assignedCount",count(*) FILTER (WHERE s.status='scheduled' AND s.starts_at>=now())::int AS "upcomingCount",coalesce(sum((SELECT count(*) FROM bookings b WHERE b.session_id=s.id AND b.status='confirmed')) FILTER (WHERE s.status='scheduled' AND s.starts_at>=now()),0)::int AS "participantCount" FROM class_sessions s WHERE s.coach_id=$1`, [coachId]),
      this.db.query(`SELECT s.id,s.local_date::text AS "localDate",s.starts_at AS "startsAt",s.ends_at AS "endsAt",s.status,s.capacity,t.title,t.level,t.category,(SELECT count(*)::int FROM bookings b WHERE b.session_id=s.id AND b.status='confirmed') AS "participantCount" FROM class_sessions s JOIN class_types t ON t.id=s.class_type_id WHERE s.coach_id=$1 AND s.status='scheduled' AND s.starts_at>=now() ORDER BY s.starts_at ASC LIMIT 6`, [coachId]),
    ]);
    return { ...counts.rows[0], sessions: sessions.rows };
  }

  async participants(coachId: string, sessionId: string) {
    return this.db.transaction(async (client) => {
      const session = await client.query<SessionRow>('SELECT id,coach_id,status,starts_at,ends_at FROM class_sessions WHERE id=$1 AND coach_id=$2', [sessionId,coachId]);
      if (!session.rows[0]) throw new NotFoundException('Kelas pelatih tidak ditemukan');
      if (session.rows[0].status === 'cancelled') throw new ConflictException('Sesi dibatalkan');
      await client.query(`SELECT id FROM app_users WHERE id IN (SELECT customer_id FROM bookings WHERE session_id=$1 AND status='confirmed') ORDER BY id FOR UPDATE`, [sessionId]);
      await client.query(`INSERT INTO health_snapshots (booking_id,customer_id,note,delete_after)
        SELECT b.id,b.customer_id,revision.note,s.ends_at+interval '1 year'
        FROM bookings b JOIN class_sessions s ON s.id=b.session_id
        JOIN LATERAL (SELECT r.note FROM health_profile_revisions r WHERE r.customer_id=b.customer_id AND r.recorded_at<=s.starts_at ORDER BY r.recorded_at DESC,r.id DESC LIMIT 1) revision ON true
        WHERE b.session_id=$1 AND b.status='confirmed' AND s.starts_at<=now() AND s.ends_at+interval '1 year'>now()
        ON CONFLICT (booking_id) DO NOTHING`, [sessionId]);
      const found = await client.query(`SELECT b.id AS "bookingId",u.id AS "customerId",u.full_name AS "fullName",a.present,a.recorded_at AS "recordedAt",CASE WHEN s.starts_at>now() THEN hp.note WHEN hs.delete_after>now() THEN hs.note ELSE NULL END AS "healthNote",CASE WHEN s.starts_at>now() THEN 'current' WHEN hs.delete_after>now() AND hs.id IS NOT NULL THEN 'snapshot' ELSE NULL END AS "healthSource" FROM bookings b JOIN app_users u ON u.id=b.customer_id JOIN class_sessions s ON s.id=b.session_id LEFT JOIN attendance a ON a.booking_id=b.id LEFT JOIN health_profiles hp ON hp.customer_id=u.id LEFT JOIN health_snapshots hs ON hs.booking_id=b.id WHERE b.session_id=$1 AND b.status='confirmed' ORDER BY u.full_name,u.id`, [sessionId]);
      return { sessionId, startsAt: session.rows[0].starts_at, endsAt: session.rows[0].ends_at, participants: found.rows };
    });
  }

  private async eligible(client: PoolClient, sessionId: string, customerId: string, coachId?: string) {
    const session = await client.query<SessionRow>('SELECT id,coach_id,status,starts_at,ends_at FROM class_sessions WHERE id=$1 FOR UPDATE', [sessionId]);
    if (!session.rows[0] || coachId && session.rows[0].coach_id !== coachId) throw new NotFoundException('Kelas tidak ditemukan');
    if (session.rows[0].status === 'cancelled') throw new ConflictException('Sesi dibatalkan');
    if (Date.now() < session.rows[0].starts_at.getTime()) throw new ConflictException('Absensi tersedia saat kelas dimulai');
    if (coachId && Date.now() > session.rows[0].ends_at.getTime()+24*60*60*1000) throw new ConflictException('Batas perubahan absensi pelatih sudah lewat');
    const booking = await client.query<{ id: string }>(`SELECT id FROM bookings WHERE session_id=$1 AND customer_id=$2 AND status='confirmed' FOR UPDATE`, [sessionId,customerId]);
    if (!booking.rows[0]) throw new NotFoundException('Peserta terdaftar tidak ditemukan');
    return booking.rows[0].id;
  }

  async mark(coachId: string, sessionId: string, customerId: string, present: boolean) {
    return this.db.transaction(async (client) => {
      const bookingId = await this.eligible(client,sessionId,customerId,coachId);
      const saved = await client.query<{ present: boolean; recorded_at: Date }>(`INSERT INTO attendance (session_id,customer_id,booking_id,present,recorded_by) VALUES ($1,$2,$3,$4,$5) ON CONFLICT (session_id,customer_id) DO UPDATE SET present=$4,recorded_by=$5,recorded_at=now() RETURNING present,recorded_at`, [sessionId,customerId,bookingId,present,coachId]);
      return { sessionId, customerId, present: saved.rows[0].present, recordedAt: saved.rows[0].recorded_at };
    });
  }

  async correct(adminId: string, sessionId: string, customerId: string, present: boolean, reason: string) {
    const cleaned = reason.trim();
    if (cleaned.length < 5) throw new ConflictException('Alasan koreksi minimal 5 karakter');
    return this.db.transaction(async (client) => {
      const bookingId = await this.eligible(client,sessionId,customerId);
      const previous = await client.query<{ present: boolean }>('SELECT present FROM attendance WHERE session_id=$1 AND customer_id=$2 FOR UPDATE', [sessionId,customerId]);
      await client.query(`INSERT INTO attendance (session_id,customer_id,booking_id,present,recorded_by) VALUES ($1,$2,$3,$4,$5) ON CONFLICT (session_id,customer_id) DO UPDATE SET present=$4,recorded_by=$5,recorded_at=now()`, [sessionId,customerId,bookingId,present,adminId]);
      await client.query(`INSERT INTO attendance_corrections (session_id,customer_id,booking_id,actor_id,previous_present,new_present,reason) VALUES ($1,$2,$3,$4,$5,$6,$7)`, [sessionId,customerId,bookingId,adminId,previous.rows[0]?.present ?? null,present,cleaned]);
      return { sessionId,customerId,present,previousPresent: previous.rows[0]?.present ?? null,reason: cleaned };
    });
  }

  async corrections(sessionId: string) {
    return (await this.db.query(`SELECT c.id,c.customer_id AS "customerId",u.full_name AS "customerName",c.previous_present AS "previousPresent",c.new_present AS "newPresent",c.reason,c.corrected_at AS "correctedAt",a.full_name AS "adminName" FROM attendance_corrections c JOIN app_users u ON u.id=c.customer_id JOIN app_users a ON a.id=c.actor_id WHERE c.session_id=$1 ORDER BY c.corrected_at DESC LIMIT 100`, [sessionId])).rows;
  }

  async adminParticipants(sessionId: string) {
    const session = await this.db.query('SELECT id FROM class_sessions WHERE id=$1', [sessionId]);
    if (!session.rows[0]) throw new NotFoundException('Sesi tidak ditemukan');
    return (await this.db.query(`SELECT b.id AS "bookingId",b.customer_id AS "customerId",u.full_name AS "fullName",a.present,a.recorded_at AS "recordedAt" FROM bookings b JOIN app_users u ON u.id=b.customer_id LEFT JOIN attendance a ON a.booking_id=b.id WHERE b.session_id=$1 AND b.status='confirmed' ORDER BY u.full_name,u.id`, [sessionId])).rows;
  }
}

@ApiTags('coach') @ApiCookieAuth('wellness.sid') @UseGuards(SessionGuard) @Controller('coach/sessions')
export class CoachController {
  constructor(private readonly attendance: AttendanceService) {}
  @Get()
  list(@Req() req: AuthRequest, @Query() filter: CoachSessionFilter) { return this.attendance.coachSessions(assertRole(req,'coach').id,filter.date); }
  @Get('summary')
  summary(@Req() req: AuthRequest) { return this.attendance.coachSummary(assertRole(req,'coach').id); }
  @Get(':id/participants')
  participants(@Req() req: AuthRequest, @Param('id',ParseUUIDPipe) id: string) { return this.attendance.participants(assertRole(req,'coach').id,id); }
  @Put(':id/attendance/:customerId')
  mark(@Req() req: AuthRequest, @Param('id',ParseUUIDPipe) id: string, @Param('customerId',ParseUUIDPipe) customerId: string, @Body() body: AttendanceDto) { return this.attendance.mark(assertRole(req,'coach').id,id,customerId,body.present); }
}

@ApiTags('admin-attendance') @ApiCookieAuth('wellness.sid') @UseGuards(SessionGuard) @Controller('admin/sessions')
export class AdminAttendanceController {
  constructor(private readonly attendance: AttendanceService) {}
  @Get(':id/participants')
  participants(@Req() req: AuthRequest, @Param('id',ParseUUIDPipe) id: string) { assertRole(req,'admin'); return this.attendance.adminParticipants(id); }
  @Put(':id/attendance/:customerId')
  correct(@Req() req: AuthRequest, @Param('id',ParseUUIDPipe) id: string, @Param('customerId',ParseUUIDPipe) customerId: string, @Body() body: CorrectionDto) { return this.attendance.correct(assertRole(req,'admin').id,id,customerId,body.present,body.reason); }
  @Get(':id/attendance-corrections')
  corrections(@Req() req: AuthRequest, @Param('id',ParseUUIDPipe) id: string) { assertRole(req,'admin'); return this.attendance.corrections(id); }
}
