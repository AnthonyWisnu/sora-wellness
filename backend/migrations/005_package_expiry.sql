ALTER TABLE package_purchases ADD COLUMN expires_at timestamptz;
CREATE INDEX package_purchases_expiry_idx ON package_purchases (expires_at) WHERE status='pending_payment';
