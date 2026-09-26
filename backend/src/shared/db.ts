import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { Pool, PoolClient, QueryResultRow } from 'pg';

@Injectable()
export class Db implements OnModuleDestroy {
  readonly pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 20 });

  query<T extends QueryResultRow = QueryResultRow>(sql: string, values: unknown[] = []) {
    return this.pool.query<T>(sql, values);
  }

  async transaction<T>(action: (client: PoolClient) => Promise<T>): Promise<T> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const result = await action(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async onModuleDestroy() { await this.pool.end(); }
}
