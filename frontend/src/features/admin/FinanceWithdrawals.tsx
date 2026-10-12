import { useCallback, useEffect, useState } from 'react'
import { Check, Filter, X } from 'lucide-react'
import { api } from '../../shared/api'
import { localDateTime, money } from '../../shared/format'
import { errorMessage } from '../../shared/errors'
import { WithdrawalDialogs } from './WithdrawalDialogs'
import type { WalletWithdrawal } from './finance-types'

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
      await api(`/admin/finance/withdrawals/${completeTarget.id}/complete`, {
        method: 'POST',
        body: { transferRefNote: refNote.trim() || undefined },
      })
      show('Penarikan dana ditandai selesai. Saldo buku besar telah diperbarui.')
      setCompleteTarget(null)
      setRefNote('')
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
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Filter size={15} style={{ color: '#64748b' }} />
          <span style={{ fontSize: '13px', fontWeight: 600, color: '#334155' }}>Filter Status:</span>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            style={{ padding: '6px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }}
          >
            <option value="">Semua Status</option>
            <option value="pending">Menunggu Transfer</option>
            <option value="completed">Selesai Ditransfer</option>
            <option value="rejected">Ditolak</option>
          </select>
        </div>
        <span className="admin-results-count">{items.length} permohonan penarikan</span>
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
                      onClick={() => setCompleteTarget(w)}
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
        rejectReason={rejectReason}
        setRejectReason={setRejectReason}
        busy={busy}
        onComplete={() => void handleComplete()}
        onReject={() => void handleReject()}
      />
    </div>
  )
}
