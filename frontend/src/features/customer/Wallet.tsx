import { useCallback, useEffect, useState } from 'react'
import { ArrowDownLeft, ArrowUpRight, Clock } from 'lucide-react'
import { api } from '../../shared/api'
import { localDateTime, money } from '../../shared/format'
import { errorMessage } from '../../shared/errors'
import { WalletWithdrawModal } from './WalletWithdrawModal'

type WalletEntry = {
  id: number
  amountIdr: number
  balanceAfterIdr: number
  kind: string
  createdAt: string
}

type Withdrawal = {
  id: string
  amountIdr: number
  destinationType: 'bank' | 'ewallet'
  providerCode: string
  accountNumber: string
  accountName: string
  status: 'pending' | 'completed' | 'rejected'
  rejectedReason?: string | null
  transferRefNote?: string | null
  createdAt: string
}

export function CustomerWalletPanel({
  balance,
  timezone,
  show,
}: {
  balance: number
  timezone: string
  show: (text: string) => void
}) {
  const [entries, setEntries] = useState<WalletEntry[]>([])
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([])
  const [withdrawOpen, setWithdrawOpen] = useState(false)

  const loadData = useCallback(() => {
    void api<WalletEntry[]>('/me/wallet/entries?limit=20')
      .then(setEntries)
      .catch((error) => show(errorMessage(error)))

    void api<Withdrawal[]>('/me/wallet/withdrawals')
      .then(setWithdrawals)
      .catch(() => {})
  }, [show])

  useEffect(() => {
    loadData()
  }, [loadData])

  return (
    <>
      <div className="panel dashboard-wallet-balance">
        <span className="eyebrow">SALDO KELAS ANDA</span>
        <strong>{money(balance)}</strong>
        <p>Saldo dapat digunakan untuk membeli kelas langsung atau dicairkan ke rekening bank / e-wallet.</p>
        <div style={{ marginTop: '12px' }}>
          <button
            type="button"
            className="button button-outline"
            onClick={() => setWithdrawOpen(true)}
            disabled={balance < 10000}
          >
            <ArrowUpRight size={15} /> Tarik Saldo ke Rekening / E-Wallet
          </button>
        </div>
      </div>

      {withdrawals.length > 0 && (
        <>
          <div className="live-section-head" style={{ marginTop: '24px' }}>
            <h2>Status penarikan dana</h2>
          </div>
          <div className="panel">
            {withdrawals.slice(0, 5).map((w) => (
              <div className="dashboard-wallet-entry" key={w.id}>
                <span className={w.status === 'completed' ? 'is-credit' : 'is-debit'}>
                  {w.status === 'pending' ? <Clock size={18} /> : <ArrowUpRight size={18} />}
                </span>
                <div>
                  <strong>
                    Penarikan ke {w.providerCode} · {w.accountNumber} ({w.accountName})
                  </strong>
                  <small>
                    {localDateTime(w.createdAt, timezone)} · Status:{' '}
                    <span
                      style={{
                        fontWeight: 600,
                        color:
                          w.status === 'completed'
                            ? '#16a34a'
                            : w.status === 'rejected'
                              ? '#dc2626'
                              : '#d97706',
                      }}
                    >
                      {w.status === 'completed'
                        ? 'Berhasil Ditransfer'
                        : w.status === 'rejected'
                          ? `Ditolak: ${w.rejectedReason || 'Nama/rekening tidak sesuai'}`
                          : 'Menunggu Verifikasi Staf Keuangan'}
                    </span>
                  </small>
                </div>
                <div className="dashboard-wallet-amount">
                  <strong>{money(w.amountIdr)}</strong>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      <div className="live-section-head" style={{ marginTop: '24px' }}>
        <h2>Riwayat mutasi saldo</h2>
      </div>
      <div className="panel">
        {entries.length ? (
          entries.map((entry) => (
            <div className="dashboard-wallet-entry" key={entry.id}>
              <span className={entry.amountIdr >= 0 ? 'is-credit' : 'is-debit'}>
                {entry.amountIdr >= 0 ? <ArrowDownLeft size={18} /> : <ArrowUpRight size={18} />}
              </span>
              <div>
                <strong>
                  {entry.kind === 'payout_withdrawal'
                    ? 'Penarikan dana saldo'
                    : entry.kind === 'payout_refund'
                      ? 'Pengembalian penarikan ditolak'
                      : entry.amountIdr >= 0
                        ? 'Saldo masuk'
                        : 'Saldo digunakan'}
                </strong>
                <small>
                  {localDateTime(entry.createdAt, timezone)} · {entry.kind.replace(/_/g, ' ')}
                </small>
              </div>
              <div className="dashboard-wallet-amount">
                <strong>
                  {entry.amountIdr >= 0 ? '+' : '−'}
                  {money(Math.abs(entry.amountIdr))}
                </strong>
                <small>Sisa {money(entry.balanceAfterIdr)}</small>
              </div>
            </div>
          ))
        ) : (
          <p>Belum ada perubahan saldo.</p>
        )}
      </div>

      <WalletWithdrawModal
        open={withdrawOpen}
        balance={balance}
        onClose={() => setWithdrawOpen(false)}
        onSuccess={loadData}
        show={show}
      />
    </>
  )
}
