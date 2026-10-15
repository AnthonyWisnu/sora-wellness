import { CheckCircle2, XCircle } from 'lucide-react'
import { money } from '../../../shared/format'
import { AdminDialog } from '../AdminDialog'
import type { WalletWithdrawal } from '../finance-types'
import { TransferProofInput } from './TransferProofInput'

type DialogsProps = {
  completeTarget: WalletWithdrawal | null
  setCompleteTarget: (target: WalletWithdrawal | null) => void
  rejectTarget: WalletWithdrawal | null
  setRejectTarget: (target: WalletWithdrawal | null) => void
  refNote: string
  setRefNote: (note: string) => void
  proofFile: File | null
  setProofFile: (file: File | null) => void
  rejectReason: string
  setRejectReason: (reason: string) => void
  busy: boolean
  onComplete: () => void
  onReject: () => void
}

export function WithdrawalDialogs({
  completeTarget,
  setCompleteTarget,
  rejectTarget,
  setRejectTarget,
  refNote,
  setRefNote,
  proofFile,
  setProofFile,
  rejectReason,
  setRejectReason,
  busy,
  onComplete,
  onReject,
}: DialogsProps) {
  const canComplete = Boolean(refNote.trim() || proofFile)

  return (
    <>
      {completeTarget && (
        <AdminDialog
          open
          title="Konfirmasi Transfer Selesai"
          description={`Pastikan Anda telah mengirimkan ${money(completeTarget.amountIdr)} ke ${completeTarget.providerCode} ${completeTarget.accountNumber} a.n. ${completeTarget.accountName}.`}
          onClose={() => setCompleteTarget(null)}
        >
          <div className="live-form">
            <label>
              Nomor Referensi Transfer / Mutasi Bank
              <input
                placeholder="Contoh: TRX-BCA-10293847"
                value={refNote}
                onChange={(e) => setRefNote(e.target.value)}
                disabled={busy}
              />
            </label>

            <TransferProofInput
              file={proofFile}
              onChange={setProofFile}
              disabled={busy}
            />

            <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
              <button
                type="button"
                className="button button-outline"
                onClick={() => setCompleteTarget(null)}
                disabled={busy}
              >
                Batal
              </button>
              <button
                type="button"
                className="button button-primary"
                onClick={onComplete}
                disabled={busy || !canComplete}
              >
                <CheckCircle2 size={15} /> Konfirmasi Transfer Selesai
              </button>
            </div>
            {!canComplete && (
              <small style={{ color: '#64748b', fontSize: '11px', marginTop: '6px', display: 'block' }}>
                Wajib menyertakan minimal salah satu: nomor referensi transfer atau berkas bukti transfer.
              </small>
            )}
          </div>
        </AdminDialog>
      )}

      {rejectTarget && (
        <AdminDialog
          open
          title="Tolak Pengajuan Penarikan"
          description={`Dana sejumlah ${money(rejectTarget.amountIdr)} akan dikembalikan secara otomatis ke saldo dompet akun pelanggan.`}
          onClose={() => setRejectTarget(null)}
        >
          <div className="live-form">
            <label>
              Alasan Penolakan (Wajib Diisi)
              <textarea
                required
                rows={3}
                placeholder="Contoh: Nama pemilik rekening bank tidak sesuai dengan identitas akun member"
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                disabled={busy}
              />
            </label>
            <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
              <button
                type="button"
                className="button button-outline"
                onClick={() => setRejectTarget(null)}
                disabled={busy}
              >
                Batal
              </button>
              <button
                type="button"
                className="button button-text live-danger"
                onClick={onReject}
                disabled={busy || !rejectReason.trim()}
              >
                <XCircle size={15} /> Tolak & Kembalikan Saldo
              </button>
            </div>
          </div>
        </AdminDialog>
      )}
    </>
  )
}
