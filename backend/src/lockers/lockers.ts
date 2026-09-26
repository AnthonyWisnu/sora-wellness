import { BadRequestException, Body, ConflictException, Controller, Delete, Get, Injectable, Param, ParseUUIDPipe, Post, Put, Query, Req, UseGuards } from '@nestjs/common';
import { ApiCookieAuth, ApiProperty, ApiPropertyOptional, ApiTags } from '@nestjs/swagger';
import { IsString, IsUUID, MaxLength } from 'class-validator';
import { Db } from '../shared/db';
import { AuthRequest, assertRole, SessionGuard } from '../shared/security';

class LockerDto { @ApiProperty({ example: 'A-01' }) @IsString() @MaxLength(32) code!: string; }
class AssignDto { @ApiProperty({ format: 'uuid' }) @IsUUID() customerId!: string; }
class MemberSearch { @ApiPropertyOptional({ example: 'ayu' }) @IsString() @MaxLength(100) q = ''; }

@Injectable()
export class LockersService {
  constructor(private readonly db: Db) {}

  async releaseExpired(): Promise<void> {
    await this.db.query(`UPDATE locker_assignments a SET released_at=now()
      FROM studio s WHERE s.id=1 AND a.released_at IS NULL AND NOT EXISTS (
        SELECT 1 FROM memberships m WHERE m.id=a.membership_id AND m.customer_id=a.customer_id
          AND m.starts_on <= (now() AT TIME ZONE s.timezone)::date
          AND m.ends_on >= (now() AT TIME ZONE s.timezone)::date
      )`);
  }

  async mine(customerId: string) {
    await this.releaseExpired();
    const found = await this.db.query<{ enabled: boolean; code: string | null; assignedAt: Date | null; membershipEndsOn: string | null }>(`SELECT p.locker_enabled AS enabled,l.code,a.assigned_at AS "assignedAt",m.ends_on::text AS "membershipEndsOn"
      FROM studio_policy p LEFT JOIN locker_assignments a ON a.customer_id=$1 AND a.released_at IS NULL
      LEFT JOIN lockers l ON l.id=a.locker_id LEFT JOIN memberships m ON m.id=a.membership_id
      WHERE p.studio_id=1`, [customerId]);
    const value = found.rows[0];
    return { enabled: value.enabled, code: value.enabled ? value.code : null, assignedAt: value.enabled ? value.assignedAt : null, membershipEndsOn: value.enabled ? value.membershipEndsOn : null };
  }
}

@ApiTags('lockers') @ApiCookieAuth('wellness.sid') @UseGuards(SessionGuard)
@Controller('me/locker')
export class MyLockerController {
  constructor(private readonly lockers: LockersService) {}
  @Get()
  mine(@Req() req: AuthRequest) { return this.lockers.mine(assertRole(req, 'customer').id); }
}

@ApiTags('admin lockers') @ApiCookieAuth('wellness.sid') @UseGuards(SessionGuard)
@Controller('admin/lockers')
export class AdminLockersController {
  constructor(private readonly db: Db, private readonly lockers: LockersService) {}

  @Get()
  async list(@Req() req: AuthRequest) {
    assertRole(req, 'admin'); await this.lockers.releaseExpired();
    const enabled = (await this.db.query<{ locker_enabled: boolean }>('SELECT locker_enabled FROM studio_policy WHERE studio_id=1')).rows[0].locker_enabled;
    const rows = (await this.db.query(`SELECT l.id,l.code,l.active,a.customer_id AS "customerId",u.full_name AS "customerName",u.email AS "customerEmail",a.assigned_at AS "assignedAt",m.ends_on::text AS "membershipEndsOn"
      FROM lockers l LEFT JOIN locker_assignments a ON a.locker_id=l.id AND a.released_at IS NULL
      LEFT JOIN app_users u ON u.id=a.customer_id LEFT JOIN memberships m ON m.id=a.membership_id ORDER BY l.code`)).rows;
    return { enabled, lockers: rows };
  }

  @Get('eligible-customers')
  async eligible(@Req() req: AuthRequest, @Query() search: MemberSearch) {
    assertRole(req, 'admin'); await this.lockers.releaseExpired();
    return (await this.db.query(`SELECT u.id,u.full_name AS "fullName",u.email,m.ends_on::text AS "membershipEndsOn"
      FROM app_users u JOIN memberships m ON m.customer_id=u.id JOIN studio s ON s.id=1
      WHERE u.role='customer' AND m.starts_on <= (now() AT TIME ZONE s.timezone)::date
        AND m.ends_on >= (now() AT TIME ZONE s.timezone)::date
        AND NOT EXISTS (SELECT 1 FROM locker_assignments a WHERE a.customer_id=u.id AND a.released_at IS NULL)
        AND ($1::text='' OR u.full_name ILIKE '%'||$1||'%' OR u.email::text ILIKE '%'||$1||'%')
      ORDER BY u.full_name LIMIT 30`, [search.q.trim()])).rows;
  }

  @Post()
  async create(@Req() req: AuthRequest, @Body() body: LockerDto) {
    assertRole(req, 'admin');
    const code = body.code.trim().toUpperCase();
    if (!/^[A-Z0-9][A-Z0-9-]{0,31}$/.test(code)) throw new BadRequestException('Nomor loker hanya boleh huruf, angka, dan tanda hubung');
    try { return (await this.db.query('INSERT INTO lockers (code) VALUES ($1) RETURNING id,code,active', [code])).rows[0]; }
    catch (error) { if ((error as { code?: string }).code === '23505') throw new ConflictException('Nomor loker sudah ada'); throw error; }
  }

  @Put(':id/assignment')
  async assign(@Req() req: AuthRequest, @Param('id', ParseUUIDPipe) lockerId: string, @Body() body: AssignDto) {
    const admin = assertRole(req, 'admin');
    await this.lockers.releaseExpired();
    try {
      return await this.db.transaction(async (client) => {
        const customer = await client.query<{ role: string }>('SELECT role FROM app_users WHERE id=$1 FOR UPDATE', [body.customerId]);
        if (customer.rows[0]?.role !== 'customer') throw new BadRequestException('Pelanggan tidak ditemukan');
        const locker = await client.query<{ active: boolean }>('SELECT active FROM lockers WHERE id=$1 FOR UPDATE', [lockerId]);
        if (!locker.rows[0]) throw new BadRequestException('Loker tidak ditemukan');
        if (!locker.rows[0].active) throw new ConflictException('Loker tidak aktif');
        const policy = await client.query<{ locker_enabled: boolean }>('SELECT locker_enabled FROM studio_policy WHERE studio_id=1');
        if (!policy.rows[0].locker_enabled) throw new ConflictException('Fitur loker tidak aktif');
        const member = await client.query<{ id: string }>(`SELECT m.id FROM memberships m JOIN studio s ON s.id=1 WHERE m.customer_id=$1
          AND m.starts_on <= (now() AT TIME ZONE s.timezone)::date AND m.ends_on >= (now() AT TIME ZONE s.timezone)::date LIMIT 1`, [body.customerId]);
        if (!member.rows[0]) throw new ConflictException('Pelanggan tidak memiliki paket aktif hari ini');
        const existing = await client.query('SELECT 1 FROM locker_assignments WHERE released_at IS NULL AND (locker_id=$1 OR customer_id=$2) LIMIT 1', [lockerId,body.customerId]);
        if (existing.rowCount) throw new ConflictException('Loker atau pelanggan sudah memiliki penetapan aktif');
        return (await client.query('INSERT INTO locker_assignments (locker_id,customer_id,assigned_by,membership_id) VALUES ($1,$2,$3,$4) RETURNING id,assigned_at AS "assignedAt"', [lockerId,body.customerId,admin.id,member.rows[0].id])).rows[0];
      });
    } catch (error) {
      if ((error as { code?: string }).code === '23505') throw new ConflictException('Loker atau pelanggan sudah memiliki penetapan aktif');
      throw error;
    }
  }

  @Delete(':id/assignment')
  async release(@Req() req: AuthRequest, @Param('id', ParseUUIDPipe) lockerId: string) {
    assertRole(req, 'admin');
    const found = await this.db.query('UPDATE locker_assignments SET released_at=now() WHERE locker_id=$1 AND released_at IS NULL RETURNING id', [lockerId]);
    if (!found.rows[0]) throw new BadRequestException('Loker tidak memiliki penetapan aktif');
    return { released: true };
  }
}
