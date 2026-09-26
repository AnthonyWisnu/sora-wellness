import { useEffect, useState } from 'react'
import { ArrowDownLeft, ArrowUpRight } from 'lucide-react'
import { api } from '../../shared/api'
import { localDateTime, money } from '../../shared/format'
import { errorMessage } from '../../shared/errors'

type WalletEntry = {
  id: number
  amountIdr: number
  balanceAfterIdr: number
  kind: string
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
  useEffect(() => {
    let active = true
    void api<WalletEntry[]>('/me/wallet/entries?limit=20')
      .then((rows) => {
        if (active) setEntries(rows)
      })
      .catch((error) => {
        if (active) show(errorMessage(error))
      })
    return () => {
      active = false
    }
  }, [show])

  return (
    <>
      <div className="panel dashboard-wallet-balance">
        <span className="eyebrow">SALDO KELAS ANDA</span>
        <strong>{money(balance)}</strong>
        <p>Saldo hanya dapat dipakai untuk membeli kelas satuan di Sora Wellness.</p>
      </div>
      <div className="live-section-head">
        <h2>Riwayat saldo</h2>
      </div>
      <div className="panel">
        {entries.length ? (
          entries.map((entry) => (
            <div className="dashboard-wallet-entry" key={entry.id}>
              <span className={entry.amountIdr >= 0 ? 'is-credit' : 'is-debit'}>
                {entry.amountIdr >= 0 ? <ArrowDownLeft size={18} /> : <ArrowUpRight size={18} />}
              </span>
              <div>
                <strong>{entry.amountIdr >= 0 ? 'Saldo masuk' : 'Saldo digunakan'}</strong>
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
    </>
  )
}
