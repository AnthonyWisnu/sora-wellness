import type { Dispatch, SetStateAction } from 'react'
import { CreditCard, WalletCards } from 'lucide-react'
import type { AdminBookingRecord, AdminPaymentRecord, AdminWalletRecord } from '../../shared/api'
import { formatDate, money } from '../../shared/format'
import { dateTime, label, sourceLabel } from './finance-format'
import type { Listing, Tab } from './finance-types'

type Props = {
  tab: Tab
  data: Listing | null
  loading: boolean
  totalPages: number
  timezone: string
  page: number
  setPage: Dispatch<SetStateAction<number>>
  setSelectedWallet: Dispatch<SetStateAction<AdminWalletRecord | null>>
  setLedgerPage: Dispatch<SetStateAction<number>>
}

export function FinanceList({
  tab,
  data,
  loading,
  totalPages,
  timezone,
  page,
  setPage,
  setSelectedWallet,
  setLedgerPage,
}: Props) {
  return (
    <>
      {!loading && data && (
        <>
          <div className="admin-finance-count">
            {data.total} catatan · halaman {data.page} dari {totalPages}
          </div>
          <div className="admin-finance-list">
            {tab === 'bookings' &&
              (data.items as AdminBookingRecord[]).map((row) => (
                <article className="panel admin-finance-record" key={row.id}>
                  <div className="admin-finance-record-head">
                    <div>
                      <span className="eyebrow">
                        {formatDate(row.localDate, {
                          weekday: 'long',
                          day: 'numeric',
                          month: 'long',
                          year: 'numeric',
                        })}
                      </span>
                      <h3>{row.title}</h3>
                      <p>
                        {row.customerName} · {row.customerEmail}
                      </p>
                    </div>
                    <span
                      className={`tag ${row.status === 'confirmed' ? 'tag-green' : row.status === 'pending_payment' ? 'tag-gold' : 'tag-gray'}`}
                    >
                      {label(row.status)}
                    </span>
                  </div>
                  <div className="admin-finance-details">
                    <span>{sourceLabel[row.source] ?? row.source}</span>
                    <span>{money(row.priceIdr)}</span>
                    <span>{dateTime(row.startsAt, timezone)}</span>
                    {row.source === 'single' && (
                      <span>
                        Saldo ditahan: {money(row.walletReservedIdr)} · Tagihan gateway:{' '}
                        {money(row.gatewayDueIdr)}
                      </span>
                    )}
                    {row.paymentStatus && <span>Pembayaran: {label(row.paymentStatus)}</span>}
                    {row.cancellationOrigin && (
                      <span>
                        Dibatalkan oleh{' '}
                        {row.cancellationOrigin === 'studio' ? 'studio' : 'pelanggan'}
                      </span>
                    )}
                    {row.orderId && <span>Order: {row.orderId}</span>}
                  </div>
                </article>
              ))}
            {tab === 'payments' &&
              (data.items as AdminPaymentRecord[]).map((row) => (
                <article className="panel admin-finance-record" key={row.id}>
                  <div className="admin-finance-record-head">
                    <div>
                      <span className="eyebrow">
                        {row.kind === 'class' ? 'PEMBAYARAN KELAS' : 'PEMBELIAN PAKET'}
                      </span>
                      <h3>
                        {row.kind === 'class'
                          ? row.classTitle
                          : `Paket ${row.durationMonths ?? '-'} bulan`}
                      </h3>
                      <p>
                        {row.customerName} · {row.customerEmail}
                      </p>
                    </div>
                    <div className="admin-finance-record-meta">
                      <strong>{money(row.grossAmountIdr)}</strong>
                      <span
                        className={`tag ${row.status === 'success' ? 'tag-green' : row.status === 'pending' ? 'tag-gold' : 'tag-gray'}`}
                      >
                        {label(row.status)}
                      </span>
                    </div>
                  </div>
                  <div className="admin-finance-details">
                    <span>Midtrans: {row.providerStatus ?? 'Menunggu proses'}</span>
                    <span>{dateTime(row.createdAt, timezone)}</span>
                    <span>Order: {row.orderId}</span>
                  </div>
                </article>
              ))}
            {tab === 'wallets' &&
              (data.items as AdminWalletRecord[]).map((row) => (
                <article
                  className="panel admin-finance-record admin-finance-wallet"
                  key={row.customerId}
                >
                  <div>
                    <span className="eyebrow">
                      <WalletCards size={14} /> SALDO KELAS
                    </span>
                    <h3>{row.customerName}</h3>
                    <p>{row.customerEmail}</p>
                    <strong>{money(row.balanceIdr)}</strong>
                  </div>
                  <button
                    className="button button-outline"
                    onClick={() => {
                      setSelectedWallet(row)
                      setLedgerPage(1)
                    }}
                  >
                    <CreditCard size={15} /> Buku transaksi
                  </button>
                </article>
              ))}
            {!data.items.length && (
              <div className="panel admin-finance-empty">Tidak ada catatan untuk filter ini.</div>
            )}
          </div>
          <div className="admin-finance-pagination">
            <button
              className="button button-outline"
              disabled={page <= 1}
              onClick={() => setPage((value) => value - 1)}
            >
              Sebelumnya
            </button>
            <span>
              Halaman {page} / {totalPages}
            </span>
            <button
              className="button button-outline"
              disabled={page >= totalPages}
              onClick={() => setPage((value) => value + 1)}
            >
              Berikutnya
            </button>
          </div>
        </>
      )}
    </>
  )
}
