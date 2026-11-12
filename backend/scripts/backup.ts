import { execFileSync } from 'node:child_process';
import { chmodSync } from 'node:fs';
import { isAbsolute } from 'node:path';

function main() {
  const target = process.env.SORA_BACKUP_FILE;
  if (!target || !isAbsolute(target) || !target.endsWith('.dump')) throw new Error('Target backup absolut .dump wajib diberikan');
  const url = new URL(process.env.DATABASE_URL ?? '');
  if (!['postgres:', 'postgresql:'].includes(url.protocol)) throw new Error('DATABASE_URL tidak valid');
  const env = {
    ...process.env,
    PGHOST: url.hostname, PGPORT: url.port || '5432',
    PGUSER: decodeURIComponent(url.username), PGPASSWORD: decodeURIComponent(url.password),
    PGDATABASE: decodeURIComponent(url.pathname.slice(1)),
  };
  execFileSync('pg_dump', ['--format=custom', '--no-owner', '--file', target], { env, stdio: ['ignore', 'ignore', 'pipe'] });
  chmodSync(target, 0o600);
  execFileSync('pg_restore', ['--list', target], { env, stdio: ['ignore', 'ignore', 'pipe'] });
  process.stdout.write('Backup arsip berhasil dibuat dan dibaca. Restore data tetap harus diuji terpisah.\n');
}

try { main(); } catch {
  process.stderr.write('Backup gagal; deployment dihentikan. Periksa akses dan alat PostgreSQL tanpa mencetak credential.\n');
  process.exitCode = 1;
}
