import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import session from 'express-session';
import connectPgSimple from 'connect-pg-simple';
import helmet from 'helmet';
import { NextFunction, Request, Response } from 'express';
import { AppModule } from './module';
import { Db } from './shared/db';
import { csrf } from './shared/csrf';
import { PaymentsService } from './payments/payments';
import { HealthService } from './health/health';
import { LockersService } from './lockers/lockers';

async function bootstrap() {
  if (!process.env.SESSION_SECRET || process.env.SESSION_SECRET.length < 32) throw new Error('SESSION_SECRET minimal 32 karakter');
  const app = await NestFactory.create(AppModule);
  if (process.env.NODE_ENV === 'production') app.getHttpAdapter().getInstance().set('trust proxy', 1);
  const db = app.get(Db);
  const PgStore = connectPgSimple(session);
  app.use(helmet());
  app.use(session({
    name: 'wellness.sid',
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    rolling: true,
    store: new PgStore({ pool: db.pool, tableName: 'session', createTableIfMissing: false, pruneSessionInterval: 60 * 15 }),
    cookie: { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', maxAge: 1000 * 60 * 60 * 12 },
  }));
  app.use((req: Request, res: Response, next: NextFunction) => {
    if (req.method === 'POST' && req.path === '/api/v1/webhooks/midtrans') { next(); return; }
    csrf.csrfSynchronisedProtection(req, res, (error?: unknown) => {
    if (error) { res.status(403).json({ statusCode: 403, message: 'Token CSRF tidak valid' }); return; }
    next();
    });
  });
  app.enableCors({ origin: process.env.FRONTEND_ORIGIN?.split(',') ?? [], credentials: true });
  app.setGlobalPrefix('api/v1');
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
  const config = new DocumentBuilder().setTitle('Wellness API').setDescription('Satu studio. Ambil token dari GET /api/v1/auth/csrf, kirim x-csrf-token untuk POST/PUT/PATCH/DELETE, dan simpan cookie sesi.').setVersion('0.1.0').addCookieAuth('wellness.sid').build();
  SwaggerModule.setup('api/docs', app, SwaggerModule.createDocument(app, config));
  await app.listen(Number(process.env.PORT ?? 3000), '127.0.0.1');
  const payments = app.get(PaymentsService);
  const lockers = app.get(LockersService);
  const sweep = setInterval(() => { void payments.expirePending().catch(() => { /* next sweep retries */ }); void payments.expirePendingPackages().catch(() => { /* next sweep retries */ }); }, 60000);
  const lockerSweep = setInterval(() => { void lockers.releaseExpired().catch(() => { /* next sweep retries */ }); }, 60 * 60 * 1000);
  lockerSweep.unref();
  sweep.unref();
  const health = app.get(HealthService);
  const healthSweep = setInterval(() => { void health.cleanup().catch(() => { /* next sweep retries */ }); }, 60 * 60 * 1000);
  healthSweep.unref();
}

bootstrap().catch((error: unknown) => { console.error(error); process.exitCode = 1; });
