ALTER TABLE bookings ADD COLUMN cancellation_origin text CHECK (cancellation_origin IN ('customer', 'studio'));
CREATE INDEX bookings_cancelled_origin_idx ON bookings (session_id, cancellation_origin) WHERE status='cancelled';
