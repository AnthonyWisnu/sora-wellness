import type { Dispatch, SetStateAction } from 'react'
import type { AdminWalletLedger, AdminWalletRecord } from '../../shared/api'
import { money } from '../../shared/format'
import { dateTime, kindLabel } from './finance-format'

type Props = {
  tab: 'bookings' | 'payments' | 'wallets'
  selectedWallet: AdminWalletRecord | null
  setSelectedWallet: Dispatch<SetStateAction<AdminWalletRecord | null>>
  ledger: AdminWalletLedger | null
  setLedger: Dispatch<SetStateAction<AdminWalletLedger | null>>
  ledgerLoading: boolean
  ledgerPage: number
  setLedgerPage: Dispatch<SetStateAction<number>>
  timezone: string
}

export function WalletLedger({
  tab,
  selectedWallet,
  setSelectedWallet,
  ledger,
  setLedger,
  ledgerLoading,
  ledgerPage,
  setLedgerPage,
  timezone,
}: Props) {
  return (
    <>
      {tab === 'wallets' && selectedWallet && (
        <div className="panel admin-finance-ledger">
          <div className="admin-finance-record-head">
            <div>
              <span className="eyebrow">BUKU SALDO</span>
              <h3>{selectedWallet.customerName}</h3>
              <p>
                Saldo terkini: {money(ledger?.customer.balanceIdr ?? selectedWallet.balanceIdr)}
              </p>
            </div>
            <button
              className="button button-text"
              onClick={() => {
                setSelectedWallet(null)
                setLedger(null)
              }}
            >
              Tutup
            </button>
          </div>
          {ledgerLoading ? (
            <p>Memuat buku transaksi...</p>
          ) : (
            ledger && (
              <>
                {ledger.items.map((entry) => (
                  <div className="admin-finance-entry" key={entry.id}>
                    <div>
                      <strong>{kindLabel[entry.kind] ?? entry.kind}</strong>
                      <small>
                        {dateTime(entry.createdAt, timezone)} · {entry.reference}
                      </small>
                    </div>
                    <div>
                      <strong
                        className={entry.amountIdr > 0 ? 'admin-finance-credit' : 'live-danger'}
                      >
                        {entry.amountIdr > 0 ? '+' : '−'}
                        {money(Math.abs(entry.amountIdr))}
                      </strong>
                      <small>Saldo sesudah: {money(entry.balanceAfterIdr)}</small>
                    </div>
                  </div>
                ))}
                {!ledger.items.length && <p>Belum ada entri saldo.</p>}
                <div className="admin-finance-pagination">
                  <button
                    className="button button-outline"
                    disabled={ledgerPage <= 1}
                    onClick={() => setLedgerPage((value) => value - 1)}
                  >
                    Sebelumnya
                  </button>
                  <span>
                    Halaman {ledgerPage} / {Math.max(1, Math.ceil(ledger.total / ledger.limit))}
                  </span>
                  <button
                    className="button button-outline"
                    disabled={ledgerPage >= Math.ceil(ledger.total / ledger.limit)}
                    onClick={() => setLedgerPage((value) => value + 1)}
                  >
                    Berikutnya
                  </button>
                </div>
              </>
            )
          )}
        </div>
      )}
    </>
  )
}
