-- Migrasi 010: Hirarki 5 Peran Enterprise (superadmin, finance, admin, coach, customer)

ALTER TABLE app_users DROP CONSTRAINT IF EXISTS app_users_role_check;
ALTER TABLE app_users ADD CONSTRAINT app_users_role_check CHECK (role IN ('superadmin', 'finance', 'admin', 'coach', 'customer'));
