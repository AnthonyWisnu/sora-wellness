-- Migrasi 017: Isolasi Foto Profil Pengguna (purpose = 'avatar')

-- 1. Perbarui constraint check pada kolom purpose di tabel media_assets
ALTER TABLE media_assets DROP CONSTRAINT IF EXISTS media_assets_purpose_check;
ALTER TABLE media_assets ADD CONSTRAINT media_assets_purpose_check CHECK (purpose IN ('public', 'withdrawal_proof', 'avatar'));

-- 2. Migrasikan berkas media yang sedang dipakai sebagai avatar pengguna
UPDATE media_assets 
SET purpose = 'avatar' 
WHERE id IN (
  SELECT avatar_media_id 
  FROM app_users 
  WHERE avatar_media_id IS NOT NULL
);

-- 3. Pastikan media dengan nama awalan avatar juga disesuaikan jika tertinggal
UPDATE media_assets
SET purpose = 'avatar'
WHERE storage_path LIKE 'avatar-%' AND purpose = 'public';
