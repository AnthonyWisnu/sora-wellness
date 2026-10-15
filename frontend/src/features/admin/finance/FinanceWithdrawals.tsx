import { useCallback, useEffect, useState } from 'react'
import { Check, FileText, X } from 'lucide-react'
import { api } from '../../../shared/api'
import { localDateTime, money } from '../../../shared/format'
import { errorMessage } from '../../../shared/errors'
import { WithdrawalDialogs } from './WithdrawalDialogs'
import type { WalletWithdrawal } from '../finance-types'

type Props = {
  timezone: string
  show: (message: string) => void
}

export function FinanceWithdrawals({ timezone, show }: Props) {
  const [items, setItems] = useState<WalletWithdrawal[]>([])
  const [filterStatus, setFilterStatus] = useState<string>('')
  const [busy, setBusy] = useState(false)
  const [completeTarget, setCompleteTarget] = useState<WalletWithdrawal | null>(null)
  const [rejectTarget, setRejectTarget] = useState<WalletWithdrawal | null>(null)
  const [refNote, setRefNote] = useState('')
  const [proofFile, setProofFile] = useState<File | null>(null)
  const [rejectReason, setRejectReason] = useState('')

  const load = useCallback(() => {
    setBusy(true)
    const url = filterStatus
      ? `/admin/finance/withdrawals?status=${filterStatus}`
      : '/admin/finance/withdrawals'
    void api<WalletWithdrawal[]>(url)
      .then(setItems)
      .catch((err) => show(errorMessage(err)))
      .finally(() => setBusy(false))
  }, [filterStatus, show])

  useEffect(() => {
    load()
  }, [load])

  async function handleComplete() {
    if (!completeTarget) return
    setBusy(true)
    try {
      const formData = new FormData()
      if (refNote.trim()) formData.append('transferRefNote', refNote.trim())
      if (proofFile) formData.append('proof', proofFile)

      await api(`/admin/finance/withdrawals/${completeTarget.id}/complete`, {
        method: 'POST',
        body: formData,
      })
      show('Penarikan dana ditandai selesai. Saldo buku besar telah diperbarui.')
      setCompleteTarget(null)
      setRefNote('')
      setProofFile(null)
      load()
    } catch (err) {
      show(errorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  async function handleReject() {
    if (!rejectTarget || !rejectReason.trim()) return
    setBusy(true)
    try {
      await api(`/admin/finance/withdrawals/${rejectTarget.id}/reject`, {
        method: 'POST',
        body: { reason: rejectReason.trim() },
      })
      show('Penarikan dana ditolak dan saldo berhasil dikembalikan ke pelanggan.')
      setRejectTarget(null)
      setRejectReason('')
      load()
    } catch (err) {
      show(errorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="panel admin-account-table-wrap" style={{ marginTop: '16px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
          {[
            { value: '', label: 'Semua Status' },
            { value: 'pending', label: 'Menunggu Transfer' },
            { value: 'completed', label: 'Selesai Ditransfer' },
            { value: 'rejected', label: 'Ditolak' },
          ].map((opt) => (
            <button
              key={opt.value}
              type="button"
              className={`button ${filterStatus === opt.value ? 'button-primary' : 'button-outline'}`}
              style={{ padding: '6px 14px', fontSize: '0.85rem', borderRadius: '20px' }}
              onClick={() => setFilterStatus(opt.value)}
            >
              {opt.label}
            </button>
          ))}
        </div>
        <span className="admin-results-count">{items.length} permohonan</span>
      </div>

      <table className="admin-account-table">
        <thead>
          <tr>
            <th>Pelanggan</th>
            <th>Tujuan Transfer</th>
            <th>Nominal</th>
            <th>Status</th>
            <th>Waktu</th>
            <th>Aksi</th>
          </tr>
        </thead>
        <tbody>
          {items.map((w) => (
            <tr key={w.id}>
              <td>
                <strong>{w.customerName || 'Pelanggan'}</strong>
                <small>{w.customerEmail}</small>
              </td>
              <td>
                <strong>{w.providerCode} · {w.accountNumber}</strong>
                <small>a.n. {w.accountName}</small>
              </td>
              <td>
                <strong style={{ color: '#166534' }}>{money(w.amountIdr)}</strong>
              </td>
              <td>
                <span className={`tag ${w.status === 'completed' ? 'tag-green' : w.status === 'rejected' ? 'tag-red' : 'tag-gold'}`}>
                  {w.status === 'completed' ? 'Selesai' : w.status === 'rejected' ? 'Ditolak' : 'Menunggu Transfer'}
                </span>
                {w.transferRefNote && <small style={{ display: 'block', marginTop: '2px' }}>Ref: {w.transferRefNote}</small>}
                {w.proofUrl && (
                  <a
                    href={w.proofUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: '#166534', fontWeight: 600, marginTop: '3px', textDecoration: 'underline' }}
                  >
                    <FileText size={12} /> Bukti Transfer
                  </a>
                )}
                {w.rejectedReason && <small style={{ display: 'block', marginTop: '2px', color: '#b91c1c' }}>Alasan: {w.rejectedReason}</small>}
              </td>
              <td>
                <small>{localDateTime(w.createdAt, timezone)}</small>
              </td>
              <td>
                {w.status === 'pending' ? (
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <button
                      type="button"
                      className="button button-primary"
                      style={{ padding: '4px 8px', fontSize: '12px' }}
                      onClick={() => {
                        setRefNote('')
                        setProofFile(null)
                        setCompleteTarget(w)
                      }}
                    >
                      <Check size={13} /> Selesai
                    </button>
                    <button
                      type="button"
                      className="button button-text live-danger"
                      style={{ padding: '4px 8px', fontSize: '12px' }}
                      onClick={() => setRejectTarget(w)}
                    >
                      <X size={13} /> Tolak
                    </button>
                  </div>
                ) : (
                  <small style={{ color: '#94a3b8' }}>Selesai diproses</small>
                )}
              </td>
            </tr>
          ))}
          {!items.length && (
            <tr>
              <td colSpan={6} style={{ textAlign: 'center', padding: '28px', color: '#64748b' }}>
                Tidak ada data penarikan saldo sesuai filter.
              </td>
            </tr>
          )}
        </tbody>
      </table>

      <WithdrawalDialogs
        completeTarget={completeTarget}
        setCompleteTarget={setCompleteTarget}
        rejectTarget={rejectTarget}
        setRejectTarget={setRejectTarget}
        refNote={refNote}
        setRefNote={setRefNote}
        proofFile={proofFile}
        setProofFile={setProofFile}
        rejectReason={rejectReason}
        setRejectReason={setRejectReason}
        busy={busy}
        onComplete={() => void handleComplete()}
        onReject={() => void handleReject()}
      />
    </div>
  )
}
