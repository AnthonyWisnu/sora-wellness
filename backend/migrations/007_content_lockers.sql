ALTER TABLE studio ADD COLUMN hero_media_id uuid REFERENCES media_assets(id);

CREATE TABLE studio_gallery (
  studio_id integer NOT NULL REFERENCES studio(id),
  media_id uuid NOT NULL REFERENCES media_assets(id),
  position integer NOT NULL CHECK (position BETWEEN 0 AND 11),
  PRIMARY KEY (studio_id, media_id),
  UNIQUE (studio_id, position)
);

ALTER TABLE locker_assignments ADD COLUMN membership_id uuid REFERENCES memberships(id);
UPDATE locker_assignments a SET membership_id = (
  SELECT m.id FROM memberships m JOIN studio s ON s.id=1
  WHERE m.customer_id=a.customer_id
    AND m.starts_on <= (a.assigned_at AT TIME ZONE s.timezone)::date
    AND m.ends_on >= (a.assigned_at AT TIME ZONE s.timezone)::date
  ORDER BY m.ends_on DESC LIMIT 1
) WHERE a.released_at IS NULL;
UPDATE locker_assignments SET released_at=now() WHERE released_at IS NULL AND membership_id IS NULL;
ALTER TABLE locker_assignments ADD CONSTRAINT active_locker_has_membership CHECK (released_at IS NOT NULL OR membership_id IS NOT NULL);
CREATE INDEX locker_assignments_membership_idx ON locker_assignments (membership_id) WHERE released_at IS NULL;
CREATE UNIQUE INDEX lockers_code_case_insensitive_idx ON lockers (upper(code));
