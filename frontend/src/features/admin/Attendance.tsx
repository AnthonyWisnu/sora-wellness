import { useEffect, useState, type FormEvent } from 'react'
import { AlertCircle, CheckCircle2, QrCode } from 'lucide-react'
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
  const [scanInput, setScanInput] = useState('')
  const [scanResult, setScanResult] = useState<{
    success: boolean
    alreadyCheckedIn?: boolean
    customerName: string
    classTitle: string
    bookingId: string
    recordedAt: string
  } | null>(null)
  const [scanError, setScanError] = useState<string | null>(null)
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

  async function handleQuickCheckIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    let raw = scanInput.trim()
    if (!raw) return
    setScanError(null)
    setScanResult(null)

    // Handle JSON payload from QR
    if (raw.startsWith('{') && raw.endsWith('}')) {
      try {
        const parsed = JSON.parse(raw) as { bookingId?: string }
        if (parsed.bookingId) raw = parsed.bookingId
      } catch {
        // keep as is
      }
    }

    // Handle order ID prefix
    if (raw.toUpperCase().startsWith('CLS-')) {
      raw = raw.slice(4)
    }

    setBusy(true)
    try {
      const res = await api<{
        success: boolean
        alreadyCheckedIn: boolean
        customerName: string
        classTitle: string
        bookingId: string
        recordedAt: string
      }>('/admin/sessions/check-in', {
        method: 'POST',
        body: { bookingId: raw },
      })
      setScanResult(res)
      setScanInput('')
      show(
        res.alreadyCheckedIn
          ? `Perhatian: ${res.customerName} sudah tercatat hadir sebelumnya.`
          : `Sukses: ${res.customerName} berhasil check-in kelas ${res.classTitle}!`,
      )
      if (sessionId) {
        await load(sessionId)
      }
    } catch (err) {
      setScanError(errorMessage(err))
      show(errorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="live-admin-attendance">
      <div className="panel live-form" style={{ gridColumn: '1 / -1', borderLeft: '4px solid #2e5932' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
          <QrCode size={20} style={{ color: '#2e5932' }} />
          <h2 style={{ margin: 0 }}>Fast Check-in Resepsionis (Scan QR / ID Booking)</h2>
        </div>
        <p style={{ margin: '0 0 12px', fontSize: '0.85rem', color: '#666' }}>
          Arahkan barcode scanner, atau paste teks dari QR Code tiket peserta (atau masukkan ID Booking / Order ID). Kehadiran akan tercatat otomatis seketika.
        </p>
        <form onSubmit={handleQuickCheckIn} style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
          <input
            style={{ flex: '1', minWidth: '280px', padding: '10px 14px', borderRadius: '8px', border: '1px solid #ccc', fontSize: '0.9rem' }}
            placeholder="Scan atau paste kode QR / ID Booking / Order ID (misal: b210d394...)"
            value={scanInput}
            onChange={(e) => setScanInput(e.target.value)}
          />
          <button
            className="button button-primary"
            type="submit"
            disabled={busy || !scanInput.trim()}
            style={{ whiteSpace: 'nowrap' }}
          >
            Check-in Hadir
          </button>
        </form>

        {scanResult && (
          <div style={{ marginTop: '12px', padding: '12px 14px', borderRadius: '8px', background: scanResult.alreadyCheckedIn ? '#fffbeb' : '#f0fdf4', border: scanResult.alreadyCheckedIn ? '1px solid #fde68a' : '1px solid #bbf7d0', display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
            {scanResult.alreadyCheckedIn ? (
              <AlertCircle size={20} style={{ color: '#d97706', marginTop: '2px', flexShrink: 0 }} />
            ) : (
              <CheckCircle2 size={20} style={{ color: '#16a34a', marginTop: '2px', flexShrink: 0 }} />
            )}
            <div>
              <strong style={{ display: 'block', color: scanResult.alreadyCheckedIn ? '#92400e' : '#166534', fontSize: '0.95rem' }}>
                {scanResult.alreadyCheckedIn ? 'Sudah Tercatat Hadir Sebelumnya' : 'Check-in Berhasil! Kehadiran Tercatat'}
              </strong>
              <div style={{ fontSize: '0.85rem', color: '#374151', marginTop: '4px', lineHeight: 1.5 }}>
                <span>Peserta: <strong>{scanResult.customerName}</strong></span> · <span>Kelas: <strong>{scanResult.classTitle}</strong></span>
                <br />
                <small style={{ color: '#6b7280' }}>ID Booking: {scanResult.bookingId}</small>
              </div>
            </div>
          </div>
        )}

        {scanError && (
          <div style={{ marginTop: '12px', padding: '10px 14px', borderRadius: '8px', background: '#fef2f2', border: '1px solid #fecaca', display: 'flex', alignItems: 'center', gap: '8px', color: '#991b1b', fontSize: '0.85rem' }}>
            <AlertCircle size={18} style={{ color: '#dc2626', flexShrink: 0 }} />
            <span>{scanError}</span>
          </div>
        )}
      </div>

      <div className="panel live-form">
        <h2>Koreksi absensi manual</h2>
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
