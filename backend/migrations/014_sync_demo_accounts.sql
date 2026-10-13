-- Migrasi 014: Sinkronisasi Akun Demo Resmi dan Penyeragaman Kata Sandi
-- Menjamin database lokal dan lingkungan deploy VPS memiliki kredensial seragam

-- 1. Pastikan konstrain role siap
ALTER TABLE app_users DROP CONSTRAINT IF EXISTS app_users_role_check;
ALTER TABLE app_users ADD CONSTRAINT app_users_role_check CHECK (role IN ('superadmin', 'admin', 'coach', 'customer'));

-- 2. Upsert Akun Superadmin
INSERT INTO app_users (email, full_name, role, password_hash, password_change_required, permissions)
VALUES (
  'superadmin@sora.example.test',
  'Superadmin Sora',
  'superadmin',
  'scrypt$131072$8$1$48c5ecf4721f23c6f9d7e1f234106321$3d45ffbc936187345adb52834899995bf7f7895a072091b4b8644e0817f71002104af103a3787d493d4fb6d247c068f5746703900dcb47b2000f873ea9f3e62d',
  false,
  ARRAY['front_desk', 'lockers', 'classes_schedule', 'community_events', 'studio_content', 'studio_policy', 'finance_reports', 'finance_payouts', 'staff_management']
)
ON CONFLICT (email) DO UPDATE
SET full_name = EXCLUDED.full_name,
    role = EXCLUDED.role,
    password_hash = EXCLUDED.password_hash,
    password_change_required = false,
    permissions = EXCLUDED.permissions;

-- 3. Upsert Akun Staf Admin (Finansial)
INSERT INTO app_users (email, full_name, role, password_hash, password_change_required, permissions)
VALUES (
  'finance@sora.example.test',
  'Finance Sora',
  'admin',
  'scrypt$131072$8$1$48c5ecf4721f23c6f9d7e1f234106321$3d45ffbc936187345adb52834899995bf7f7895a072091b4b8644e0817f71002104af103a3787d493d4fb6d247c068f5746703900dcb47b2000f873ea9f3e62d',
  false,
  ARRAY['finance_reports', 'finance_payouts']
)
ON CONFLICT (email) DO UPDATE
SET full_name = EXCLUDED.full_name,
    role = EXCLUDED.role,
    password_hash = EXCLUDED.password_hash,
    password_change_required = false,
    permissions = EXCLUDED.permissions;

-- 4. Upsert Akun Staf Admin (Meja Depan & Loker)
INSERT INTO app_users (email, full_name, role, password_hash, password_change_required, permissions)
VALUES (
  'admin@sora.example.test',
  'Admin Sora',
  'admin',
  'scrypt$131072$8$1$48c5ecf4721f23c6f9d7e1f234106321$3d45ffbc936187345adb52834899995bf7f7895a072091b4b8644e0817f71002104af103a3787d493d4fb6d247c068f5746703900dcb47b2000f873ea9f3e62d',
  false,
  ARRAY['front_desk', 'lockers']
)
ON CONFLICT (email) DO UPDATE
SET full_name = EXCLUDED.full_name,
    role = EXCLUDED.role,
    password_hash = EXCLUDED.password_hash,
    password_change_required = false,
    permissions = EXCLUDED.permissions;

-- 5. Upsert Akun Pelatih
INSERT INTO app_users (email, full_name, role, password_hash, password_change_required, permissions)
VALUES (
  'nadia@sora.example.test',
  'Nadia Putri',
  'coach',
  'scrypt$131072$8$1$48c5ecf4721f23c6f9d7e1f234106321$3d45ffbc936187345adb52834899995bf7f7895a072091b4b8644e0817f71002104af103a3787d493d4fb6d247c068f5746703900dcb47b2000f873ea9f3e62d',
  false,
  '{}'
)
ON CONFLICT (email) DO UPDATE
SET full_name = EXCLUDED.full_name,
    role = EXCLUDED.role,
    password_hash = EXCLUDED.password_hash,
    password_change_required = false;

INSERT INTO app_users (email, full_name, role, password_hash, password_change_required, permissions)
VALUES (
  'arya@sora.example.test',
  'Made Arya',
  'coach',
  'scrypt$131072$8$1$48c5ecf4721f23c6f9d7e1f234106321$3d45ffbc936187345adb52834899995bf7f7895a072091b4b8644e0817f71002104af103a3787d493d4fb6d247c068f5746703900dcb47b2000f873ea9f3e62d',
  false,
  '{}'
)
ON CONFLICT (email) DO UPDATE
SET full_name = EXCLUDED.full_name,
    role = EXCLUDED.role,
    password_hash = EXCLUDED.password_hash,
    password_change_required = false;

-- 6. Upsert Akun Pelanggan (Customer)
INSERT INTO app_users (email, full_name, role, password_hash, password_change_required, permissions)
VALUES
  ('ayu.lestari@sora.example.test', 'Ayu Lestari', 'customer', 'scrypt$131072$8$1$48c5ecf4721f23c6f9d7e1f234106321$3d45ffbc936187345adb52834899995bf7f7895a072091b4b8644e0817f71002104af103a3787d493d4fb6d247c068f5746703900dcb47b2000f873ea9f3e62d', false, '{}'),
  ('dimas.saputra@sora.example.test', 'Dimas Saputra', 'customer', 'scrypt$131072$8$1$48c5ecf4721f23c6f9d7e1f234106321$3d45ffbc936187345adb52834899995bf7f7895a072091b4b8644e0817f71002104af103a3787d493d4fb6d247c068f5746703900dcb47b2000f873ea9f3e62d', false, '{}'),
  ('lila.mahendra@sora.example.test', 'Lila Mahendra', 'customer', 'scrypt$131072$8$1$48c5ecf4721f23c6f9d7e1f234106321$3d45ffbc936187345adb52834899995bf7f7895a072091b4b8644e0817f71002104af103a3787d493d4fb6d247c068f5746703900dcb47b2000f873ea9f3e62d', false, '{}'),
  ('maya.kirana@sora.example.test', 'Maya Kirana', 'customer', 'scrypt$131072$8$1$48c5ecf4721f23c6f9d7e1f234106321$3d45ffbc936187345adb52834899995bf7f7895a072091b4b8644e0817f71002104af103a3787d493d4fb6d247c068f5746703900dcb47b2000f873ea9f3e62d', false, '{}'),
  ('raka.pratama@sora.example.test', 'Raka Pratama', 'customer', 'scrypt$131072$8$1$48c5ecf4721f23c6f9d7e1f234106321$3d45ffbc936187345adb52834899995bf7f7895a072091b4b8644e0817f71002104af103a3787d493d4fb6d247c068f5746703900dcb47b2000f873ea9f3e62d', false, '{}'),
  ('sinta.dewi@sora.example.test', 'Sinta Dewi', 'customer', 'scrypt$131072$8$1$48c5ecf4721f23c6f9d7e1f234106321$3d45ffbc936187345adb52834899995bf7f7895a072091b4b8644e0817f71002104af103a3787d493d4fb6d247c068f5746703900dcb47b2000f873ea9f3e62d', false, '{}')
ON CONFLICT (email) DO UPDATE
SET full_name = EXCLUDED.full_name,
    password_hash = EXCLUDED.password_hash,
    password_change_required = false;

-- 7. Pastikan dompet (wallet_accounts) tersedia untuk pelanggan
INSERT INTO wallet_accounts (customer_id, balance_idr)
SELECT id, 0 FROM app_users WHERE role = 'customer'
ON CONFLICT (customer_id) DO NOTHING;

-- 8. Sinkronkan juga akun warisan lama jika ada di server (admin@sora.test / nadia@sora.test)
UPDATE app_users
SET password_hash = 'scrypt$131072$8$1$48c5ecf4721f23c6f9d7e1f234106321$3d45ffbc936187345adb52834899995bf7f7895a072091b4b8644e0817f71002104af103a3787d493d4fb6d247c068f5746703900dcb47b2000f873ea9f3e62d',
    password_change_required = false
WHERE email IN ('admin@sora.test', 'nadia@sora.test');
