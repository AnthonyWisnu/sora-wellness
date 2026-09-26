import { useEffect, useMemo, useRef, useState } from 'react'
import { ArrowRight } from 'lucide-react'
import type { SiteSection } from '../../shared/api'
import { formatDate } from '../../shared/format'
import type { SiteBlockContext } from './public-types'
import { scheduleDates, studioToday } from './schedule-dates'
import { ScheduleDateRail } from './ScheduleDateRail'
import { SessionCard } from './SessionCard'

export function PublicSessions({ section, ctx }: { section: SiteSection; ctx: SiteBlockContext }) {
  const [selectedDate, setSelectedDate] = useState('')
  const [weekIndex, setWeekIndex] = useState(0)
  const firstDate = studioToday(ctx.timezone)
  const dates = useMemo(
    () => scheduleDates(firstDate, ctx.member ? ctx.memberDays : ctx.guestDays),
    [firstDate, ctx.member, ctx.memberDays, ctx.guestDays],
  )
  const previousWindow = useRef(dates.length)
  useEffect(() => {
    if (previousWindow.current !== dates.length) {
      previousWindow.current = dates.length
      setSelectedDate('')
    }
  }, [dates.length])
  const counts = useMemo(() => {
    const result = new Map<string, number>()
    for (const session of ctx.visibleSessions)
      result.set(session.localDate, (result.get(session.localDate) ?? 0) + 1)
    return result
  }, [ctx.visibleSessions])
  useEffect(() => {
    if (ctx.sessionsStatus !== 'ready') return
    if (dates.includes(selectedDate)) return
    const nearest = dates.find((date) => (counts.get(date) ?? 0) > 0) ?? dates[0] ?? ''
    setSelectedDate(nearest)
    setWeekIndex(Math.max(0, Math.floor(dates.indexOf(nearest) / 7)))
  }, [ctx.sessionsStatus, selectedDate, dates, counts])
  const activeDate = dates.includes(selectedDate)
    ? selectedDate
    : (dates.find((date) => (counts.get(date) ?? 0) > 0) ?? dates[0] ?? '')
  const scheduleSessions = ctx.visibleSessions.filter((session) => session.localDate === activeDate)
  const activeTypes = new Set(ctx.classTypes.map((item) => item.id))
  const featured = section.featuredClassTypeIds.length
    ? ctx.sessions.filter(
        (session) =>
          activeTypes.has(session.classTypeId) &&
          section.featuredClassTypeIds.includes(session.classTypeId),
      )
    : ctx.sessions
  const state =
    ctx.sessionsStatus === 'loading' ? (
      <div className="zeira-empty" role="status">
        <h3>Memuat jadwal kelas…</h3>
      </div>
    ) : ctx.sessionsStatus === 'error' ? (
      <div className="zeira-empty" role="alert">
        <h3>Jadwal belum dapat dimuat</h3>
        <button className="zeira-btn zeira-btn-outline" onClick={ctx.retrySessions}>
          Coba lagi
        </button>
      </div>
    ) : null

  if (ctx.page === 'schedule') {
    const categories = [...new Set(ctx.classTypes.map((item) => item.category))]
    return (
      <section className="zeira-section shell zeira-schedule-section">
        <div className="zeira-section-heading zeira-schedule-heading">
          <div>
            <span className="zeira-overline">RESERVASI KELAS</span>
            <h2>{section.title}</h2>
            {section.body && <p>{section.body}</p>}
          </div>
          <span className="zeira-schedule-window">
            Jadwal tersedia {dates.length} hari ke depan
          </span>
        </div>
        {state || (
          <>
            <div className="zeira-schedule-filters">
              <div className="zeira-filter-list" aria-label="Filter kategori kelas">
                {['Semua', ...categories].map((item) => (
                  <button
                    type="button"
                    key={item}
                    className={ctx.category === item ? 'active' : ''}
                    aria-pressed={ctx.category === item}
                    onClick={() => ctx.setCategory(item)}
                  >
                    {item === 'Semua' ? 'Semua kelas' : item}
                  </button>
                ))}
              </div>
            </div>
            {dates.length > 0 && (
              <ScheduleDateRail
                dates={dates}
                selected={activeDate}
                counts={counts}
                weekIndex={weekIndex}
                onSelect={setSelectedDate}
                onWeek={(next) => {
                  setWeekIndex(next)
                  const week = dates.slice(next * 7, next * 7 + 7)
                  setSelectedDate(week.find((date) => (counts.get(date) ?? 0) > 0) ?? week[0] ?? '')
                }}
              />
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
                  <h3>
                    {ctx.visibleSessions.length
                      ? 'Tidak ada kelas pada tanggal ini'
                      : 'Belum ada kelas untuk kategori ini'}
                  </h3>
                  <p>
                    {activeDate
                      ? `${formatDate(activeDate, { weekday: 'long', day: 'numeric', month: 'long' })}. Pilih tanggal atau kategori lain.`
                      : 'Jadwal belum tersedia.'}
                  </p>
                </div>
              )}
            </div>
          </>
        )}
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
      {state ||
        (featured.length ? (
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
        ) : (
          <div className="zeira-empty">
            <h3>Belum ada sesi terdekat</h3>
            <p>Jadwal terbaru akan muncul di sini setelah studio menambahkannya.</p>
          </div>
        ))}
    </section>
  )
}
