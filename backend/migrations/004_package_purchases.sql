ALTER TABLE package_purchases ADD COLUMN idempotency_key text;
ALTER TABLE package_purchases ADD COLUMN duration_months integer CHECK (duration_months BETWEEN 1 AND 36);
CREATE UNIQUE INDEX package_purchases_idempotency_idx ON package_purchases (customer_id, idempotency_key);
CREATE UNIQUE INDEX package_purchases_one_pending_idx ON package_purchases (customer_id) WHERE status='pending_payment';
