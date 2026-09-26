import { randomBytes } from 'node:crypto';
import { readFile, rename, rm, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { Db } from '../src/shared/db';
import { hashPassword } from '../src/shared/security';

type Account = { name: string; email: string; role: 'admin' | 'coach' | 'customer'; password: string };

async function main() {
  const url = new URL(process.env.DATABASE_URL ?? '');
  if (!['localhost', '127.0.0.1', '::1'].includes(url.hostname) || url.port !== '55432' || process.env.NODE_ENV === 'production' || process.env.MIDTRANS_ENV !== 'sandbox') {
    throw new Error('Rotasi demo hanya boleh memakai PostgreSQL lokal port 55432 dan Midtrans Sandbox');
  }
  const file = resolve(process.cwd(), '.qa/demo-accounts.json');
  const current = JSON.parse(await readFile(file, 'utf8')) as { accounts: Account[] };
  if (!Array.isArray(current.accounts) || current.accounts.length !== 9 || new Set(current.accounts.map((row) => row.email)).size !== 9) {
    throw new Error('Daftar akun demo tidak sesuai; tidak ada sandi yang diubah');
  }
  const rotated = current.accounts.map(({ name, email, role }) => ({ name, email, role, password: randomBytes(18).toString('base64url') }));
  const staging = resolve(process.cwd(), `.qa/demo-accounts-rotated-${randomBytes(6).toString('hex')}.json`);
  await writeFile(staging, JSON.stringify({ accounts: rotated }, null, 2), { flag: 'wx', mode: 0o600 });
  const db = new Db();
  let committed = false;
  try {
    await db.transaction(async (client) => {
      const ids: string[] = [];
      for (const account of rotated) {
        const result = await client.query<{ id: string }>('UPDATE app_users SET password_hash=$1,updated_at=now() WHERE email=$2 AND role=$3 RETURNING id', [await hashPassword(account.password),account.email,account.role]);
        if (result.rowCount !== 1) throw new Error(`Akun demo tidak cocok: ${account.email}`);
        ids.push(result.rows[0].id);
      }
      await client.query(`DELETE FROM "session" WHERE sess->>'userId' = ANY($1::text[])`, [ids]);
    });
    committed = true;
    await rename(staging,file);
    process.stdout.write(`Sandi ${rotated.length} akun demo telah diperbarui. Baca file lokal backend/.qa/demo-accounts.json untuk login.\n`);
  } catch (error) {
    if (!committed) await rm(staging, { force: true });
    else process.stderr.write(`Database sudah diperbarui; sandi baru tersimpan di ${staging}. Pindahkan file itu ke ${file}.\n`);
    throw error;
  } finally {
    await db.onModuleDestroy();
  }
}

void main().catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.message : 'Rotasi gagal'}\n`);
  process.exitCode = 1;
});
