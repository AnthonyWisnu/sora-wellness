-- Migrasi 016: Privasi Bukti Transfer Payout dan Kolom Purpose pada media_assets

-- 1. Tambah kolom purpose pada tabel media_assets
ALTER TABLE media_assets ADD COLUMN IF NOT EXISTS purpose text NOT NULL DEFAULT 'public' CHECK (purpose IN ('public', 'withdrawal_proof'));

-- 2. Tambah indeks untuk pencarian berdasarkan tujuan penggunaan
CREATE INDEX IF NOT EXISTS idx_media_assets_purpose ON media_assets (purpose);
