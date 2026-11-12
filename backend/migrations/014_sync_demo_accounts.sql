-- Tidak memasang akun atau sandi demo melalui migrasi schema.
-- Gunakan demo:setup pada database lokal Sandbox saja.
ALTER TABLE app_users DROP CONSTRAINT IF EXISTS app_users_role_check;
ALTER TABLE app_users ADD CONSTRAINT app_users_role_check CHECK (role IN ('superadmin', 'admin', 'coach', 'customer'));
