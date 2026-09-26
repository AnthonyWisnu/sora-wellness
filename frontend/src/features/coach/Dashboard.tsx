import { useCallback, useEffect, useState } from 'react'
import { CalendarDays, HeartPulse, ShieldCheck, UsersRound } from 'lucide-react'
import { api, type CoachParticipants, type CoachSession } from '../../shared/api'
import { formatDate, localDateTime } from '../../shared/format'
import { errorMessage } from '../../shared/errors'
import '../dashboard/Panels.css'

type CoachSummary = {
  assignedCount: number
  upcomingCount: number
  participantCount: number
  sessions: CoachSession[]
}

export function CoachDashboard({
  section,
  timezone,
  show,
  go,
}: {
  section: string
  timezone: string
  show: (text: string) => void
  go: (path: string) => void
}) {
  const [date, setDate] = useState('')
  const [sessions, setSessions] = useState<CoachSession[]>([])
  const [summary, setSummary] = useState<CoachSummary | null>(null)
  const [selected, setSelected] = useState<CoachSession | null>(null)
  const [details, setDetails] = useState<CoachParticipants | null>(null)
  const [busy, setBusy] = useState(false)
  const loadSessions = useCallback(async () => {
    const rows = await api<CoachSession[]>(
      `/coach/sessions${date ? `?date=${encodeURIComponent(date)}` : ''}`,
    )
    setSessions(rows)
    const first =
      rows.find((session) => session.status !== 'cancelled' && session.participantCount > 0) ??
      rows.find((session) => session.status !== 'cancelled')
    setSelected(first ?? null)
    setDetails(
      first ? await api<CoachParticipants>(`/coach/sessions/${first.id}/participants`) : null,
    )
  }, [date])
  useEffect(() => {
    if (section === 'attendance') void loadSessions().catch((error) => show(errorMessage(error)))
  }, [section, loadSessions, show])
  useEffect(() => {
    if (section !== 'overview') return
    void api<CoachSummary>('/coach/sessions/summary')
      .then(setSummary)
      .catch((error) => show(errorMessage(error)))
  }, [section, show])

  async function open(session: CoachSession) {
    setSelected(session)
    setDetails(null)
    try {
      setDetails(await api<CoachParticipants>(`/coach/sessions/${session.id}/participants`))
    } catch (error) {
      setSelected(null)
      show(errorMessage(error))
    }
  }
  async function mark(customerId: string, present: boolean) {
    if (!selected) return
    setBusy(true)
    try {
      await api(`/coach/sessions/${selected.id}/attendance/${customerId}`, {
        method: 'PUT',
        body: { present },
      })
      setDetails(await api<CoachParticipants>(`/coach/sessions/${selected.id}/participants`))
      show('Absensi tersimpan.')
    } catch (error) {
      show(errorMessage(error))
    } finally {
      setBusy(false)
    }
  }
  const canMark =
    selected &&
    selected.status !== 'cancelled' &&
    Date.now() >= new Date(selected.startsAt).getTime() &&
    Date.now() <= new Date(selected.endsAt).getTime() + 24 * 60 * 60 * 1000

  return (
    <section className="live-coach">
      {section === 'overview' ? (
        <>
          <div className="live-stats">
            <div className="panel">
              <span className="eyebrow">KELAS DITUGASKAN</span>
              <h2>{summary?.assignedCount ?? '—'}</h2>
              <p>Sesi dalam daftar kelas Anda.</p>
            </div>
            <div className="panel">
              <span className="eyebrow">SESI MENDATANG</span>
              <h2>{summary?.upcomingCount ?? '—'}</h2>
              <p>Kelas yang belum dimulai.</p>
            </div>
            <div className="panel">
              <span className="eyebrow">PESERTA TERDAFTAR</span>
              <h2>{summary?.participantCount ?? '—'}</h2>
              <p>Di seluruh sesi yang ditugaskan.</p>
            </div>
          </div>
          <div className="live-section-head">
            <h2>Kelas mendatang</h2>
            <button className="button button-outline" onClick={() => go('/dashboard/attendance')}>
              Buka peserta & absensi
            </button>
          </div>
          <div className="live-booking-list">
            {summary?.sessions.map((session) => (
              <article className="panel live-booking" key={session.id}>
                <div>
                  <span className="eyebrow">
                    {formatDate(session.localDate, {
                      weekday: 'long',
                      day: 'numeric',
                      month: 'long',
                    })}
                  </span>
                  <h3>{session.title}</h3>
                  <p>
                    {localDateTime(session.startsAt, timezone)} · {session.participantCount} peserta
                  </p>
                </div>
                <button className="button button-text" onClick={() => go('/dashboard/attendance')}>
                  Lihat peserta
                </button>
              </article>
            ))}
            {summary && !summary.sessions.length && (
              <div className="panel">
                <p>Belum ada kelas mendatang yang ditugaskan.</p>
              </div>
            )}
          </div>
        </>
      ) : (
        <>
          <div className="live-section-head">
            <h2>Kelas yang Anda ajar</h2>
          </div>
          <label className="live-coach-filter">
            Cari kelas pada tanggal tertentu
            <input
              type="date"
              value={date}
              onChange={(event) => {
                setDate(event.target.value)
                setSelected(null)
                setDetails(null)
              }}
            />
          </label>
          <div className="live-coach-layout">
            <div className="live-coach-sessions">
              {sessions.length ? (
                sessions.map((session) => (
                  <button
                    key={session.id}
                    className={`panel live-coach-session ${selected?.id === session.id ? 'selected' : ''}`}
                    onClick={() => void open(session)}
                  >
                    <span className="eyebrow">
                      <CalendarDays size={15} />{' '}
                      {formatDate(session.localDate, {
                        weekday: 'long',
                        day: 'numeric',
                        month: 'long',
                      })}
                    </span>
                    <strong>{session.title}</strong>
                    <small>
                      {localDateTime(session.startsAt, timezone)} · {session.participantCount}{' '}
                      peserta ·{' '}
                      {session.status === 'cancelled'
                        ? 'Dibatalkan'
                        : new Date(session.endsAt).getTime() < Date.now()
                          ? 'Selesai'
                          : 'Terjadwal'}
                    </small>
                  </button>
                ))
              ) : (
                <div className="panel">
                  <p>Belum ada kelas yang ditugaskan.</p>
                </div>
              )}
            </div>
            <div className="panel live-coach-participants">
              {!selected ? (
                <div className="live-coach-empty">
                  <UsersRound size={28} />
                  <h3>Pilih kelas</h3>
                  <p>Daftar peserta dan absensi hanya tersedia untuk kelas yang Anda ajar.</p>
                </div>
              ) : !details ? (
                <p>Memuat peserta...</p>
              ) : (
                <>
                  <span className="eyebrow">DAFTAR PESERTA</span>
                  <h2>{selected.title}</h2>
                  <p>
                    {localDateTime(selected.startsAt, timezone)} · {details.participants.length}{' '}
                    peserta terkonfirmasi
                  </p>
                  {details.participants.length ? (
                    details.participants.map((person) => (
                      <div className="live-coach-person" key={person.bookingId}>
                        <div>
                          <strong>{person.fullName}</strong>
                          {person.healthNote && (
                            <div className="live-health-note">
                              <HeartPulse size={15} />
                              <div>
                                <span>
                                  {person.healthSource === 'snapshot'
                                    ? 'Catatan saat kelas berlangsung'
                                    : 'Catatan kesehatan terkini'}
                                </span>
                                <p>{person.healthNote}</p>
                              </div>
                            </div>
                          )}
                        </div>
                        <div className="live-attendance-actions">
                          <span>
                            {person.present === null
                              ? 'Belum dicatat'
                              : person.present
                                ? 'Hadir'
                                : 'Tidak hadir'}
                          </span>
                          <button
                            className="button button-outline"
                            disabled={!canMark || busy}
                            onClick={() => void mark(person.customerId, true)}
                          >
                            Hadir
                          </button>
                          <button
                            className="button button-text"
                            disabled={!canMark || busy}
                            onClick={() => void mark(person.customerId, false)}
                          >
                            Tidak hadir
                          </button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p>Belum ada peserta terkonfirmasi untuk sesi ini.</p>
                  )}
                  {!canMark && (
                    <p className="live-note">
                      <ShieldCheck size={15} /> Absensi dapat diubah sejak kelas dimulai sampai 24
                      jam setelah selesai.
                    </p>
                  )}
                </>
              )}
            </div>
          </div>
        </>
      )}
    </section>
  )
}
