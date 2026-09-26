import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto';
import { CanActivate, ExecutionContext, ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import { Request } from 'express';
import { Db } from './db';

const params = { N: 131072, r: 8, p: 1, maxmem: 256 * 1024 * 1024 };
function scrypt(password: string, salt: string, options = params): Promise<Buffer> {
  return new Promise((resolve, reject) => scryptCallback(password, salt, 64, options, (error, key) => error ? reject(error) : resolve(key)));
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString('hex');
  const hash = await scrypt(password, salt);
  return `scrypt$131072$8$1$${salt}$${hash.toString('hex')}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const parts = stored.split('$');
  if (parts.length !== 6 || parts[0] !== 'scrypt') return false;
  const [, n, r, p, salt, encoded] = parts;
  const actual = Buffer.from(encoded, 'hex');
  if (actual.length !== 64 || Number(n) !== params.N || Number(r) !== params.r || Number(p) !== params.p) return false;
  const hash = await scrypt(password, salt);
  return actual.length === hash.length && timingSafeEqual(actual, hash);
}

export type Actor = { id: string; email: string; full_name: string; role: 'admin' | 'coach' | 'customer'; password_change_required: boolean };
export type AuthRequest = Request & { session: Request['session'] & { userId?: string }; actor?: Actor };

@Injectable()
export class SessionGuard implements CanActivate {
  constructor(private readonly db: Db) {}
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<AuthRequest>();
    if (!req.session.userId) throw new UnauthorizedException('Silakan login');
    const found = await this.db.query<Actor>('SELECT id, email, full_name, role, password_change_required FROM app_users WHERE id = $1', [req.session.userId]);
    const actor = found.rows[0];
    if (!actor) throw new UnauthorizedException('Sesi tidak valid');
    req.actor = actor;
    if (actor.password_change_required && !['/api/v1/auth/change-password', '/api/v1/auth/logout'].includes(req.path)) throw new ForbiddenException('Ganti kata sandi sementara lebih dulu');
    return true;
  }
}

export function assertRole(req: AuthRequest, ...roles: Actor['role'][]): Actor {
  if (!req.actor || !roles.includes(req.actor.role)) throw new ForbiddenException('Akses ditolak');
  return req.actor;
}
