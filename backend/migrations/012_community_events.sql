-- Migrasi 012: Modul Manajemen Event Komunitas Luar Studio

CREATE TABLE IF NOT EXISTS community_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  location_name text NOT NULL,
  location_address text NOT NULL DEFAULT '',
  start_date date NOT NULL,
  end_date date NOT NULL,
  status text NOT NULL DEFAULT 'published' CHECK (status IN ('draft', 'published', 'completed', 'cancelled')),
  banner_media_id uuid REFERENCES media_assets(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_community_events_slug ON community_events (slug);
CREATE INDEX IF NOT EXISTS idx_community_events_status_dates ON community_events (status, start_date DESC);

CREATE TABLE IF NOT EXISTS event_activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES community_events(id) ON DELETE CASCADE,
  title text NOT NULL,
  category text NOT NULL DEFAULT 'Komunitas',
  coach_name text NOT NULL DEFAULT 'Instruktur Studio',
  start_time text NOT NULL,
  end_time text NOT NULL,
  capacity integer NOT NULL DEFAULT 30 CHECK (capacity >= 1),
  price_idr integer NOT NULL DEFAULT 0 CHECK (price_idr >= 0),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_event_activities_event ON event_activities (event_id);

CREATE TABLE IF NOT EXISTS event_registrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES community_events(id) ON DELETE CASCADE,
  activity_id uuid NOT NULL REFERENCES event_activities(id) ON DELETE CASCADE,
  customer_id uuid REFERENCES app_users(id) ON DELETE SET NULL,
  guest_name text NOT NULL,
  guest_email citext NOT NULL,
  guest_phone text NOT NULL DEFAULT '',
  ticket_code text NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'registered' CHECK (status IN ('registered', 'attended', 'cancelled')),
  attended_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_event_registrations_event ON event_registrations (event_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_event_registrations_code ON event_registrations (ticket_code);
CREATE UNIQUE INDEX IF NOT EXISTS idx_event_registrations_unique_guest ON event_registrations (activity_id, guest_email) WHERE status <> 'cancelled';
