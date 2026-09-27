import { useEffect, useState, type FormEvent } from 'react'
import { CheckCircle2, Clock, DollarSign, Download, RefreshCw } from 'lucide-react'
import {
  api,
  type AdminBookingRecord,
  type AdminPaymentRecord,
  type AdminWalletLedger,
  type AdminWalletRecord,
} from '../../shared/api'
import { money } from '../../shared/format'
import { FinanceFilters } from './FinanceFilters'
import { FinanceList } from './FinanceList'
import { WalletLedger } from './WalletLedger'
import type { Listing, Tab } from './finance-types'
import './Finance.css'

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'Gagal memuat laporan.'
}

export function AdminFinancePanel({
  timezone,
  show,
}: {
  timezone: string
  show: (message: string) => void
}) {
  const [tab, setTab] = useState<Tab>('bookings')
  const [search, setSearch] = useState('')
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState('')
  const [kind, setKind] = useState('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [page, setPage] = useState(1)
  const [refresh, setRefresh] = useState(0)
  const [data, setData] = useState<Listing | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [selectedWallet, setSelectedWallet] = useState<AdminWalletRecord | null>(null)
  const [ledgerPage, setLedgerPage] = useState(1)
  const [ledger, setLedger] = useState<AdminWalletLedger | null>(null)
  const [ledgerLoading, setLedgerLoading] = useState(false)

  function switchTab(next: Tab) {
    setTab(next)
    setSearch('')
    setQuery('')
    setStatus('')
    setKind('')
    setFrom('')
    setTo('')
    setPage(1)
    setData(null)
    setError('')
    setSelectedWallet(null)
    setLedger(null)
  }
  useEffect(() => {
    let active = true
    const params = new URLSearchParams({ page: String(page), limit: '20' })
    if (query) params.set('q', query)
    if (tab !== 'wallets') {
      if (from) params.set('from', from)
      if (to) params.set('to', to)
      if (status) params.set('status', status)
    }
    if (tab === 'payments' && kind) params.set('kind', kind)
    setLoading(true)
    setError('')
    void api<Listing>(`/admin/${tab}?${params}`)
      .then((value) => {
        if (active) setData(value)
      })
      .catch((problem) => {
        if (active) {
          setError(errorMessage(problem))
          setData(null)
        }
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [tab, query, status, kind, from, to, page, refresh])
  useEffect(() => {
    if (!selectedWallet) return
    let active = true
    setLedgerLoading(true)
    setLedger(null)
    void api<AdminWalletLedger>(
      `/admin/wallets/${selectedWallet.customerId}/entries?page=${ledgerPage}&limit=20`,
    )
      .then((value) => {
        if (active) setLedger(value)
      })
      .catch((problem) => {
        if (active) show(errorMessage(problem))
      })
      .finally(() => {
        if (active) setLedgerLoading(false)
      })
    return () => {
      active = false
    }
  }, [selectedWallet, ledgerPage, refresh, show])
  function searchNow(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setPage(1)
    setQuery(search.trim())
  }
  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.limit)) : 1

  const kpiStats = (() => {
    if (!data || !data.items.length) {
      return {
        metric1Label: 'TOTAL DATA',
        metric1Val: data ? String(data.total) : '0',
        metric1Desc: 'Total catatan tercatat',
        metric2Label: 'STATUS AKTIF',
        metric2Val: '0',
        metric2Desc: 'Tercatat di sistem',
        metric3Label: 'ESTIMASI NILAI',
        metric3Val: 'Rp 0',
        metric3Desc: 'Berdasarkan filter aktif',
      }
    }
    if (tab === 'payments') {
      const items = data.items as AdminPaymentRecord[]
      const settled = items.filter(
        (p) =>
          p.status === 'success' ||
          p.status === 'settlement' ||
          p.status === 'capture' ||
          p.providerStatus === 'settlement' ||
          p.providerStatus === 'capture',
      )
      const totalAmount = settled.reduce((sum, p) => sum + (p.grossAmountIdr || 0), 0)
      const pendingCount = items.filter((p) => p.status === 'pending').length
      return {
        metric1Label: 'OMZET (HALAMAN INI)',
        metric1Val: money(totalAmount),
        metric1Desc: `${settled.length} pembayaran berhasil`,
        metric2Label: 'TRANSAKSI SUKSES',
        metric2Val: `${settled.length} / ${items.length}`,
        metric2Desc: `${Math.round((settled.length / items.length) * 100)}% tingkat konversi`,
        metric3Label: 'MENUNGGU PEMBAYARAN',
        metric3Val: `${pendingCount}`,
        metric3Desc: 'Pending di payment gateway',
      }
    }
    if (tab === 'bookings') {
      const items = data.items as AdminBookingRecord[]
      const confirmed = items.filter((b) => b.status === 'confirmed')
      const totalValue = confirmed.reduce((sum, b) => sum + (b.priceIdr || 0), 0)
      const pendingCount = items.filter((b) => b.status === 'pending_payment').length
      return {
        metric1Label: 'NILAI BOOKING',
        metric1Val: money(totalValue),
        metric1Desc: `${confirmed.length} booking terkonfirmasi`,
        metric2Label: 'BOOKING TERKONFIRMASI',
        metric2Val: `${confirmed.length} / ${items.length}`,
        metric2Desc: `${Math.round((confirmed.length / items.length) * 100)}% kehadiran terjadwal`,
        metric3Label: 'MENUNGGU BAYAR',
        metric3Val: `${pendingCount}`,
        metric3Desc: 'Hold tiket sementara',
      }
    }
    const items = data.items as AdminWalletRecord[]
    const totalBalance = items.reduce((sum, w) => sum + (w.balanceIdr || 0), 0)
    const activeCount = items.filter((w) => w.balanceIdr > 0).length
    const avgBalance = items.length ? Math.round(totalBalance / items.length) : 0
    return {
      metric1Label: 'TOTAL SALDO MEMBER',
      metric1Val: money(totalBalance),
      metric1Desc: `Dari ${items.length} akun dompet`,
      metric2Label: 'DOMPET DENGAN SALDO',
      metric2Val: `${activeCount} / ${items.length}`,
      metric2Desc: 'Memiliki deposit aktif',
      metric3Label: 'RATA-RATA SALDO',
      metric3Val: money(avgBalance),
      metric3Desc: 'Per akun terdaftar',
    }
  })()

  return (
    <section className="admin-workspace admin-finance">
      <div className="admin-workspace-head">
        <div>
          <span className="eyebrow">OPERASIONAL</span>
          <h2>Booking & transaksi</h2>
          <p>
            Data diambil dari catatan backend. Status pembayaran menunjukkan hasil yang sudah
            diterima atau diverifikasi oleh backend.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            className="button button-primary"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
            onClick={() => {
              const exportParams = new URLSearchParams()
              if (query) exportParams.set('q', query)
              if (from) exportParams.set('from', from)
              if (to) exportParams.set('to', to)
              if (status) exportParams.set('status', status)
              if (kind) exportParams.set('kind', kind)
              window.open(`/api/v1/admin/payments/export?${exportParams.toString()}`, '_blank')
            }}
          >
            <Download size={15} /> Unduh Laporan CSV
          </button>
          <button className="button button-outline" onClick={() => setRefresh((value) => value + 1)}>
            <RefreshCw size={15} /> Muat ulang
          </button>
        </div>
      </div>

      <div className="admin-kpi-grid" style={{ marginBottom: '20px' }}>
        <div className="admin-kpi-card">
          <div className="admin-kpi-head">
            <span>{kpiStats.metric1Label}</span>
            <div className="admin-kpi-icon">
              <DollarSign size={16} />
            </div>
          </div>
          <div className="admin-kpi-val" style={{ fontSize: '22px' }}>{kpiStats.metric1Val}</div>
          <p className="admin-kpi-desc">{kpiStats.metric1Desc}</p>
        </div>
        <div className="admin-kpi-card">
          <div className="admin-kpi-head">
            <span>{kpiStats.metric2Label}</span>
            <div className="admin-kpi-icon" style={{ background: '#ecfdf5', color: '#15803d' }}>
              <CheckCircle2 size={16} />
            </div>
          </div>
          <div className="admin-kpi-val" style={{ fontSize: '22px' }}>{kpiStats.metric2Val}</div>
          <p className="admin-kpi-desc">{kpiStats.metric2Desc}</p>
        </div>
        <div className="admin-kpi-card">
          <div className="admin-kpi-head">
            <span>{kpiStats.metric3Label}</span>
            <div className="admin-kpi-icon" style={{ background: '#fef3c7', color: '#b45309' }}>
              <Clock size={16} />
            </div>
          </div>
          <div className="admin-kpi-val" style={{ fontSize: '22px' }}>{kpiStats.metric3Val}</div>
          <p className="admin-kpi-desc">{kpiStats.metric3Desc}</p>
        </div>
      </div>

      <div className="filter-list admin-finance-tabs">
        <button
          className={tab === 'bookings' ? 'selected' : ''}
          onClick={() => switchTab('bookings')}
        >
          Booking
        </button>
        <button
          className={tab === 'payments' ? 'selected' : ''}
          onClick={() => switchTab('payments')}
        >
          Pembayaran
        </button>
        <button
          className={tab === 'wallets' ? 'selected' : ''}
          onClick={() => switchTab('wallets')}
        >
          Saldo pelanggan
        </button>
      </div>
      <FinanceFilters
        tab={tab}
        search={search}
        setSearch={setSearch}
        status={status}
        setStatus={setStatus}
        kind={kind}
        setKind={setKind}
        from={from}
        setFrom={setFrom}
        to={to}
        setTo={setTo}
        setPage={setPage}
        searchNow={searchNow}
      />
      {error && (
        <div className="panel live-error" role="alert">
          {error}
        </div>
      )}
      {loading && <p className="admin-finance-empty">Memuat catatan...</p>}
      <FinanceList
        tab={tab}
        data={data}
        loading={loading}
        totalPages={totalPages}
        timezone={timezone}
        page={page}
        setPage={setPage}
        setSelectedWallet={setSelectedWallet}
        setLedgerPage={setLedgerPage}
      />
      <WalletLedger
        tab={tab}
        selectedWallet={selectedWallet}
        setSelectedWallet={setSelectedWallet}
        ledger={ledger}
        setLedger={setLedger}
        ledgerLoading={ledgerLoading}
        ledgerPage={ledgerPage}
        setLedgerPage={setLedgerPage}
        timezone={timezone}
      />
    </section>
  )
}
