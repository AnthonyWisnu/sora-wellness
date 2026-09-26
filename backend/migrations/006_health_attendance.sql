CREATE TABLE health_profile_revisions (
  id bigserial PRIMARY KEY,
  customer_id uuid NOT NULL REFERENCES app_users(id),
  note text NOT NULL CHECK (char_length(note) BETWEEN 1 AND 2000),
  recorded_at timestamptz NOT NULL DEFAULT clock_timestamp()
);
CREATE INDEX health_revisions_customer_time_idx ON health_profile_revisions (customer_id, recorded_at DESC, id DESC);
INSERT INTO health_profile_revisions (customer_id,note,recorded_at)
SELECT customer_id,note,updated_at FROM health_profiles;

CREATE TABLE attendance_corrections (
  id bigserial PRIMARY KEY,
  session_id uuid NOT NULL REFERENCES class_sessions(id),
  customer_id uuid NOT NULL REFERENCES app_users(id),
  booking_id uuid NOT NULL REFERENCES bookings(id),
  actor_id uuid NOT NULL REFERENCES app_users(id),
  previous_present boolean,
  new_present boolean NOT NULL,
  reason text NOT NULL CHECK (char_length(reason) BETWEEN 5 AND 500),
  corrected_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX attendance_corrections_session_idx ON attendance_corrections (session_id, corrected_at DESC);
