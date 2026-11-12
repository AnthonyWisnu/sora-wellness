import { Db } from '../src/shared/db';
import { hashPassword } from '../src/shared/security';

// Jalur operator lokal, tidak diekspos melalui HTTP atau dijalankan oleh migrasi.
async function main() {
  const email = process.env.PROVISION_OWNER_EMAIL?.trim().toLowerCase();
  const password = process.env.PROVISION_OWNER_PASSWORD;
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !password || password.length < 16 || password.length > 128) {
    throw new Error('Isi PROVISION_OWNER_EMAIL dan PROVISION_OWNER_PASSWORD (16-128 karakter) melalui environment operator');
  }
  if (process.env.PROVISION_OWNER_CONFIRM !== email) throw new Error('PROVISION_OWNER_CONFIRM harus sama dengan email owner yang dipulihkan');
  const hash = await hashPassword(password);
  const db = new Db();
  try {
    await db.transaction(async client => {
      const user = await client.query<{ id: string }>(`INSERT INTO app_users(email,full_name,role,password_hash,password_change_required)
        VALUES($1,'Owner Studio','superadmin',$2,true)
        ON CONFLICT(email) DO UPDATE SET role='superadmin',password_hash=$2,password_change_required=true,updated_at=now()
        RETURNING id`, [email, hash]);
      await client.query(`DELETE FROM "session" WHERE sess->>'userId'=$1`, [user.rows[0].id]);
      await client.query(`INSERT INTO audit_logs(target_user_id,action,reason) VALUES($1,'operator_provision_owner','Pemulihan operator melalui CLI')`, [user.rows[0].id]);
    });
    process.stdout.write('Owner disiapkan. Login dan ganti kata sandi sementara. Tidak ada credential yang dicetak.\n');
  } finally {
    delete process.env.PROVISION_OWNER_PASSWORD;
    await db.onModuleDestroy();
  }
}

void main().catch(() => {
  process.stderr.write('Provisioning owner gagal. Periksa input operator dan koneksi database, credential tidak dicetak.\n');
  process.exitCode = 1;
});
