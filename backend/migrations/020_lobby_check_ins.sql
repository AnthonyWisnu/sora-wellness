CREATE TABLE lobby_check_ins (
  booking_id uuid PRIMARY KEY REFERENCES bookings(id) ON DELETE CASCADE,
  checked_by uuid NOT NULL REFERENCES app_users(id),
  checked_at timestamptz NOT NULL DEFAULT now()
);
-- Histori attendance tidak disalin: sumber lobi/matras lama tidak selalu dapat dibuktikan.
ALTER TABLE attendance ADD COLUMN source text NOT NULL DEFAULT 'legacy_unknown'
  CHECK (source IN ('legacy_unknown','coach','admin_correction'));
