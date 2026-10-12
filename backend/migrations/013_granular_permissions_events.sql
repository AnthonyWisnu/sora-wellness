-- Migrasi 013: Matriks Izin Staf Granular dan Pembaruan Sub-kegiatan Event Komunitas

-- 1. Tambah kolom permissions pada app_users
ALTER TABLE app_users ADD COLUMN IF NOT EXISTS permissions text[] NOT NULL DEFAULT '{}';

-- 2. Migrasi akun eksisting role 'finance' menjadi 'admin' dengan izin modular
UPDATE app_users
SET role = 'admin',
    permissions = ARRAY['finance_reports', 'finance_payouts']
WHERE role = 'finance';

-- 3. Perbarui konstrain role agar tetap konsisten
ALTER TABLE app_users DROP CONSTRAINT IF EXISTS app_users_role_check;
ALTER TABLE app_users ADD CONSTRAINT app_users_role_check CHECK (role IN ('superadmin', 'admin', 'coach', 'customer'));

-- 4. Tambah kolom relasi katalog jenis kelas dan pelatih pada event_activities
ALTER TABLE event_activities ADD COLUMN IF NOT EXISTS class_type_id uuid REFERENCES class_types(id) ON DELETE SET NULL;
ALTER TABLE event_activities ADD COLUMN IF NOT EXISTS coach_id uuid REFERENCES app_users(id) ON DELETE SET NULL;
ALTER TABLE event_activities ADD COLUMN IF NOT EXISTS is_guest_coach boolean NOT NULL DEFAULT false;
ALTER TABLE event_activities ADD COLUMN IF NOT EXISTS guest_coach_name text NULL;

CREATE INDEX IF NOT EXISTS idx_event_activities_coach ON event_activities (coach_id);
CREATE INDEX IF NOT EXISTS idx_event_activities_class_type ON event_activities (class_type_id);
