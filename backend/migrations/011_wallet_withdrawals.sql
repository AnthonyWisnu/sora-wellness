-- Migrasi 011: Tabel Pengajuan Penarikan Saldo Dompet & Dukungan Jenis Payout

ALTER TABLE wallet_entries DROP CONSTRAINT IF EXISTS wallet_entries_kind_check;
ALTER TABLE wallet_entries ADD CONSTRAINT wallet_entries_kind_check CHECK (kind IN ('class_refund', 'late_payment', 'class_purchase', 'reservation_release', 'correction', 'payout_withdrawal', 'payout_refund'));

CREATE TABLE IF NOT EXISTS wallet_withdrawals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES app_users(id),
  amount_idr integer NOT NULL CHECK (amount_idr >= 10000),
  destination_type text NOT NULL CHECK (destination_type IN ('bank', 'ewallet')),
  provider_code text NOT NULL,
  account_number text NOT NULL,
  account_name text NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'rejected')),
  transfer_proof_media_id uuid REFERENCES media_assets(id) ON DELETE SET NULL,
  transfer_ref_note text,
  rejected_reason text,
  reviewed_by uuid REFERENCES app_users(id),
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_wallet_withdrawals_customer ON wallet_withdrawals (customer_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_wallet_withdrawals_status ON wallet_withdrawals (status, created_at DESC);
