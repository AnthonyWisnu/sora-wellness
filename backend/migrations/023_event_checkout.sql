ALTER TABLE event_activities ADD COLUMN local_date date;
UPDATE event_activities a SET local_date=e.start_date FROM community_events e
  WHERE e.id=a.event_id AND e.start_date=e.end_date;
-- Event beberapa hari yang lama tidak diberi tanggal tebakan.
CREATE INDEX event_activity_date_idx ON event_activities(event_id,local_date);
ALTER TABLE event_registrations ADD COLUMN price_idr integer NOT NULL DEFAULT 0 CHECK (price_idr>=0);
ALTER TABLE event_registrations ADD COLUMN hold_expires_at timestamptz;
ALTER TABLE event_registrations ADD COLUMN idempotency_key text;
ALTER TABLE event_registrations DROP CONSTRAINT event_registrations_status_check;
ALTER TABLE event_registrations ADD CONSTRAINT event_registrations_status_check
  CHECK (status IN ('pending_payment','registered','attended','cancelled','expired','failed','credited'));
ALTER TABLE event_registrations ADD CONSTRAINT paid_event_requires_customer CHECK (price_idr=0 OR customer_id IS NOT NULL);
DROP INDEX idx_event_registrations_unique_guest;
CREATE UNIQUE INDEX idx_event_registrations_unique_guest ON event_registrations(activity_id,guest_email)
  WHERE status IN ('pending_payment','registered','attended');
CREATE UNIQUE INDEX event_checkout_idempotency ON event_registrations(customer_id,idempotency_key)
  WHERE idempotency_key IS NOT NULL;
ALTER TABLE payment_transactions ADD COLUMN event_registration_id uuid REFERENCES event_registrations(id);
DO $$ DECLARE constraint_name text; BEGIN
  FOR constraint_name IN SELECT conname FROM pg_constraint WHERE conrelid='payment_transactions'::regclass
    AND contype='c' AND pg_get_constraintdef(oid) LIKE '%booking_id%' AND pg_get_constraintdef(oid) LIKE '%package_purchase_id%'
  LOOP EXECUTE format('ALTER TABLE payment_transactions DROP CONSTRAINT %I',constraint_name); END LOOP;
END $$;
ALTER TABLE payment_transactions ADD CONSTRAINT payment_single_target
  CHECK (num_nonnulls(booking_id,package_purchase_id,event_registration_id)=1);
CREATE UNIQUE INDEX payment_one_per_event ON payment_transactions(event_registration_id) WHERE event_registration_id IS NOT NULL;
