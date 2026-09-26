import type { Dispatch, FormEvent, SetStateAction } from 'react'
import { label } from './finance-format'
import type { Tab } from './finance-types'

type Props = {
  tab: Tab
  search: string
  setSearch: Dispatch<SetStateAction<string>>
  status: string
  setStatus: Dispatch<SetStateAction<string>>
  kind: string
  setKind: Dispatch<SetStateAction<string>>
  from: string
  setFrom: Dispatch<SetStateAction<string>>
  to: string
  setTo: Dispatch<SetStateAction<string>>
  setPage: Dispatch<SetStateAction<number>>
  searchNow: (event: FormEvent<HTMLFormElement>) => void
}

export function FinanceFilters({
  tab,
  search,
  setSearch,
  status,
  setStatus,
  kind,
  setKind,
  from,
  setFrom,
  to,
  setTo,
  setPage,
  searchNow,
}: Props) {
  return (
    <form className="panel live-form admin-finance-filters" onSubmit={searchNow}>
      <div className="admin-finance-filter-grid">
        <label>
          Cari {tab === 'payments' ? 'pelanggan atau order ID' : 'nama atau email pelanggan'}
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Ketik kata pencarian"
          />
        </label>
        {tab !== 'wallets' && (
          <>
            <label>
              Status
              <select
                value={status}
                onChange={(event) => {
                  setStatus(event.target.value)
                  setPage(1)
                }}
              >
                <option value="">Semua status</option>
                {(tab === 'bookings'
                  ? ['pending_payment', 'confirmed', 'cancelled', 'expired']
                  : ['pending', 'success', 'failed', 'expired']
                ).map((value) => (
                  <option key={value} value={value}>
                    {label(value)}
                  </option>
                ))}
              </select>
            </label>
            {tab === 'payments' && (
              <label>
                Jenis pembayaran
                <select
                  value={kind}
                  onChange={(event) => {
                    setKind(event.target.value)
                    setPage(1)
                  }}
                >
                  <option value="">Semua jenis</option>
                  <option value="class">Kelas</option>
                  <option value="package">Paket</option>
                </select>
              </label>
            )}
            <label>
              {tab === 'bookings' ? 'Tanggal kelas dari' : 'Tanggal transaksi dari'}
              <input
                type="date"
                value={from}
                max={to || undefined}
                onChange={(event) => {
                  setFrom(event.target.value)
                  setPage(1)
                }}
              />
            </label>
            <label>
              Sampai
              <input
                type="date"
                value={to}
                min={from || undefined}
                onChange={(event) => {
                  setTo(event.target.value)
                  setPage(1)
                }}
              />
            </label>
          </>
        )}
      </div>
      <button className="button button-primary">Cari</button>
    </form>
  )
}
