CREATE TABLE rate_limit_buckets (
  key text PRIMARY KEY,
  hits integer NOT NULL CHECK (hits > 0),
  expires_at timestamptz NOT NULL,
  blocked_until timestamptz
);
CREATE INDEX rate_limit_buckets_expiry_idx ON rate_limit_buckets(expires_at);
