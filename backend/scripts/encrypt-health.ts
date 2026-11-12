import { Db } from '../src/shared/db';
import { decryptHealth, encryptHealth } from '../src/health/health-crypto';

async function main() {
  encryptHealth('Preflight', 'preflight');
  const apply = process.env.HEALTH_MIGRATION_APPLY === '1';
  const prefix = `health:v1:${process.env.HEALTH_DATA_KEY_ID}:%`;
  const db = new Db();
  try {
    for (const [table, primaryKey] of [['health_profiles','customer_id'],['health_profile_revisions','id'],['health_snapshots','id']] as const) {
      const count = await db.query<{ count: number }>(`SELECT count(*)::int AS count FROM ${table} WHERE note NOT LIKE $1`, [prefix]);
      if (!apply) { process.stdout.write(`${table}: ${count.rows[0].count} baris perlu migrasi, dry run.\n`); continue; }
      let migrated = 0;
      for (;;) {
        const processed = await db.transaction(async client => {
          const rows = await client.query<{ id: string; customer_id: string; note: string }>(
            `SELECT ${primaryKey} AS id,customer_id,note FROM ${table} WHERE note NOT LIKE $1 LIMIT 100 FOR UPDATE`, [prefix]);
          for (const row of rows.rows) {
            const plaintext = row.note.startsWith('health:v1:') ? decryptHealth(row.note,row.customer_id) : row.note;
            if (!plaintext || Array.from(plaintext).length > 2000) throw new Error('Isi lama tidak valid');
            await client.query(`UPDATE ${table} SET note=$1 WHERE ${primaryKey}=$2`, [encryptHealth(plaintext,row.customer_id),row.id]);
          }
          return rows.rowCount ?? 0;
        });
        migrated += processed;
        if (!processed) break;
      }
      process.stdout.write(`${table}: ${migrated} baris dimigrasikan.\n`);
    }
  } finally { await db.onModuleDestroy(); }
}

void main().catch(() => {
  process.stderr.write('Migrasi kesehatan gagal. Jangan hapus key lama atau backup; isi kesehatan dan credential tidak dicetak.\n');
  process.exitCode = 1;
});
