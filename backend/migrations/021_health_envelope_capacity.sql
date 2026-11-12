-- Expand untuk envelope terenkripsi. Enkripsi data lama dilakukan CLI dengan kunci
-- aplikasi terpisah, tidak menaruh key di migrasi SQL atau database.
ALTER TABLE health_profiles DROP CONSTRAINT IF EXISTS health_profiles_note_check;
ALTER TABLE health_profile_revisions DROP CONSTRAINT IF EXISTS health_profile_revisions_note_check;
ALTER TABLE health_snapshots DROP CONSTRAINT IF EXISTS health_snapshots_note_check;
ALTER TABLE health_profiles ADD CONSTRAINT health_profiles_envelope_size CHECK (char_length(note) BETWEEN 1 AND 16000);
ALTER TABLE health_profile_revisions ADD CONSTRAINT health_revisions_envelope_size CHECK (char_length(note) BETWEEN 1 AND 16000);
ALTER TABLE health_snapshots ADD CONSTRAINT health_snapshots_envelope_size CHECK (char_length(note) BETWEEN 1 AND 16000);
