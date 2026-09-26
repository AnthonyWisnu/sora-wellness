import { randomBytes } from 'node:crypto';
import { Body, ConflictException, Controller, ForbiddenException, Get, HttpCode, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ApiCookieAuth, ApiCreatedResponse, ApiOkResponse, ApiProperty, ApiPropertyOptional, ApiTags } from '@nestjs/swagger';
import { IsEmail, IsIn, IsInt, IsOptional, IsString, Length, Max, MaxLength, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { Db } from '../shared/db';
import { csrf } from '../shared/csrf';
import { AuthRequest, assertRole, hashPassword, SessionGuard, verifyPassword } from '../shared/security';

export class RegisterDto {
  @ApiProperty({ example: 'pelanggan@example.com' })
  @IsEmail() email!: string;
  @ApiProperty({ example: 'Ayu Lestari' })
  @IsString() @Length(2, 100) fullName!: string;
  @ApiProperty({ minLength: 12, writeOnly: true })
  @IsString() @Length(12, 128) password!: string;
}
export class LoginDto {
  @ApiProperty({ example: 'pelanggan@example.com' })
  @IsEmail() email!: string;
  @ApiProperty({ writeOnly: true })
  @IsString() password!: string;
}
export class ChangePasswordDto {
  @ApiProperty({ writeOnly: true })
  @IsString() currentPassword!: string;
  @ApiProperty({ minLength: 12, writeOnly: true })
  @IsString() @Length(12, 128) newPassword!: string;
}
export class ResetPasswordDto {
  @ApiProperty({ example: 'Peminta memperlihatkan inbox email akun di hadapan admin' })
  @IsString() @Length(8, 500) verificationNote!: string;
}
export class StaffDto extends RegisterDto {
  @ApiProperty({ enum: ['coach', 'admin'] })
  @IsString() @MaxLength(20) role!: 'coach' | 'admin';
}
export class AccountFilter {
  @ApiPropertyOptional({ example: 'ayu' }) @IsOptional() @IsString() @MaxLength(100) q?: string;
  @ApiPropertyOptional({ enum: ['customer', 'coach', 'admin'] }) @IsOptional() @IsIn(['customer', 'coach', 'admin']) role?: string;
  @ApiPropertyOptional({ example: 1 }) @IsOptional() @Type(() => Number) @IsInt() @Min(1) page?: number;
  @ApiPropertyOptional({ example: 20 }) @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100) limit?: number;
}

async function regenerate(req: AuthRequest): Promise<void> {
  await new Promise<void>((resolve, reject) => req.session.regenerate((error) => error ? reject(error) : resolve()));
}
async function destroy(req: AuthRequest): Promise<void> {
  await new Promise<void>((resolve, reject) => req.session.destroy((error) => error ? reject(error) : resolve()));
}

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly db: Db) {}

  @Get('csrf')
  @ApiOkResponse({ schema: { example: { token: 'token-csrf-dari-server' } } })
  getCsrf(@Req() req: AuthRequest) { return { token: csrf.generateToken(req) }; }

  @Post('register')
  @ApiCreatedResponse({ schema: { example: { id: '562a9064-bdd6-4f74-a903-91661ba23e75', email: 'pelanggan@example.com', role: 'customer' } } })
  async register(@Body() body: RegisterDto, @Req() req: AuthRequest) {
    const email = body.email.trim().toLowerCase();
    const hash = await hashPassword(body.password);
    try {
      const id = await this.db.transaction(async (client) => {
        const result = await client.query<{ id: string }>('INSERT INTO app_users (email, full_name, role, password_hash) VALUES ($1, $2, $3, $4) RETURNING id', [email, body.fullName.trim(), 'customer', hash]);
        await client.query('INSERT INTO wallet_accounts (customer_id) VALUES ($1)', [result.rows[0].id]);
        return result.rows[0].id;
      });
      await regenerate(req);
      req.session.userId = id;
      return { id, email, role: 'customer' };
    } catch (error) {
      if ((error as { code?: string }).code === '23505') throw new ConflictException('Email sudah terdaftar');
      throw error;
    }
  }

  @Post('login') @HttpCode(200)
  @ApiOkResponse({ schema: { example: { id: '562a9064-bdd6-4f74-a903-91661ba23e75', role: 'customer', passwordChangeRequired: false } } })
  async login(@Body() body: LoginDto, @Req() req: AuthRequest) {
    const result = await this.db.query<{ id: string; role: string; password_hash: string; password_change_required: boolean }>('SELECT id, role, password_hash, password_change_required FROM app_users WHERE email = $1', [body.email.trim().toLowerCase()]);
    const user = result.rows[0];
    if (!user || !(await verifyPassword(body.password, user.password_hash))) throw new ForbiddenException('Email atau kata sandi salah');
    await regenerate(req);
    req.session.userId = user.id;
    return { id: user.id, role: user.role, passwordChangeRequired: user.password_change_required };
  }

  @Post('logout') @HttpCode(204)
  async logout(@Req() req: AuthRequest) { await destroy(req); }

  @Post('change-password') @UseGuards(SessionGuard) @ApiCookieAuth('wellness.sid')
  async changePassword(@Req() req: AuthRequest, @Body() body: ChangePasswordDto) {
    const actor = req.actor!;
    const found = await this.db.query<{ password_hash: string }>('SELECT password_hash FROM app_users WHERE id = $1', [actor.id]);
    if (!(await verifyPassword(body.currentPassword, found.rows[0].password_hash))) throw new ForbiddenException('Kata sandi saat ini salah');
    await this.db.query('UPDATE app_users SET password_hash = $1, password_change_required = false, updated_at = now() WHERE id = $2', [await hashPassword(body.newPassword), actor.id]);
    await this.db.query(`DELETE FROM "session" WHERE sess->>'userId' = $1 AND sid <> $2`, [actor.id, req.sessionID]);
    return { changed: true };
  }

}

@ApiTags('admin accounts')
@Controller('admin')
export class AdminAccountController {
  constructor(private readonly db: Db) {}

  @Get('accounts') @UseGuards(SessionGuard) @ApiCookieAuth('wellness.sid')
  async accounts(@Req() req: AuthRequest, @Query() filter: AccountFilter) {
    assertRole(req, 'admin');
    const found = await this.db.query(`SELECT id,email,full_name AS "fullName",role,password_change_required AS "passwordChangeRequired",created_at AS "createdAt" FROM app_users WHERE ($1::text IS NULL OR email::text ILIKE '%'||$1||'%' OR full_name ILIKE '%'||$1||'%') AND ($2::text IS NULL OR role=$2) ORDER BY created_at DESC LIMIT $3 OFFSET $4`, [filter.q?.trim() || null, filter.role ?? null, filter.limit ?? 20, ((filter.page ?? 1) - 1) * (filter.limit ?? 20)]);
    return found.rows;
  }

  @Post('staff') @UseGuards(SessionGuard) @ApiCookieAuth('wellness.sid')
  async createStaff(@Req() req: AuthRequest, @Body() body: StaffDto) {
    const admin = assertRole(req, 'admin');
    if (!['admin', 'coach'].includes(body.role)) throw new ForbiddenException('Peran tidak valid');
    const hash = await hashPassword(body.password);
    try {
      return await this.db.transaction(async (client) => {
        const found = await client.query<{ id: string }>('INSERT INTO app_users (email, full_name, role, password_hash, password_change_required) VALUES ($1,$2,$3,$4,true) RETURNING id', [body.email.trim().toLowerCase(), body.fullName.trim(), body.role, hash]);
        await client.query('INSERT INTO audit_logs (actor_id, target_user_id, action) VALUES ($1,$2,$3)', [admin.id, found.rows[0].id, 'create_staff']);
        return { id: found.rows[0].id };
      });
    } catch (error) {
      if ((error as { code?: string }).code === '23505') throw new ConflictException('Email sudah terdaftar');
      throw error;
    }
  }

  @Post('accounts/:id/reset-password') @UseGuards(SessionGuard) @ApiCookieAuth('wellness.sid')
  async resetPassword(@Req() req: AuthRequest, @Body() body: ResetPasswordDto) {
    const admin = assertRole(req, 'admin');
    const id = req.params.id;
    const temporaryPassword = randomBytes(18).toString('base64url');
    await this.db.transaction(async (client) => {
      const changed = await client.query('UPDATE app_users SET password_hash=$1, password_change_required=true, updated_at=now() WHERE id=$2', [await hashPassword(temporaryPassword), id]);
      if (!changed.rowCount) throw new ForbiddenException('Akun tidak ditemukan');
      await client.query(`DELETE FROM "session" WHERE sess->>'userId' = $1`, [id]);
      await client.query('INSERT INTO audit_logs (actor_id,target_user_id,action,reason) VALUES ($1,$2,$3,$4)', [admin.id, id, 'reset_password', body.verificationNote]);
    });
    return { temporaryPassword };
  }
}
