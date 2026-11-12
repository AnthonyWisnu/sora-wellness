-- Cabut credential publik dan sesi terkait, termasuk instalasi yang telah menjalankan014.
-- Hash non-scrypt tidak bisa dipakai login. Pemulihan melalui provisioning operator.
WITH revoked AS (
  UPDATE app_users SET password_hash='disabled$' || gen_random_uuid()::text,
    password_change_required=true, updated_at=now()
  WHERE password_hash='scrypt$131072$8$1$48c5ecf4721f23c6f9d7e1f234106321$3d45ffbc936187345adb52834899995bf7f7895a072091b4b8644e0817f71002104af103a3787d493d4fb6d247c068f5746703900dcb47b2000f873ea9f3e62d'
  RETURNING id
)
DELETE FROM "session" WHERE sess->>'userId' IN (SELECT id::text FROM revoked);
