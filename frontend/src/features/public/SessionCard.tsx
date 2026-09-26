import { ArrowRight, CalendarDays, Clock3, UserRound, UsersRound } from 'lucide-react'
import type { Session } from '../../shared/api'
import { formatDate, levelName, localTime, money } from '../../shared/format'

export function SessionCard({
  session,
  timezone,
  openBooking,
  compact = false,
}: {
  session: Session
  timezone: string
  openBooking: (session: Session) => void
  compact?: boolean
}) {
  return (
    <article className={`zeira-session-card${compact ? ' zeira-session-compact' : ''}`}>
      <div className="zeira-session-time">
        <span>
          <CalendarDays size={15} />{' '}
          {formatDate(session.localDate, { weekday: 'long', day: 'numeric', month: 'short' })}
        </span>
        <strong>{localTime(session.startsAt, timezone)}</strong>
        <small>
          <Clock3 size={13} /> Waktu studio
        </small>
      </div>
      <div className="zeira-session-detail">
        <div className="zeira-session-labels">
          <span>{session.category}</span>
          <small>{levelName(session.level)}</small>
        </div>
        <h3>{session.title}</h3>
        <div className="zeira-session-meta">
          <span>
            <UserRound size={14} /> {session.coachName}
          </span>
          <span>
            <UsersRound size={14} /> {session.seatsLeft} dari {session.capacity} kursi tersisa
          </span>
        </div>
      </div>
      <div className="zeira-session-action">
        <small>Harga kelas satuan</small>
        <strong>{session.singlePriceIdr === 0 ? 'Gratis' : money(session.singlePriceIdr)}</strong>
        <button disabled={session.seatsLeft === 0} onClick={() => openBooking(session)}>
          {session.seatsLeft === 0 ? 'Kelas penuh' : 'Pesan kelas'} <ArrowRight size={15} />
        </button>
      </div>
    </article>
  )
}
