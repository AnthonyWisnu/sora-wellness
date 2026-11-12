ALTER TABLE event_registrations ADD COLUMN access_token text NOT NULL
  DEFAULT replace(gen_random_uuid()::text||gen_random_uuid()::text,'-','');
CREATE UNIQUE INDEX event_ticket_access_idx ON event_registrations(access_token);
