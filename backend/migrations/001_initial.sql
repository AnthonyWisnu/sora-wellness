CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS citext;
CREATE EXTENSION IF NOT EXISTS btree_gist;

CREATE TABLE app_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email citext NOT NULL UNIQUE,
  full_name text NOT NULL,
  role text NOT NULL CHECK (role IN ('admin', 'coach', 'customer')),
  password_hash text NOT NULL,
  password_change_required boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Matches connect-pg-simple's supported schema. Sessions stay in PostgreSQL.
CREATE TABLE "session" (
  sid varchar PRIMARY KEY,
  sess json NOT NULL,
  expire timestamp(6) NOT NULL
);
CREATE INDEX session_expire_idx ON "session" (expire);

CREATE TABLE audit_logs (
  id bigserial PRIMARY KEY,
  actor_id uuid REFERENCES app_users(id),
  target_user_id uuid REFERENCES app_users(id),
  action text NOT NULL,
  reason text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE studio (
  id integer PRIMARY KEY CHECK (id = 1),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  description text NOT NULL DEFAULT '',
  address text NOT NULL DEFAULT '',
  timezone text NOT NULL DEFAULT 'Asia/Makassar',
  hero_title text NOT NULL DEFAULT '',
  hero_subtitle text NOT NULL DEFAULT '',
  logo_media_id uuid,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE studio_policy (
  studio_id integer PRIMARY KEY REFERENCES studio(id),
  guest_schedule_days integer NOT NULL DEFAULT 7 CHECK (guest_schedule_days BETWEEN 1 AND 90),
  member_schedule_days integer NOT NULL DEFAULT 30 CHECK (member_schedule_days BETWEEN 1 AND 180),
  booking_cutoff_minutes integer NOT NULL DEFAULT 120 CHECK (booking_cutoff_minutes BETWEEN 0 AND 10080),
  cancellation_cutoff_minutes integer NOT NULL DEFAULT 1440 CHECK (cancellation_cutoff_minutes BETWEEN 0 AND 10080),
  seat_hold_minutes integer NOT NULL DEFAULT 15 CHECK (seat_hold_minutes BETWEEN 1 AND 60),
  monthly_class_quota integer NOT NULL DEFAULT 8 CHECK (monthly_class_quota BETWEEN 0 AND 100),
  locker_enabled boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE media_assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  filename text NOT NULL,
  mime_type text NOT NULL CHECK (mime_type IN ('image/jpeg', 'image/png', 'image/webp')),
  byte_size integer NOT NULL CHECK (byte_size BETWEEN 1 AND 5242880),
  storage_path text NOT NULL UNIQUE,
  uploaded_by uuid NOT NULL REFERENCES app_users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE studio ADD CONSTRAINT studio_logo_media_fk FOREIGN KEY (logo_media_id) REFERENCES media_assets(id);

CREATE TABLE class_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  category text NOT NULL,
  level text NOT NULL CHECK (level IN ('beginner', 'intermediate_1', 'intermediate_2')),
  description text NOT NULL DEFAULT '',
  duration_minutes integer NOT NULL CHECK (duration_minutes BETWEEN 15 AND 480),
  default_capacity integer NOT NULL CHECK (default_capacity BETWEEN 1 AND 500),
  default_price_idr integer NOT NULL CHECK (default_price_idr >= 0),
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE schedule_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  class_type_id uuid NOT NULL REFERENCES class_types(id),
  coach_id uuid NOT NULL REFERENCES app_users(id),
  iso_weekday smallint NOT NULL CHECK (iso_weekday BETWEEN 1 AND 7),
  local_start_time time NOT NULL,
  starts_on date NOT NULL,
  ends_on date,
  capacity integer NOT NULL CHECK (capacity BETWEEN 1 AND 500),
  price_idr integer NOT NULL CHECK (price_idr >= 0),
  active boolean NOT NULL DEFAULT true,
  CHECK (ends_on IS NULL OR ends_on >= starts_on)
);

CREATE TABLE class_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  class_type_id uuid NOT NULL REFERENCES class_types(id),
  schedule_rule_id uuid REFERENCES schedule_rules(id),
  coach_id uuid NOT NULL REFERENCES app_users(id),
  local_date date NOT NULL,
  starts_at timestamptz NOT NULL,
  ends_at timestamptz NOT NULL,
  capacity integer NOT NULL CHECK (capacity BETWEEN 1 AND 500),
  price_idr integer NOT NULL CHECK (price_idr >= 0),
  status text NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'cancelled', 'finished')),
  cancelled_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (ends_at > starts_at),
  UNIQUE (schedule_rule_id, local_date)
);
CREATE INDEX class_sessions_starts_idx ON class_sessions (starts_at) WHERE status = 'scheduled';
CREATE INDEX class_sessions_coach_idx ON class_sessions (coach_id, starts_at);

CREATE TABLE package_options (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  duration_months integer NOT NULL UNIQUE CHECK (duration_months BETWEEN 1 AND 36),
  price_idr integer NOT NULL CHECK (price_idr >= 0),
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE package_purchases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES app_users(id),
  package_option_id uuid NOT NULL REFERENCES package_options(id),
  amount_idr integer NOT NULL CHECK (amount_idr >= 0),
  status text NOT NULL CHECK (status IN ('pending_payment', 'paid', 'expired', 'failed')),
  created_at timestamptz NOT NULL DEFAULT now(),
  paid_at timestamptz
);
CREATE INDEX package_purchases_customer_idx ON package_purchases (customer_id, created_at DESC);

CREATE TABLE memberships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES app_users(id),
  purchase_id uuid UNIQUE REFERENCES package_purchases(id),
  starts_on date NOT NULL,
  ends_on date NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (ends_on >= starts_on),
  EXCLUDE USING gist (customer_id WITH =, daterange(starts_on, ends_on, '[]') WITH &&)
);
CREATE INDEX memberships_customer_dates_idx ON memberships (customer_id, starts_on, ends_on);

CREATE TABLE bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES app_users(id),
  session_id uuid NOT NULL REFERENCES class_sessions(id),
  status text NOT NULL CHECK (status IN ('pending_payment', 'confirmed', 'cancelled', 'expired')),
  source text NOT NULL CHECK (source IN ('free', 'quota', 'single')),
  price_idr integer NOT NULL CHECK (price_idr >= 0),
  wallet_reserved_idr integer NOT NULL DEFAULT 0 CHECK (wallet_reserved_idr >= 0),
  gateway_due_idr integer NOT NULL DEFAULT 0 CHECK (gateway_due_idr >= 0),
  quota_retained boolean NOT NULL DEFAULT false,
  hold_expires_at timestamptz,
  idempotency_key text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  confirmed_at timestamptz,
  cancelled_at timestamptz,
  UNIQUE (customer_id, idempotency_key),
  CHECK (wallet_reserved_idr + gateway_due_idr <= price_idr),
  CHECK (status <> 'pending_payment' OR hold_expires_at IS NOT NULL)
);
CREATE UNIQUE INDEX bookings_one_active_per_customer_session
  ON bookings (customer_id, session_id)
  WHERE status IN ('pending_payment', 'confirmed');
CREATE INDEX bookings_session_status_idx ON bookings (session_id, status, hold_expires_at);
CREATE INDEX bookings_customer_created_idx ON bookings (customer_id, created_at DESC);

CREATE TABLE wallet_accounts (
  customer_id uuid PRIMARY KEY REFERENCES app_users(id),
  balance_idr bigint NOT NULL DEFAULT 0 CHECK (balance_idr >= 0),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE wallet_entries (
  id bigserial PRIMARY KEY,
  customer_id uuid NOT NULL REFERENCES wallet_accounts(customer_id),
  booking_id uuid REFERENCES bookings(id),
  amount_idr bigint NOT NULL CHECK (amount_idr <> 0),
  balance_after_idr bigint NOT NULL CHECK (balance_after_idr >= 0),
  kind text NOT NULL CHECK (kind IN ('class_refund', 'late_payment', 'class_purchase', 'reservation_release', 'correction')),
  reference text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX wallet_entries_customer_idx ON wallet_entries (customer_id, id DESC);

CREATE TABLE payment_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid REFERENCES bookings(id),
  package_purchase_id uuid REFERENCES package_purchases(id),
  order_id text NOT NULL UNIQUE,
  gross_amount_idr integer NOT NULL CHECK (gross_amount_idr >= 0),
  status text NOT NULL CHECK (status IN ('pending', 'success', 'failed', 'expired')),
  provider_status text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK ((booking_id IS NULL) <> (package_purchase_id IS NULL))
);

CREATE TABLE health_profiles (
  customer_id uuid PRIMARY KEY REFERENCES app_users(id),
  note text NOT NULL,
  consented_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE health_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL UNIQUE REFERENCES bookings(id),
  customer_id uuid NOT NULL REFERENCES app_users(id),
  note text NOT NULL,
  captured_at timestamptz NOT NULL DEFAULT now(),
  delete_after timestamptz NOT NULL
);
CREATE INDEX health_snapshots_delete_idx ON health_snapshots (delete_after);

CREATE TABLE attendance (
  session_id uuid NOT NULL REFERENCES class_sessions(id),
  customer_id uuid NOT NULL REFERENCES app_users(id),
  booking_id uuid NOT NULL UNIQUE REFERENCES bookings(id),
  present boolean NOT NULL,
  recorded_by uuid NOT NULL REFERENCES app_users(id),
  recorded_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (session_id, customer_id)
);

CREATE TABLE lockers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  active boolean NOT NULL DEFAULT true
);
CREATE TABLE locker_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  locker_id uuid NOT NULL REFERENCES lockers(id),
  customer_id uuid NOT NULL REFERENCES app_users(id),
  assigned_by uuid NOT NULL REFERENCES app_users(id),
  assigned_at timestamptz NOT NULL DEFAULT now(),
  released_at timestamptz
);
CREATE UNIQUE INDEX one_active_assignment_per_locker ON locker_assignments (locker_id) WHERE released_at IS NULL;
CREATE UNIQUE INDEX one_active_locker_per_customer ON locker_assignments (customer_id) WHERE released_at IS NULL;
