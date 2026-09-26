import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  AlertTriangle,
  ArrowLeft,
  CalendarDays,
  ChevronRight,
  Clock,
  Search,
  ShieldCheck,
  UserCheck,
  UsersRound,
  X,
} from 'lucide-react'
import { api, type CoachParticipants, type CoachSession } from '../../shared/api'
import { formatDate, localDateTime, money } from '../../shared/format'
import { errorMessage } from '../../shared/errors'
import '../dashboard/Panels.css'

type CoachSummary = {
  assignedCount: number
  upcomingCount: number
  participantCount: number
  completedCount?: number
  attendedCount?: number
  estimatedEarnings?: number
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
  const [filterTab, setFilterTab] = useState<'all' | 'today' | 'upcoming' | 'completed'>('all')
  const [searchQuery, setSearchQuery] = useState('')

  const todayStr = useMemo(() => {
    try {
      return new Intl.DateTimeFormat('en-CA', { timeZone: timezone || 'Asia/Makassar' }).format(new Date())
    } catch {
      return new Date().toISOString().slice(0, 10)
    }
  }, [timezone])

  const loadSessions = useCallback(async () => {
    const rows = await api<CoachSession[]>(
      `/coach/sessions${date ? `?date=${encodeURIComponent(date)}` : ''}`,
    )
    setSessions(rows)
    const first =
      rows.find((session) => session.status !== 'cancelled' && session.participantCount > 0) ??
      rows.find((session) => session.status !== 'cancelled') ??
      rows[0]
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

  const todayCount = useMemo(
    () => sessions.filter((s) => s.localDate === todayStr).length,
    [sessions, todayStr],
  )
  const upcomingCount = useMemo(
    () =>
      sessions.filter(
        (s) => new Date(s.endsAt).getTime() >= Date.now() && s.status !== 'cancelled',
      ).length,
    [sessions],
  )
  const completedCount = useMemo(
    () =>
      sessions.filter(
        (s) => new Date(s.endsAt).getTime() < Date.now() || s.status === 'cancelled',
      ).length,
    [sessions],
  )

  const filteredSessions = useMemo(() => {
    return sessions.filter((session) => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase()
        const matchTitle = session.title.toLowerCase().includes(q)
        const matchCat = (session.category || '').toLowerCase().includes(q)
        if (!matchTitle && !matchCat) return false
      }
      if (date) {
        return session.localDate === date
      }
      if (filterTab === 'today') {
        return session.localDate === todayStr
      }
      if (filterTab === 'upcoming') {
        return new Date(session.endsAt).getTime() >= Date.now() && session.status !== 'cancelled'
      }
      if (filterTab === 'completed') {
        return new Date(session.endsAt).getTime() < Date.now() || session.status === 'cancelled'
      }
      return true
    })
  }, [sessions, searchQuery, date, filterTab, todayStr])

  const handleTabClick = (tab: 'all' | 'today' | 'upcoming' | 'completed') => {
    setFilterTab(tab)
    setDate('')
    const targetSessions = sessions.filter((s) => {
      if (tab === 'today') return s.localDate === todayStr
      if (tab === 'upcoming') return new Date(s.endsAt).getTime() >= Date.now() && s.status !== 'cancelled'
      if (tab === 'completed') return new Date(s.endsAt).getTime() < Date.now() || s.status === 'cancelled'
      return true
    })
    if (targetSessions.length > 0 && (!selected || !targetSessions.some((s) => s.id === selected.id))) {
      void open(targetSessions[0])
    }
  }

  const presentCount = details?.participants.filter((p) => p.present === true).length ?? 0
  const absentCount = details?.participants.filter((p) => p.present === false).length ?? 0
  const unrecordedCount = details?.participants.filter((p) => p.present === null).length ?? 0
  const healthAlertCount = details?.participants.filter((p) => Boolean(p.healthNote)).length ?? 0

  async function markAllPresent() {
    if (!selected || !details?.participants.length) return
    const pending = details.participants.filter((p) => p.present !== true)
    if (!pending.length) {
      show('Semua peserta sudah berstatus hadir.')
      return
    }
    setBusy(true)
    try {
      await Promise.all(
        pending.map((p) =>
          api(`/coach/sessions/${selected.id}/attendance/${p.customerId}`, {
            method: 'PUT',
            body: { present: true },
          }),
        ),
      )
      setDetails(await api<CoachParticipants>(`/coach/sessions/${selected.id}/participants`))
      show(`Berhasil mencatat ${pending.length} peserta hadir.`)
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
              <h2>{summary?.assignedCount ?? '-'}</h2>
              <p>Sesi dalam daftar kelas Anda.</p>
            </div>
            <div className="panel">
              <span className="eyebrow">SESI MENDATANG</span>
              <h2>{summary?.upcomingCount ?? '-'}</h2>
              <p>Kelas yang belum dimulai.</p>
            </div>
            <div className="panel">
              <span className="eyebrow">KELAS SELESAI</span>
              <h2>{summary?.completedCount ?? 0}</h2>
              <p>{summary?.attendedCount ?? 0} total murid hadir.</p>
            </div>
            <div className="panel" style={{ borderLeft: '3px solid #2e5932' }}>
              <span className="eyebrow" style={{ color: '#2e5932' }}>ESTIMASI HONOR</span>
              <h2 style={{ color: '#1b261b' }}>{money(summary?.estimatedEarnings ?? 0)}</h2>
              <p>Honor sesi mengajar & kehadiran.</p>
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
          <div className="live-coach-layout">
            <aside className="live-coach-sidebar">
              <div className="live-coach-filter-bar">
                <div className="live-coach-tabs">
                  <button
                    type="button"
                    className={`live-coach-tab-btn ${filterTab === 'all' && !date ? 'active' : ''}`}
                    onClick={() => handleTabClick('all')}
                  >
                    Semua ({sessions.length})
                  </button>
                  <button
                    type="button"
                    className={`live-coach-tab-btn ${filterTab === 'today' && !date ? 'active' : ''}`}
                    onClick={() => handleTabClick('today')}
                  >
                    Hari Ini ({todayCount})
                  </button>
                  <button
                    type="button"
                    className={`live-coach-tab-btn ${filterTab === 'upcoming' && !date ? 'active' : ''}`}
                    onClick={() => handleTabClick('upcoming')}
                  >
                    Mendatang ({upcomingCount})
                  </button>
                  <button
                    type="button"
                    className={`live-coach-tab-btn ${filterTab === 'completed' && !date ? 'active' : ''}`}
                    onClick={() => handleTabClick('completed')}
                  >
                    Selesai ({completedCount})
                  </button>
                </div>

                <div className="live-coach-search-date-row">
                  <div className="live-coach-search-box">
                    <Search size={14} style={{ color: 'var(--muted)' }} />
                    <input
                      type="text"
                      placeholder="Cari nama kelas..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                    {searchQuery && (
                      <button
                        type="button"
                        style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--muted)' }}
                        onClick={() => setSearchQuery('')}
                      >
                        <X size={13} />
                      </button>
                    )}
                  </div>

                  <label className="live-coach-filter">
                    Cari kelas pada tanggal tertentu
                    <div className="live-date-input-wrap">
                      <input
                        type="date"
                        value={date}
                        onChange={(event) => {
                          setDate(event.target.value)
                          setSelected(null)
                          setDetails(null)
                        }}
                      />
                      {date && (
                        <button
                          type="button"
                          className="live-clear-date-btn"
                          onClick={() => {
                            setDate('')
                            setSelected(null)
                            setDetails(null)
                          }}
                          title="Hapus filter tanggal"
                        >
                          <X size={14} />
                        </button>
                      )}
                    </div>
                  </label>
                </div>
              </div>

              <div className="live-coach-sessions">
                {filteredSessions.length ? (
                  filteredSessions.map((session) => {
                    const isSelected = selected?.id === session.id
                    const isToday = session.localDate === todayStr
                    const isEnded = new Date(session.endsAt).getTime() < Date.now()
                    const isOngoing =
                      Date.now() >= new Date(session.startsAt).getTime() &&
                      Date.now() <= new Date(session.endsAt).getTime()

                    return (
                      <button
                        key={session.id}
                        type="button"
                        className={`panel live-coach-session ${isSelected ? 'selected' : ''}`}
                        onClick={() => {
                          void open(session)
                          if (typeof window !== 'undefined' && window.innerWidth <= 860) {
                            setTimeout(() => {
                              document.querySelector('.live-coach-participants')?.scrollIntoView({ behavior: 'smooth' })
                            }, 50)
                          }
                        }}
                      >
                        <div className="live-coach-session-top">
                          <span className={`live-coach-badge-date ${isToday ? 'today' : ''}`}>
                            <CalendarDays size={13} />{' '}
                            {isToday
                              ? 'Hari Ini'
                              : formatDate(session.localDate, {
                                  weekday: 'short',
                                  day: 'numeric',
                                  month: 'short',
                                })}
                          </span>
                          <span
                            className={`live-coach-status-pill ${
                              session.status === 'cancelled'
                                ? 'cancelled'
                                : isOngoing
                                  ? 'ongoing'
                                  : isEnded
                                    ? 'ended'
                                    : 'upcoming'
                            }`}
                          >
                            {session.status === 'cancelled'
                              ? 'Dibatalkan'
                              : isOngoing
                                ? 'Berlangsung'
                                : isEnded
                                  ? 'Selesai'
                                  : 'Terjadwal'}
                          </span>
                        </div>

                        <div className="live-coach-session-main">
                          <strong className="live-coach-session-title">{session.title}</strong>
                          <ChevronRight size={16} className="live-coach-session-arrow" />
                        </div>

                        <div className="live-coach-session-bottom">
                          <span className="live-coach-session-time">
                            <Clock size={13} /> {localDateTime(session.startsAt, timezone)}
                          </span>
                          <span className="live-coach-session-capacity">
                            <UsersRound size={13} /> {session.participantCount} peserta
                          </span>
                        </div>
                      </button>
                    )
                  })
                ) : (
                  <div className="panel" style={{ padding: '24px 16px', textAlign: 'center' }}>
                    <p style={{ margin: 0, color: 'var(--muted)', fontSize: '13px' }}>
                      {date
                        ? 'Tidak ada kelas pada tanggal yang dipilih.'
                        : 'Tidak ada kelas dalam kategori ini.'}
                    </p>
                  </div>
                )}
              </div>
            </aside>

            <div className="panel live-coach-participants">
              <div className="live-coach-mobile-header">
                <button
                  type="button"
                  className="button button-text"
                  onClick={() => {
                    document.querySelector('.live-coach-sidebar')?.scrollIntoView({ behavior: 'smooth' })
                  }}
                >
                  <ArrowLeft size={15} /> Pilih kelas lain
                </button>
              </div>
              {!selected ? (
                <div className="live-coach-empty">
                  <UsersRound size={32} />
                  <h3>Pilih sesi kelas</h3>
                  <p>Klik salah satu kelas di sebelah kiri untuk melihat daftar peserta dan mengelola absensi.</p>
                </div>
              ) : !details ? (
                <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--muted)' }}>
                  <p>Memuat daftar peserta...</p>
                </div>
              ) : (
                <>
                  <div className="live-coach-detail-header">
                    <span className="eyebrow">DAFTAR PESERTA & ABSENSI</span>
                    <h2>{selected.title}</h2>
                    <div className="live-coach-detail-meta">
                      <span>
                        <CalendarDays size={14} />
                        {formatDate(selected.localDate, {
                          weekday: 'long',
                          day: 'numeric',
                          month: 'long',
                          year: 'numeric',
                        })}
                      </span>
                      <span>
                        <Clock size={14} />
                        {localDateTime(selected.startsAt, timezone)}
                      </span>
                    </div>
                  </div>

                  <div className="live-coach-detail-stats">
                    <div className="live-stat-chip">
                      <span className="chip-label">Total Peserta</span>
                      <strong className="chip-val">{details.participants.length}</strong>
                    </div>
                    <div className="live-stat-chip chip-success">
                      <span className="chip-label">Hadir</span>
                      <strong className="chip-val">{presentCount}</strong>
                    </div>
                    <div className="live-stat-chip chip-warning">
                      <span className="chip-label">Belum Dicatat</span>
                      <strong className="chip-val">{unrecordedCount}</strong>
                    </div>
                    {absentCount > 0 && (
                      <div className="live-stat-chip chip-muted">
                        <span className="chip-label">Tidak Hadir</span>
                        <strong className="chip-val">{absentCount}</strong>
                      </div>
                    )}
                  </div>

                  {canMark && details.participants.length > 0 && (
                    <div className="live-coach-quick-toolbar">
                      <button
                        type="button"
                        className="button button-outline"
                        disabled={busy || unrecordedCount === 0}
                        onClick={() => void markAllPresent()}
                      >
                        <UserCheck size={15} /> Tandai Semua Hadir ({unrecordedCount})
                      </button>
                      <span className="live-coach-period-info">
                        <ShieldCheck size={14} /> Absensi dibuka (s/d 24 jam setelah sesi selesai)
                      </span>
                    </div>
                  )}

                  {healthAlertCount > 0 && (
                    <div className="live-health-summary-banner">
                      <AlertTriangle size={18} />
                      <div>
                        <strong>Perhatian: {healthAlertCount} Peserta Memiliki Catatan Medis</strong>
                        <p>Harap perhatikan kondisi kesehatan khusus sebelum memulai latihan.</p>
                      </div>
                    </div>
                  )}

                  <div className="live-coach-participants-list">
                    {details.participants.length ? (
                      details.participants.map((person) => (
                        <div className="live-coach-person" key={person.bookingId}>
                          <div className="live-coach-person-info">
                            <div className="live-coach-avatar">
                              {person.fullName.trim().slice(0, 2).toUpperCase()}
                            </div>
                            <div className="live-coach-person-details">
                              <strong className="live-coach-person-name">{person.fullName}</strong>
                              {person.healthNote && (
                                <div className="live-health-note">
                                  <div className="live-health-note-header">
                                    <AlertTriangle size={13} />
                                    <span className="live-health-note-label">Catatan Kesehatan</span>
                                    <span className="live-health-note-source">
                                      {person.healthSource === 'snapshot'
                                        ? 'saat kelas berlangsung'
                                        : 'terkini'}
                                    </span>
                                  </div>
                                  <p className="live-health-note-text">{person.healthNote}</p>
                                </div>
                              )}
                            </div>
                          </div>

                          <div className="live-attendance-actions">
                            <span
                              className={`live-attendance-status ${
                                person.present === null
                                  ? 'pending'
                                  : person.present
                                    ? 'present'
                                    : 'absent'
                              }`}
                            >
                              {person.present === null
                                ? 'Belum dicatat'
                                : person.present
                                  ? 'Hadir'
                                  : 'Tidak hadir'}
                            </span>
                            <button
                              className={`button ${person.present === true ? 'button-primary' : 'button-outline'}`}
                              disabled={!canMark || busy}
                              onClick={() => void mark(person.customerId, true)}
                            >
                              Hadir
                            </button>
                            <button
                              className={`button ${person.present === false ? 'button-danger' : 'button-text'}`}
                              disabled={!canMark || busy}
                              onClick={() => void mark(person.customerId, false)}
                            >
                              Tidak hadir
                            </button>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div
                        className="panel"
                        style={{ background: '#f8fafc', textAlign: 'center', padding: '24px' }}
                      >
                        <p style={{ margin: 0, color: 'var(--muted)' }}>
                          Belum ada peserta terkonfirmasi untuk sesi ini.
                        </p>
                      </div>
                    )}
                  </div>

                  {!canMark && (
                    <p className="live-note" style={{ marginTop: '16px' }}>
                      <ShieldCheck size={15} /> Absensi dapat diubah sejak kelas dimulai sampai 24 jam
                      setelah selesai.
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
