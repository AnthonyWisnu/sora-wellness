import {
  CalendarDays,
  Clock,
  LockKeyhole,
  Plus,
  QrCode,
  ShieldCheck,
  User,
  Users,
  Wallet,
  Zap,
  Coins,
  Armchair,
} from 'lucide-react'
import type { AdminSession } from '../../shared/api'
import { formatDate, localTime, money } from '../../shared/format'
import type { AdminTab } from './admin-types'

type Props = {
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
  adminTab,
  summary,
  timezone,
  busy,
  go,
  cancelStudioSession,
}: Props) {
  const upcoming = summary?.sessions ?? []

  return (
    <>
      {adminTab === 'sessions' && (
        <div className="admin-control-tower">
          <div className="admin-quick-actions-bar">
            <div className="admin-quick-actions-title">
              <Zap size={16} style={{ color: 'var(--green, #17392e)' }} />
              <span>Pintasan Operasional Resepsionis:</span>
            </div>
            <div className="admin-quick-actions-buttons">
              <button
                type="button"
                className="button button-primary"
                onClick={() => go?.('/dashboard/manage')}
              >
                <Plus size={14} /> Buat Sesi Baru
              </button>
              <button
                type="button"
                className="button button-outline"
                onClick={() => go?.('/dashboard/attendance')}
              >
                <QrCode size={14} /> Scan Presensi (QR)
              </button>
              <button
                type="button"
                className="button button-outline"
                onClick={() => go?.('/dashboard/lockers')}
              >
                <LockKeyhole size={14} /> Matriks Loker
              </button>
              <button
                type="button"
                className="button button-outline"
                onClick={() => go?.('/dashboard/finance')}
              >
                <Wallet size={14} /> Laporan Transaksi
              </button>
            </div>
          </div>

          <div className="admin-kpi-grid">
            <div className="admin-kpi-card">
              <div className="admin-kpi-head">
                <span>SESI MENDATANG</span>
                <div className="admin-kpi-icon">
                  <CalendarDays size={16} />
                </div>
              </div>
              <div className="admin-kpi-val">{summary?.upcomingCount ?? '-'}</div>
              <p className="admin-kpi-desc">Kelas terjadwal berikutnya.</p>
            </div>

            <div className="admin-kpi-card">
              <div className="admin-kpi-head">
                <span>KELAS HARI INI</span>
                <div className="admin-kpi-icon" style={{ background: '#ecfdf5', color: '#059669' }}>
                  <Clock size={16} />
                </div>
              </div>
              <div className="admin-kpi-val" style={{ color: '#059669' }}>
                {summary?.todayCount ?? '-'}
              </div>
              <p className="admin-kpi-desc">Sesi aktif hari ini di studio.</p>
            </div>

            <div className="admin-kpi-card">
              <div className="admin-kpi-head">
                <span>PELATIH BERTUGAS</span>
                <div className="admin-kpi-icon" style={{ background: '#eff6ff', color: '#2563eb' }}>
                  <Users size={16} />
                </div>
              </div>
              <div className="admin-kpi-val" style={{ color: '#1e40af' }}>
                {summary?.coachCount ?? '-'}
              </div>
              <p className="admin-kpi-desc">Pelatih dengan sesi mendatang.</p>
            </div>

            <div className="admin-kpi-card" style={{ borderLeft: '3px solid #17392e' }}>
              <div className="admin-kpi-head">
                <span>STATUS STUDIO</span>
                <div className="admin-kpi-icon" style={{ background: '#fef3c7', color: '#b45309' }}>
                  <ShieldCheck size={16} />
                </div>
              </div>
              <div className="admin-kpi-val" style={{ fontSize: '20px', marginTop: '8px' }}>
                SIAP OPERASIONAL
              </div>
              <p className="admin-kpi-desc">Waktu Makassar (WITA) · Gateway Aktif</p>
            </div>
          </div>

          <div className="live-section-head" style={{ marginTop: '8px' }}>
            <h2>Sesi terdekat</h2>
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
                        <Armchair size={13} /> {row.capacity} kursi kuota
                      </span>
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <button
                    type="button"
                    className="button button-outline"
                    onClick={() => go?.('/dashboard/attendance')}
                  >
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
              <div className="panel" style={{ textAlign: 'center', padding: '36px' }}>
                <CalendarDays size={32} style={{ color: 'var(--muted)', margin: '0 auto 10px' }} />
                <p style={{ margin: 0, color: 'var(--muted)' }}>Belum ada sesi mendatang yang terjadwal.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  )
}
