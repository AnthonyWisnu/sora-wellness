CREATE TABLE payment_settings (
  studio_id integer PRIMARY KEY REFERENCES studio(id),
  merchant_id text NOT NULL,
  client_key text NOT NULL,
  server_key_nonce bytea NOT NULL,
  server_key_ciphertext bytea NOT NULL,
  server_key_tag bytea NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE payment_transactions ADD COLUMN snap_token text;
ALTER TABLE payment_transactions ADD COLUMN redirect_url text;
ALTER TABLE payment_transactions ADD COLUMN processed_at timestamptz;
CREATE UNIQUE INDEX payment_one_per_booking ON payment_transactions (booking_id) WHERE booking_id IS NOT NULL;
CREATE UNIQUE INDEX payment_one_per_package ON payment_transactions (package_purchase_id) WHERE package_purchase_id IS NOT NULL;
