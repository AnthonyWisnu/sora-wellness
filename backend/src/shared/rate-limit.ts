import { Global, Module } from '@nestjs/common';
import { ThrottlerModule, ThrottlerStorage } from '@nestjs/throttler';
import { Db } from './db';

export class PostgresThrottlerStorage implements ThrottlerStorage {
  constructor(private readonly db: Db) {}

  async increment(key: string, ttl: number, limit: number, blockDuration: number): ReturnType<ThrottlerStorage['increment']> {
    const result = await this.db.query<{ hits: number; expires_at: Date; blocked_until: Date | null }>(`
      INSERT INTO rate_limit_buckets(key,hits,expires_at)
      VALUES($1,1,clock_timestamp()+$2::int*interval '1 millisecond')
      ON CONFLICT(key) DO UPDATE SET
        hits=CASE WHEN rate_limit_buckets.blocked_until>clock_timestamp() THEN rate_limit_buckets.hits
                  WHEN rate_limit_buckets.expires_at<=clock_timestamp() THEN 1 ELSE rate_limit_buckets.hits+1 END,
        expires_at=CASE WHEN rate_limit_buckets.expires_at<=clock_timestamp()
                       AND COALESCE(rate_limit_buckets.blocked_until<=clock_timestamp(),true)
                       THEN clock_timestamp()+$2::int*interval '1 millisecond' ELSE rate_limit_buckets.expires_at END,
        blocked_until=CASE WHEN rate_limit_buckets.blocked_until>clock_timestamp() THEN rate_limit_buckets.blocked_until
                           WHEN rate_limit_buckets.expires_at<=clock_timestamp() THEN NULL
                           WHEN rate_limit_buckets.hits+1>$3 THEN clock_timestamp()+$4::int*interval '1 millisecond' ELSE NULL END
      RETURNING hits,expires_at,blocked_until`, [key,ttl,limit,blockDuration]);
    const row = result.rows[0];
    const blockRemaining = row.blocked_until ? Math.max(0, Math.ceil((row.blocked_until.getTime() - Date.now()) / 1000)) : 0;
    return {
      totalHits: row.hits,
      timeToExpire: Math.max(0, Math.ceil((row.expires_at.getTime() - Date.now()) / 1000)),
      isBlocked: blockRemaining > 0,
      timeToBlockExpire: blockRemaining,
    };
  }
}

@Global()
@Module({
  imports: [ThrottlerModule.forRootAsync({
    inject: [Db],
    useFactory: (db: Db) => ({
      throttlers: [{ ttl: 60_000, limit: 10 }],
      storage: new PostgresThrottlerStorage(db),
      errorMessage: 'Terlalu banyak percobaan. Silakan tunggu sebentar dan coba lagi.',
    }),
  })],
  exports: [ThrottlerModule],
})
export class RateLimitModule {}
