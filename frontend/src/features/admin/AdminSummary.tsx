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
  cancelStudioSession: (id: string) => void
}
export function AdminSummary({ adminTab, summary, timezone, busy, cancelStudioSession }: Props) {
  const upcoming = summary?.sessions ?? []
  return (
    <>
      {adminTab === 'sessions' && (
        <>
          <div className="live-stats">
            <div className="panel">
              <span className="eyebrow">SESI MENDATANG</span>
              <h2>{summary?.upcomingCount ?? '—'}</h2>
              <p>Kelas terjadwal berikutnya.</p>
            </div>
            <div className="panel">
              <span className="eyebrow">KELAS HARI INI</span>
              <h2>{summary?.todayCount ?? '—'}</h2>
              <p>Sesi yang belum dimulai hari ini.</p>
            </div>
            <div className="panel">
              <span className="eyebrow">PELATIH AKTIF</span>
              <h2>{summary?.coachCount ?? '—'}</h2>
              <p>Pelatih dengan sesi mendatang.</p>
            </div>
          </div>
          <div className="live-section-head">
            <h2>Sesi terdekat</h2>
          </div>
          <div className="live-booking-list">
            {upcoming.map((row) => (
              <article className="panel live-booking" key={row.id}>
                <div>
                  <span className="eyebrow">
                    {formatDate(row.local_date.slice(0, 10), { day: 'numeric', month: 'long' })}
                  </span>
                  <h3>{row.title}</h3>
                  <p>
                    {row.coach_name} · {localTime(row.starts_at, timezone)} WITA ·{' '}
                    {money(row.price_idr)} · {row.capacity} kursi
                  </p>
                </div>
                <button
                  className="button button-text live-danger"
                  disabled={busy}
                  onClick={() => void cancelStudioSession(row.id)}
                >
                  Batalkan sesi
                </button>
              </article>
            ))}
            {!upcoming.length && (
              <div className="panel">
                <p>Belum ada sesi mendatang.</p>
              </div>
            )}
          </div>
        </>
      )}
    </>
  )
}
