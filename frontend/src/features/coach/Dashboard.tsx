import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  AlertTriangle,
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  Clock,
  MapPin,
  Search,
  ShieldCheck,
  Tent,
  UserCheck,
  UsersRound,
  X,
} from 'lucide-react'
import { api, type CoachParticipants, type CoachSession } from '../../shared/api'
import { formatDate, localDateTime } from '../../shared/format'
import { errorMessage } from '../../shared/errors'
import '../dashboard/Panels.css'

type CoachSummary = {
  assignedCount: number
  upcomingCount: number
  participantCount: number
  completedCount?: number
  attendedCount?: number
  sessions: CoachSession[]
}

type CoachCommunityEvent = {
  id: string
  slug: string
  title: string
  description: string
  locationName: string
  locationAddress: string
  startDate: string
  endDate: string
  status: string
  bannerUrl: string | null
  activityId: string
  activityTitle: string
  activityCategory: string
  startTime: string
  endTime: string
  capacity: number
  registeredCount: number
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
  const [coachEvents, setCoachEvents] = useState<CoachCommunityEvent[]>([])
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
    setSelected((prev) => (prev ? (rows.find((s) => s.id === prev.id) ?? null) : null))
  }, [date])

  useEffect(() => {
    if (section === 'attendance') void loadSessions().catch((error) => show(errorMessage(error)))
  }, [section, loadSessions, show])

  useEffect(() => {
    if (section === 'overview' || section === 'events') {
      void api<CoachCommunityEvent[]>('/coach/events')
        .then(setCoachEvents)
        .catch(() => setCoachEvents([]))
    }
    if (section === 'overview') {
      void api<CoachSummary>('/coach/sessions/summary')
        .then(setSummary)
        .catch((error) => show(errorMessage(error)))
    }
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

  function closeDetail() {
    setSelected(null)
    setDetails(null)
    void loadSessions()
  }

  async function mark(customerId: string, present: boolean) {
    if (!selected) return
    setBusy(true)
    try {
      await api(`/coach/sessions/${selected.id}/attendance/${customerId}`, {
        method: 'PUT',
        body: { present },
      })
      const updatedDetails = await api<CoachParticipants>(`/coach/sessions/${selected.id}/participants`)
      setDetails(updatedDetails)
      show('Absensi tersimpan.')
      void loadSessions()
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
      void loadSessions()
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
              <p>Sesi kelas yang telah tuntas.</p>
            </div>
            <div className="panel" style={{ borderLeft: '3px solid #2e5932' }}>
              <span className="eyebrow" style={{ color: '#2e5932' }}>TOTAL MURID HADIR</span>
              <h2 style={{ color: '#1b261b' }}>{summary?.attendedCount ?? 0}</h2>
              <p>Akumulasi presensi di atas matras.</p>
            </div>
          </div>
          <div className="live-section-head">
            <div>
              <h2>Sesi mengajar terdekat</h2>
              <p style={{ margin: '4px 0 0', color: 'var(--muted)', fontSize: '0.88rem' }}>
                Fokus jadwal kelas studio yang perlu Anda ampu segera.
              </p>
            </div>
            <button className="button button-outline" onClick={() => go('/dashboard/attendance')}>
              Buka Semua Jadwal & Absensi
            </button>
          </div>
          <div className="live-booking-list">
            {summary?.sessions.slice(0, 2).map((session) => (
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
                <button
                  className="button button-primary"
                  onClick={() => {
                    void open(session)
                    go('/dashboard/attendance')
                  }}
                >
                  Buka kelas & absensi
                </button>
              </article>
            ))}
            {summary && !summary.sessions.length && (
              <div className="panel">
                <p>Belum ada kelas mendatang yang ditugaskan.</p>
              </div>
            )}
          </div>

          <div className="live-section-head" style={{ marginTop: '28px' }}>
            <div>
              <h2>Sorotan event luar studio</h2>
              <p style={{ margin: '4px 0 0', color: 'var(--muted)', fontSize: '0.88rem' }}>
                Agenda gathering komunitas SORA terdekat yang Anda pandu.
              </p>
            </div>
            <button className="button button-outline" onClick={() => go('/dashboard/events')}>
              Lihat di Menu Event Komunitas
            </button>
          </div>
          {coachEvents.length > 0 ? (
            <article className="panel live-booking" style={{ borderLeft: '4px solid #17392e' }}>
              <div>
                <span className="eyebrow">
                  {formatDate(coachEvents[0].startDate, {
                    weekday: 'long',
                    day: 'numeric',
                    month: 'long',
                  })} · {coachEvents[0].startTime} - {coachEvents[0].endTime} WITA
                </span>
                <h3 style={{ margin: '4px 0' }}>{coachEvents[0].title}</h3>
                <p style={{ fontWeight: '500', color: '#17392e', margin: '4px 0' }}>
                  Sesi: {coachEvents[0].activityTitle} ({coachEvents[0].activityCategory})
                </p>
                <p style={{ fontSize: '0.88rem', color: 'var(--muted)', margin: 0 }}>
                  Lokasi: <strong>{coachEvents[0].locationName}</strong> · Terdaftar: {coachEvents[0].registeredCount}/{coachEvents[0].capacity} peserta
                </p>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${coachEvents[0].locationName} ${coachEvents[0].locationAddress}`)}`}
                  target="_blank"
                  rel="noreferrer"
                  className="button button-outline"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                >
                  <MapPin size={14} /> Peta
                </a>
                <button className="button button-primary" onClick={() => go('/dashboard/events')}>
                  Buka Menu Event
                </button>
              </div>
            </article>
          ) : (
            <div className="panel" style={{ textAlign: 'center', padding: '24px' }}>
              <Tent size={28} style={{ color: 'var(--muted)', margin: '0 auto 8px' }} />
              <p style={{ margin: 0, color: 'var(--muted)' }}>Belum ada penugasan event luar studio yang aktif.</p>
            </div>
          )}
        </>
      ) : section === 'events' ? (
        <div className="live-coach-events-view">
          <div className="live-section-head">
            <div>
              <h2>Event Komunitas Luar Studio</h2>
              <p style={{ margin: '4px 0 0', color: 'var(--muted)', fontSize: '0.88rem' }}>
                Kegiatan luar ruangan dan gathering komunitas SORA yang Anda pandu sebagai instruktur.
              </p>
            </div>
          </div>
          <div className="live-booking-list" style={{ marginTop: '16px' }}>
            {coachEvents.map((evt) => (
              <article className="panel live-booking" key={evt.activityId} style={{ padding: '22px', borderRadius: '12px' }}>
                <div>
                  <span className="eyebrow">
                    {formatDate(evt.startDate, {
                      weekday: 'long',
                      day: 'numeric',
                      month: 'long',
                    })} · {evt.startTime} - {evt.endTime} WITA
                  </span>
                  <h3 style={{ fontSize: '18px', margin: '6px 0' }}>{evt.title}</h3>
                  <p style={{ fontWeight: '600', color: '#17392e', margin: '4px 0' }}>
                    Sesi: {evt.activityTitle} ({evt.activityCategory})
                  </p>
                  <p style={{ fontSize: '0.88rem', color: 'var(--muted)', margin: '4px 0' }}>
                    Lokasi: <strong>{evt.locationName}</strong> · {evt.locationAddress || 'Lokasi terlampir'}
                  </p>
                  <p style={{ fontSize: '0.85rem', color: '#64748b', marginTop: '6px' }}>
                    Terdaftar: <strong>{evt.registeredCount}</strong> / {evt.capacity} peserta
                  </p>
                </div>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${evt.locationName} ${evt.locationAddress}`)}`}
                    target="_blank"
                    rel="noreferrer"
                    className="button button-outline"
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                  >
                    <MapPin size={14} /> Peta Lokasi
                  </a>
                  <a
                    href={`/events/${evt.slug}`}
                    target="_blank"
                    rel="noreferrer"
                    className="button button-primary"
                  >
                    Brosur Acara
                  </a>
                </div>
              </article>
            ))}
            {!coachEvents.length && (
              <div className="panel" style={{ textAlign: 'center', padding: '40px 20px', borderRadius: '12px' }}>
                <Tent size={32} style={{ color: 'var(--muted)', margin: '0 auto 10px' }} />
                <p style={{ margin: 0, color: 'var(--muted)', fontSize: '14px' }}>
                  Belum ada penugasan event luar studio yang aktif.
                </p>
              </div>
            )}
          </div>
        </div>
      ) : (
        <>
          {!selected ? (
            /* TINGKAT 1: KATALOG / JADWAL KELAS SAYA */
            <div className="live-coach-list-view">
              <div className="live-section-head">
                <div>
                  <h2>Kelas yang Anda ajar</h2>
                  <p style={{ margin: '4px 0 0', color: 'var(--muted)', fontSize: '0.88rem' }}>
                    Pilih sesi kelas untuk melihat daftar murid, catatan medis khusus, dan mencatat absensi.
                  </p>
                </div>
              </div>

              <div className="live-coach-filter-bar" style={{ marginTop: '16px' }}>
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

              <div className="live-coach-card-grid">
                {filteredSessions.length ? (
                  filteredSessions.map((session) => {
                    const isToday = session.localDate === todayStr
                    const isEnded = new Date(session.endsAt).getTime() < Date.now()
                    const isOngoing =
                      Date.now() >= new Date(session.startsAt).getTime() &&
                      Date.now() <= new Date(session.endsAt).getTime()

                    return (
                      <article className="live-coach-card" key={session.id}>
                        <div className="live-coach-card-top">
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

                        <div className="live-coach-card-body">
                          <span className="live-coach-card-tag">
                            {session.category} · {session.level}
                          </span>
                          <h3>{session.title}</h3>
                          <div className="live-coach-card-meta">
                            <span>
                              <Clock size={13} /> {localDateTime(session.startsAt, timezone)}
                            </span>
                            <span>
                              <UsersRound size={13} /> {session.participantCount} / {session.capacity} murid terdaftar
                            </span>
                            {session.participantCount > 0 && (
                              <span>
                                <UserCheck size={13} />{' '}
                                {session.attendedCount && session.attendedCount > 0
                                  ? `${session.attendedCount} / ${session.participantCount} hadir`
                                  : 'Belum ada presensi'}
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="live-coach-card-footer">
                          <button
                            type="button"
                            className="button button-primary full-width"
                            onClick={() => void open(session)}
                          >
                            Buka Kelas & Absensi <ChevronRight size={15} />
                          </button>
                        </div>
                      </article>
                    )
                  })
                ) : (
                  <div className="panel" style={{ gridColumn: '1 / -1', padding: '40px 20px', textAlign: 'center' }}>
                    <p style={{ margin: 0, color: 'var(--muted)' }}>
                      {date
                        ? 'Tidak ada kelas pada tanggal yang dipilih.'
                        : 'Tidak ada kelas dalam kategori ini.'}
                    </p>
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* TINGKAT 2: DETAIL SESI KELAS & DAFTAR MURID TERFOKUS */
            <div className="live-coach-detail-view">
              <div className="live-coach-back-bar">
                <button
                  type="button"
                  className="button button-outline"
                  onClick={closeDetail}
                >
                  <ArrowLeft size={16} /> Kembali ke Jadwal Kelas
                </button>
              </div>

              <div className="panel live-coach-detail-hero" style={{ marginBottom: '20px' }}>
                <div className="live-coach-detail-header">
                  <span className="eyebrow">SESI KELAS · {selected.category?.toUpperCase() || 'KELAS'}</span>
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
                    <span>
                      <UsersRound size={14} />
                      Kapasitas: {selected.capacity} murid
                    </span>
                  </div>
                </div>

                <div className="live-coach-detail-stats">
                  <div className="live-stat-chip">
                    <span className="chip-label">Total Murid</span>
                    <strong className="chip-val">
                      {details ? details.participants.length : selected.participantCount}
                    </strong>
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

                {canMark && details && details.participants.length > 0 && (
                  <div className="live-coach-quick-toolbar">
                    <button
                      type="button"
                      className="button button-primary"
                      disabled={busy || unrecordedCount === 0}
                      onClick={() => void markAllPresent()}
                    >
                      <UserCheck size={15} /> Tandai Semua Hadir ({unrecordedCount})
                    </button>
                    <span className="live-coach-period-info">
                      <ShieldCheck size={14} /> Presensi dibuka sejak kelas dimulai s/d 24 jam setelah selesai
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
              </div>

              <div className="panel">
                <h3 style={{ margin: '0 0 16px', fontSize: '1.1rem' }}>Daftar Murid Terdaftar</h3>
                {!details ? (
                  <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--muted)' }}>
                    <p>Memuat daftar peserta...</p>
                  </div>
                ) : details.participants.length ? (
                  <div className="live-coach-participants-list">
                    {details.participants.map((person) => (
                      <div className="live-coach-person" key={person.bookingId}>
                        <div className="live-coach-person-info">
                          <div className="live-coach-avatar">
                            {person.avatarUrl ? (
                              <img
                                src={person.avatarUrl}
                                alt={person.fullName}
                                style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }}
                              />
                            ) : (
                              person.fullName.trim().slice(0, 2).toUpperCase()
                            )}
                          </div>
                          <div className="live-coach-person-details">
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                              <strong className="live-coach-person-name">{person.fullName}</strong>
                              {person.lobbyCheckedIn && (
                                <span
                                  className="tag tag-green"
                                  style={{
                                    fontSize: '11px',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '4px',
                                    padding: '2px 8px',
                                  }}
                                >
                                  <CheckCircle2 size={12} /> Tiba di Lobi
                                </span>
                              )}
                            </div>
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
                    ))}
                  </div>
                ) : (
                  <div
                    className="panel"
                    style={{ background: '#f8fafc', textAlign: 'center', padding: '28px', border: '1px dashed var(--line)' }}
                  >
                    <p style={{ margin: 0, color: 'var(--muted)' }}>
                      Belum ada peserta terkonfirmasi untuk sesi ini.
                    </p>
                  </div>
                )}

                {!canMark && (
                  <p className="live-note" style={{ marginTop: '18px' }}>
                    <ShieldCheck size={15} /> Presensi dapat diubah sejak kelas dimulai sampai 24 jam setelah selesai.
                  </p>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </section>
  )
}
