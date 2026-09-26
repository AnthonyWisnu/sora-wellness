import { useState } from 'react'
import { ArrowRight, CalendarDays } from 'lucide-react'
import type { SiteSection } from '../../shared/api'
import { formatDate } from '../../shared/format'
import type { SiteBlockContext } from './public-types'
import { SessionCard } from './SessionCard'

export function PublicSessions({ section, ctx }: { section: SiteSection; ctx: SiteBlockContext }) {
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const active = new Set(ctx.classTypes.map((item) => item.id))
  const featured = section.featuredClassTypeIds.length
    ? ctx.sessions.filter(
        (session) =>
          active.has(session.classTypeId) &&
          section.featuredClassTypeIds.includes(session.classTypeId),
      )
    : ctx.sessions
  const dates = [...new Set(ctx.sessions.map((session) => session.localDate))]
  const scheduleSessions = selectedDate
    ? ctx.visibleSessions.filter((session) => session.localDate === selectedDate)
    : ctx.visibleSessions

  if (ctx.page === 'schedule') {
    return (
      <section className="zeira-section shell zeira-schedule-section">
        <div className="zeira-section-heading zeira-schedule-heading">
          <div>
            <span className="zeira-overline">RESERVASI KELAS</span>
            <h2>{section.title}</h2>
            <p>{section.body}</p>
          </div>
          <span className="zeira-schedule-window">
            Jadwal tersedia {ctx.member ? ctx.memberDays : ctx.guestDays} hari ke depan
          </span>
        </div>
        <div className="zeira-schedule-filters">
          <div className="zeira-filter-list" aria-label="Filter kategori kelas">
            {['Semua', ...new Set(ctx.sessions.map((session) => session.category))].map((item) => (
              <button
                key={item}
                className={ctx.category === item ? 'active' : ''}
                onClick={() => ctx.setCategory(item)}
              >
                {item === 'Semua' ? 'Semua kelas' : item}
              </button>
            ))}
          </div>
        </div>
        {dates.length > 0 && (
          <div className="zeira-date-rail" aria-label="Filter tanggal">
            <span>
              <CalendarDays size={17} /> Pilih tanggal
            </span>
            <div className="zeira-date-options">
              <button
                className={!selectedDate ? 'active' : ''}
                onClick={() => setSelectedDate(null)}
              >
                Semua
                <br />
                <strong>hari</strong>
              </button>
              {dates.map((date) => (
                <button
                  key={date}
                  className={selectedDate === date ? 'active' : ''}
                  onClick={() => setSelectedDate(date)}
                >
                  {formatDate(date, { weekday: 'short' })}
                  <br />
                  <strong>{formatDate(date, { day: 'numeric' })}</strong>
                </button>
              ))}
            </div>
          </div>
        )}
        {section.featuredClassTypeIds.length > 0 && featured.length > 0 && (
          <div className="zeira-featured-sessions">
            <span className="zeira-overline">PILIHAN STUDIO</span>
            <div className="zeira-home-session-grid">
              {featured.slice(0, 2).map((session) => (
                <SessionCard
                  key={session.id}
                  session={session}
                  timezone={ctx.timezone}
                  openBooking={ctx.openBooking}
                  compact
                />
              ))}
            </div>
          </div>
        )}
        <div className="zeira-schedule-list">
          {scheduleSessions.length ? (
            scheduleSessions.map((session) => (
              <SessionCard
                key={session.id}
                session={session}
                timezone={ctx.timezone}
                openBooking={ctx.openBooking}
              />
            ))
          ) : (
            <div className="zeira-empty">
              <h3>Belum ada kelas untuk pilihan ini</h3>
              <p>Pilih kategori atau tanggal lain untuk melihat sesi yang tersedia.</p>
            </div>
          )}
        </div>
      </section>
    )
  }

  return (
    <section className="zeira-section shell zeira-home-sessions">
      <div className="zeira-section-heading">
        <div>
          <span className="zeira-overline">PAPAN RESERVASI</span>
          <h2>{section.title}</h2>
          {section.body && <p>{section.body}</p>}
        </div>
        <button className="zeira-btn zeira-btn-primary" onClick={() => ctx.go('/jadwal')}>
          Lihat seluruh jadwal <ArrowRight size={15} />
        </button>
      </div>
      <div className="zeira-home-session-grid">
        {featured.slice(0, 2).map((session) => (
          <SessionCard
            key={session.id}
            session={session}
            timezone={ctx.timezone}
            openBooking={ctx.openBooking}
            compact
          />
        ))}
      </div>
      {!featured.length && (
        <div className="zeira-empty">
          <h3>Belum ada sesi terdekat</h3>
          <p>Jadwal terbaru akan muncul di sini setelah studio menambahkannya.</p>
        </div>
      )}
    </section>
  )
}
