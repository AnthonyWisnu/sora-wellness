import { useEffect, useState, type FormEvent } from 'react'
import {
  api,
  type AdminParticipant,
  type AdminSession,
  type AttendanceCorrection,
} from '../../shared/api'
import { localDateTime } from '../../shared/format'
import { errorMessage } from '../../shared/errors'
import '../dashboard/Panels.css'

export function AdminAttendancePanel({
  timezone,
  show,
}: {
  timezone: string
  show: (text: string) => void
}) {
  const [date, setDate] = useState(() =>
    new Intl.DateTimeFormat('en-CA', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(new Date()),
  )
  const [sessions, setSessions] = useState<AdminSession[]>([])
  const [sessionId, setSessionId] = useState('')
  const [participants, setParticipants] = useState<AdminParticipant[]>([])
  const [corrections, setCorrections] = useState<AttendanceCorrection[]>([])
  const [target, setTarget] = useState<{
    customerId: string
    fullName: string
    present: boolean
  } | null>(null)
  const [reason, setReason] = useState('')
  const [busy, setBusy] = useState(false)
  const selected = sessions.find((session) => session.id === sessionId)
  useEffect(() => {
    let active = true
    void api<AdminSession[]>(`/admin/sessions?date=${encodeURIComponent(date)}`)
      .then((rows) => {
        if (active) setSessions(rows)
      })
      .catch((error) => {
        if (active) show(errorMessage(error))
      })
    return () => {
      active = false
    }
  }, [date, show])

  async function load(id: string) {
    const [people, audit] = await Promise.all([
      api<AdminParticipant[]>(`/admin/sessions/${id}/participants`),
      api<AttendanceCorrection[]>(`/admin/sessions/${id}/attendance-corrections`),
    ])
    setParticipants(people)
    setCorrections(audit)
  }
  async function choose(id: string) {
    setSessionId(id)
    setTarget(null)
    setParticipants([])
    setCorrections([])
    if (!id) return
    try {
      await load(id)
    } catch (error) {
      show(errorMessage(error))
    }
  }
  async function correct(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!target || !sessionId) return
    setBusy(true)
    try {
      await api(`/admin/sessions/${sessionId}/attendance/${target.customerId}`, {
        method: 'PUT',
        body: { present: target.present, reason: reason.trim() },
      })
      await load(sessionId)
      setTarget(null)
      setReason('')
      show('Koreksi absensi tersimpan bersama alasan dan nama admin.')
    } catch (error) {
      show(errorMessage(error))
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="live-admin-attendance">
      <div className="panel live-form">
        <h2>Koreksi absensi</h2>
        <p>
          Pilih sesi dan peserta. Koreksi dicatat dengan nama admin, waktu, keadaan sebelumnya, dan
          alasan. Saldo serta jatah tidak berubah.
        </p>
        <label>
          Tanggal kelas
          <input
            type="date"
            value={date}
            onChange={(event) => {
              setDate(event.target.value)
              setSessionId('')
              setTarget(null)
              setParticipants([])
              setCorrections([])
            }}
          />
        </label>
        <label>
          Sesi kelas
          <select value={sessionId} onChange={(event) => void choose(event.target.value)}>
            <option value="">Pilih sesi</option>
            {sessions
              .filter((session) => session.status !== 'cancelled')
              .map((session) => (
                <option value={session.id} key={session.id}>
                  {session.title} · {localDateTime(session.starts_at, timezone)}
                </option>
              ))}
          </select>
        </label>
      </div>
      {selected && (
        <div className="panel">
          <span className="eyebrow">PESERTA TERKONFIRMASI</span>
          <h3>{selected.title}</h3>
          {participants.length ? (
            participants.map((person) => (
              <div className="live-admin-person" key={person.bookingId}>
                <div>
                  <strong>{person.fullName}</strong>
                  <small>
                    {person.present === null
                      ? 'Belum dicatat'
                      : person.present
                        ? 'Hadir'
                        : 'Tidak hadir'}
                  </small>
                </div>
                <button
                  className="button button-outline"
                  disabled={new Date(selected.starts_at).getTime() > Date.now()}
                  onClick={() => {
                    setTarget({
                      customerId: person.customerId,
                      fullName: person.fullName,
                      present: person.present ?? true,
                    })
                    setReason('')
                  }}
                >
                  Koreksi
                </button>
              </div>
            ))
          ) : (
            <p>Belum ada peserta terkonfirmasi.</p>
          )}
        </div>
      )}
      {target && (
        <form className="panel live-form" onSubmit={(event) => void correct(event)}>
          <h3>Koreksi: {target.fullName}</h3>
          <div className="live-admin-attendance-choices">
            <label>
              <input
                type="radio"
                checked={target.present}
                onChange={() => setTarget({ ...target, present: true })}
              />{' '}
              Hadir
            </label>
            <label>
              <input
                type="radio"
                checked={!target.present}
                onChange={() => setTarget({ ...target, present: false })}
              />{' '}
              Tidak hadir
            </label>
          </div>
          <label>
            Alasan koreksi
            <input
              value={reason}
              minLength={5}
              maxLength={500}
              required
              onChange={(event) => setReason(event.target.value)}
              placeholder="Contoh: daftar hadir kertas diverifikasi"
            />
          </label>
          <button className="button button-primary" disabled={busy}>
            Simpan koreksi
          </button>
        </form>
      )}
      {selected && corrections.length > 0 && (
        <div className="panel">
          <h3>Riwayat koreksi</h3>
          {corrections.map((row) => (
            <div className="live-admin-audit" key={row.id}>
              <strong>
                {row.customerName}:{' '}
                {row.previousPresent === null
                  ? 'Belum dicatat'
                  : row.previousPresent
                    ? 'Hadir'
                    : 'Tidak hadir'}{' '}
                → {row.newPresent ? 'Hadir' : 'Tidak hadir'}
              </strong>
              <small>
                {row.adminName} · {localDateTime(row.correctedAt, timezone)}
              </small>
              <p>{row.reason}</p>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
