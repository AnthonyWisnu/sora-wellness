ALTER TABLE studio ADD COLUMN IF NOT EXISTS booking_code_prefix VARCHAR(6) NOT NULL DEFAULT 'SORA';

ALTER TABLE bookings ADD COLUMN IF NOT EXISTS booking_code VARCHAR(32) UNIQUE;
CREATE INDEX IF NOT EXISTS idx_bookings_booking_code ON bookings (booking_code);

ALTER TABLE app_users ADD COLUMN IF NOT EXISTS avatar_media_id UUID REFERENCES media_assets(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_app_users_avatar ON app_users (avatar_media_id);

UPDATE bookings
SET booking_code = 'SORA-' || to_char(created_at, 'YYMMDD') || '-' || upper(substr(md5(id::text), 1, 4))
WHERE booking_code IS NULL;
