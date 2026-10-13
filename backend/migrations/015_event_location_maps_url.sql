-- Migrasi 015: Penambahan Kolom URL Google Maps pada Event Komunitas

ALTER TABLE community_events
  ADD COLUMN IF NOT EXISTS location_maps_url text NOT NULL DEFAULT '';
