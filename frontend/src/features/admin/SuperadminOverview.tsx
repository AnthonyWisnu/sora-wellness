import { useEffect, useState } from 'react'
import {
  Activity,
  ArrowUpRight,
  CreditCard,
  Radio,
  Tent,
  UsersRound,
} from 'lucide-react'
import { api, type ExecutiveMetricsResponse } from '../../shared/api'

type Props = {
  go?: (path: string) => void
}

export function SuperadminOverview({ go }: Props) {
  const [data, setData] = useState<ExecutiveMetricsResponse | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    void (async () => {
      try {
        const res = await api<ExecutiveMetricsResponse>('/admin/executive-metrics')
        if (active) setData(res)
      } catch {
        // Abaikan atau biarkan null
      } finally {
        if (active) setLoading(false)
      }
    })()
    return () => {
      active = false
    }
  }, [])

  const totalRevenue = data?.totalRevenueIdr ?? 0
  const monthlyRevenue = data?.monthlyRevenueIdr ?? 0
  const monthlyTx = data?.monthlyTransactionsCount ?? 0
  const avgOccupancy = data?.avgOccupancyPct ?? 0
  const leadsCount = data?.eventLeadsCount ?? 0
  const totalRegistrations = data?.totalEventRegistrations ?? 0
  const coachesCount = data?.activeCoaches ?? 0
  const weekly = data?.weeklyOccupancy ?? []
  const categories = data?.categories ?? []

  return (
    <div className="superadmin-cockpit">
      <div className="metrics-grid">
        <div className="metric-card">
          <span className="metric-label">Total Omzet Penjualan</span>
          <strong className="metric-value">
            {loading ? '...' : `Rp ${totalRevenue.toLocaleString('id-ID')}`}
          </strong>
          <span className="metric-hint positive">
            Bulan ini: Rp {monthlyRevenue.toLocaleString('id-ID')} ({monthlyTx} transaksi)
          </span>
        </div>
        <div className="metric-card">
          <span className="metric-label">Rata-rata Okupansi Matras</span>
          <strong className="metric-value">{loading ? '...' : `${avgOccupancy}%`}</strong>
          <span className="metric-hint positive">Keterisian sesi kelas bulan berjalan</span>
        </div>
        <div className="metric-card">
          <span className="metric-label">Pendaftar Event Baru (Leads)</span>
          <strong className="metric-value">{loading ? '...' : leadsCount}</strong>
          <span className="metric-hint">
            Non-member dari {totalRegistrations} total registrasi
          </span>
        </div>
        <div className="metric-card">
          <span className="metric-label">Instruktur Aktif</span>
          <strong className="metric-value">{loading ? '...' : coachesCount}</strong>
          <span className="metric-hint">Pelatih terdaftar di database</span>
        </div>
      </div>

      <div className="analytics-dual-grid">
        <div className="card analytics-card">
          <div className="card-head">
            <div>
              <h3>Tren Okupansi Matras Mingguan</h3>
              <p>Persentase keterisian kapasitas matras per hari operasional studio.</p>
            </div>
            <Activity size={18} className="muted-icon" />
          </div>
          <div className="chart-container">
            {weekly.length > 0 ? (
              <svg viewBox="0 0 420 180" className="chart-svg" aria-label="Grafik okupansi mingguan">
                <line x1="40" y1="30" x2="400" y2="30" stroke="#eee8e2" strokeDasharray="3 3" />
                <line x1="40" y1="80" x2="400" y2="80" stroke="#eee8e2" strokeDasharray="3 3" />
                <line x1="40" y1="130" x2="400" y2="130" stroke="#eee8e2" strokeDasharray="3 3" />
                <text x="15" y="34" fontSize="10" fill="#998e83">100%</text>
                <text x="20" y="84" fontSize="10" fill="#998e83">50%</text>
                <text x="25" y="134" fontSize="10" fill="#998e83">0%</text>
                {weekly.map((item, idx) => {
                  const x = 65 + idx * 50
                  const barHeight = Math.min(100, Math.max(0, (item.pct / 100) * 100))
                  const y = 130 - barHeight
                  return (
                    <g key={item.date || item.label}>
                      <rect
                        x={x - 14}
                        y={y}
                        width="28"
                        height={barHeight}
                        rx="4"
                        fill="#3d5a45"
                        opacity="0.85"
                      />
                      <text x={x} y={y - 6} fontSize="10" fill="#3d5a45" textAnchor="middle" fontWeight="600">
                        {item.pct}%
                      </text>
                      <text x={x} y="152" fontSize="11" fill="#665c52" textAnchor="middle">
                        {item.label}
                      </text>
                    </g>
                  )
                })}
              </svg>
            ) : (
              <p style={{ textAlign: 'center', color: 'var(--muted)', padding: '40px 0' }}>
                Memuat data okupansi studio...
              </p>
            )}
          </div>
        </div>

        <div className="card analytics-card">
          <div className="card-head">
            <div>
              <h3>Rasio Popularitas Kategori</h3>
              <p>Sebaran reservasi matras berdasarkan disiplin kebugaran.</p>
            </div>
            <UsersRound size={18} className="muted-icon" />
          </div>
          <div className="category-bars">
            {categories.length > 0 ? (
              <>
                {categories.map((cat) => (
                  <div key={cat.name} className="cat-progress-item">
                    <div className="cat-meta">
                      <span>{cat.name} ({cat.sessionCount} sesi)</span>
                      <strong>{cat.pct}%</strong>
                    </div>
                    <div className="cat-track">
                      <div
                        className="cat-fill"
                        style={{ width: `${cat.pct}%`, backgroundColor: cat.color }}
                      />
                    </div>
                  </div>
                ))}
                <div className="cat-legend">
                  {categories.map((cat) => (
                    <div className="legend-chip" key={cat.name}>
                      <span className="dot" style={{ backgroundColor: cat.color }} /> {cat.name} {cat.pct}%
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <p style={{ textAlign: 'center', color: 'var(--muted)', padding: '40px 0' }}>
                Belum ada data kategori sesi aktif.
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="card cockpit-actions-card">
        <div className="card-head">
          <div>
            <h3>Pintasan Strategis Pemilik Studio</h3>
            <p>Akses cepat ke konfigurasi sentral dan otorisasi wewenang tim.</p>
          </div>
        </div>
        <div className="quick-action-grid">
          <button className="button button-outline" onClick={() => go?.('/dashboard/accounts')}>
            <UsersRound size={16} /> Kelola Hak Akses Staf <ArrowUpRight size={14} />
          </button>
          <button className="button button-outline" onClick={() => go?.('/dashboard/policy')}>
            <CreditCard size={16} /> Aturan & Prefix Studio <ArrowUpRight size={14} />
          </button>
          <button className="button button-outline" onClick={() => go?.('/dashboard/events')}>
            <Tent size={16} /> Kelola Event Komunitas <ArrowUpRight size={14} />
          </button>
          <button className="button button-outline" onClick={() => go?.('/dashboard/payment')}>
            <Radio size={16} /> Pengaturan Midtrans <ArrowUpRight size={14} />
          </button>
        </div>
      </div>
    </div>
  )
}
