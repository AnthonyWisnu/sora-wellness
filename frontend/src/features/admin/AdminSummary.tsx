import { useEffect, useState } from 'react'
import {
  Armchair,
  CalendarDays,
  Coins,
  LockKeyhole,
  Plus,
  QrCode,
  Tent,
  User,
  Wallet,
} from 'lucide-react'
import { api, type Actor, type AdminSession, type ExecutiveMetricsResponse } from '../../shared/api'
import { formatDate, localTime, money } from '../../shared/format'
import type { AdminTab } from './admin-types'

type Props = {
  actor?: Actor
  adminTab: AdminTab
  summary: {
    upcomingCount: number
    todayCount: number
    coachCount: number
    sessions: AdminSession[]
  } | null
  timezone: string
  busy: boolean
  go?: (path: string) => void
  cancelStudioSession: (id: string) => void
}

export function AdminSummary({
  actor,
  adminTab,
  summary,
  timezone,
  busy,
  go,
  cancelStudioSession,
}: Props) {
  const [finMetrics, setFinMetrics] = useState<ExecutiveMetricsResponse | null>(null)

  const perms = actor?.permissions ?? []
  const isSuper = actor?.role === 'superadmin'
  const isLegacyFinance = actor?.role === 'finance'

  const showFrontDesk =
    isSuper || perms.includes('front_desk') || perms.includes('lockers') || (!isLegacyFinance && perms.length === 0)
  const showClasses =
    isSuper || perms.includes('classes_schedule') || (!isLegacyFinance && perms.length === 0)
  const showEvents = isSuper || perms.includes('community_events')
  const showFinance =
    isSuper || isLegacyFinance || perms.includes('finance_reports') || perms.includes('finance_payouts')

  useEffect(() => {
    if (!showFinance || adminTab !== 'sessions') return
    let active = true
    void (async () => {
      try {
        const res = await api<ExecutiveMetricsResponse>('/admin/executive-metrics')
        if (active) setFinMetrics(res)
      } catch {
        // Biarkan jika gagal
      }
    })()
    return () => {
      active = false
    }
  }, [showFinance, adminTab])

  if (adminTab !== 'sessions') return null

  const upcoming = summary?.sessions ?? []

  return (
    <div className="admin-adaptive-dashboard">
      {/* 1. Widget Meja Depan & Loker */}
      {showFrontDesk && (
        <section className="card widget-card">
          <div className="card-head">
            <div>
              <h3>Workstation Meja Depan & Loker</h3>
              <p>Operasional penyambutan kedatangan tamu studio hari ini.</p>
            </div>
            <div className="widget-actions">
              <button className="button button-primary" onClick={() => go?.('/dashboard/attendance')}>
                <QrCode size={14} /> Scan Tiket Lobi
              </button>
              <button className="button button-outline" onClick={() => go?.('/dashboard/lockers')}>
                <LockKeyhole size={14} /> Matriks Loker
              </button>
            </div>
          </div>
          <div className="metrics-grid">
            <div className="metric-card">
              <span className="metric-label">Kelas Hari Ini</span>
              <strong className="metric-value">{summary?.todayCount ?? 0}</strong>
              <span className="metric-hint">Sesi aktif berjalan</span>
            </div>
            <div className="metric-card">
              <span className="metric-label">Pelatih Bertugas</span>
              <strong className="metric-value">{summary?.coachCount ?? 0}</strong>
              <span className="metric-hint">Instruktur terdaftar</span>
            </div>
            <div className="metric-card">
              <span className="metric-label">Status Terminal</span>
              <strong className="metric-value" style={{ fontSize: '18px' }}>Siap Layani Tamu</strong>
              <span className="metric-hint positive">Waktu Makassar (WITA)</span>
            </div>
          </div>
        </section>
      )}

      {/* 2. Widget Finansial & Payout */}
      {showFinance && (
        <section className="card widget-card">
          <div className="card-head">
            <div>
              <h3>Ikhtisar Finansial & Kas Studio</h3>
              <p>Pemantauan omzet penjualan, transaksi berhasil, dan permohonan penarikan saldo.</p>
            </div>
            <div className="widget-actions">
              <button className="button button-primary" onClick={() => go?.('/dashboard/finance')}>
                <Wallet size={14} /> Laporan Transaksi
              </button>
            </div>
          </div>
          <div className="metrics-grid">
            <div className="metric-card">
              <span className="metric-label">Omzet Bulan Berjalan</span>
              <strong className="metric-value">
                {finMetrics ? money(finMetrics.monthlyRevenueIdr) : '...'}
              </strong>
              <span className="metric-hint positive">
                {finMetrics ? `${finMetrics.monthlyTransactionsCount} transaksi sukses` : 'Memuat data...'}
              </span>
            </div>
            <div className="metric-card">
              <span className="metric-label">Antrean Tarik Saldo</span>
              <strong className="metric-value">
                {finMetrics ? `${finMetrics.pendingPayoutCount} pengajuan` : '...'}
              </strong>
              <span className="metric-hint">
                {finMetrics ? `Total: ${money(finMetrics.pendingPayoutAmountIdr)}` : 'Memuat data...'}
              </span>
            </div>
            <div className="metric-card">
              <span className="metric-label">Total Saldo Dompet Member</span>
              <strong className="metric-value">
                {finMetrics ? money(finMetrics.totalWalletLiabilityIdr) : '...'}
              </strong>
              <span className="metric-hint">Kewajiban deposit member</span>
            </div>
            <div className="metric-card">
              <span className="metric-label">Gateway Pembayaran</span>
              <strong className="metric-value" style={{ fontSize: '18px' }}>Midtrans Sandbox</strong>
              <span className="metric-hint positive">Snap 15 menit & Webhook Aktif</span>
            </div>
          </div>
        </section>
      )}

      {/* 3. Widget Event Komunitas Luar Studio */}
      {showEvents && (
        <section className="card widget-card">
          <div className="card-head">
            <div>
              <h3>Event Komunitas & Outreach</h3>
              <p>Pelaksanaan kegiatan luar studio untuk akuisisi calon member baru.</p>
            </div>
            <div className="widget-actions">
              <button className="button button-outline" onClick={() => go?.('/dashboard/events')}>
                <Tent size={14} /> Kelola Event Komunitas
              </button>
            </div>
          </div>
          <div className="metrics-grid">
            <div className="metric-card">
              <span className="metric-label">Agenda Outdoor</span>
              <strong className="metric-value">Aktif</strong>
              <span className="metric-hint positive">Brosur dan registrasi publik terbuka</span>
            </div>
          </div>
        </section>
      )}

      {/* 4. Widget Sesi & Kelas Studio */}
      {showClasses && (
        <section className="card widget-card">
          <div className="card-head">
            <div>
              <h3>Jadwal & Sesi Kelas Studio</h3>
              <p>Daftar sesi kelas studio terdekat yang terjadwal.</p>
            </div>
            <div className="widget-actions">
              <button className="button button-primary" onClick={() => go?.('/dashboard/manage')}>
                <Plus size={14} /> Buat Sesi Baru
              </button>
            </div>
          </div>

          <div className="admin-timeline-section">
            {upcoming.map((row) => (
              <article className="panel admin-session-item live-booking" key={row.id}>
                <div className="admin-session-item-left">
                  <div className="admin-session-time-badge">
                    <strong>{localTime(row.starts_at, timezone)}</strong>
                    <small>WITA</small>
                  </div>
                  <div className="admin-session-info">
                    <span className="eyebrow">
                      {formatDate(row.local_date.slice(0, 10), {
                        weekday: 'long',
                        day: 'numeric',
                        month: 'long',
                      })}
                    </span>
                    <h3>{row.title}</h3>
                    <div className="admin-session-meta">
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                        <User size={13} /> {row.coach_name}
                      </span>
                      <span>·</span>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                        <Coins size={13} /> {money(row.price_idr)}
                      </span>
                      <span>·</span>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                        <Armchair size={13} /> {row.capacity} kursi
                      </span>
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <button type="button" className="button button-outline" onClick={() => go?.('/dashboard/attendance')}>
                    Presensi
                  </button>
                  <button
                    type="button"
                    className="button button-text live-danger"
                    disabled={busy}
                    onClick={() => void cancelStudioSession(row.id)}
                  >
                    Batalkan sesi
                  </button>
                </div>
              </article>
            ))}
            {!upcoming.length && (
              <div className="panel" style={{ textAlign: 'center', padding: '32px' }}>
                <CalendarDays size={28} style={{ color: 'var(--muted)', margin: '0 auto 8px' }} />
                <p style={{ margin: 0, color: 'var(--muted)' }}>Belum ada sesi mendatang yang terjadwal.</p>
              </div>
            )}
          </div>
        </section>
      )}
    </div>
  )
}
