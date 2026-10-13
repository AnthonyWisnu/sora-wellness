import { useEffect, useState, type FormEvent } from 'react'
import { CheckCircle2, Clock, MapPin, Printer, User, Users } from 'lucide-react'
import QRCode from 'qrcode'
import { api } from '../../shared/api'
import { formatDate } from '../../shared/format'
import { errorMessage } from '../../shared/errors'
import type { CommunityEvent } from '../admin/events/event-types'

type RegisteredTicket = {
  id: string
  ticketCode: string
  guestName: string
  guestEmail: string
  activityTitle: string
  status: string
}

export function PublicEventPage({
  slug,
  go,
  show,
}: {
  slug: string
  go: (path: string) => void
  show: (text: string) => void
}) {
  const [event, setEvent] = useState<CommunityEvent | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedActivityId, setSelectedActivityId] = useState('')
  const [guestName, setGuestName] = useState('')
  const [guestEmail, setGuestEmail] = useState('')
  const [guestPhone, setGuestPhone] = useState('')
  const [busy, setBusy] = useState(false)
  const [ticket, setTicket] = useState<RegisteredTicket | null>(null)
  const [qrUrl, setQrUrl] = useState('')

  useEffect(() => {
    setLoading(true)
    api<CommunityEvent>(`/public/events/${slug}`)
      .then((res) => {
        setEvent(res)
        if (res.activities?.length) setSelectedActivityId(res.activities[0].id)
      })
      .catch((err) => show(errorMessage(err)))
      .finally(() => setLoading(false))
  }, [slug, show])

  useEffect(() => {
    if (!ticket) return
    void QRCode.toDataURL(ticket.ticketCode, {
      width: 240,
      margin: 1,
      color: { dark: '#17392e', light: '#ffffff' },
    }).then(setQrUrl)
  }, [ticket])

  async function handleRegister(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!selectedActivityId) {
      show('Pilih sesi kegiatan yang ingin Anda ikuti.')
      return
    }
    setBusy(true)
    try {
      const res = await api<RegisteredTicket>(`/public/events/${slug}/register`, {
        method: 'POST',
        body: {
          activityId: selectedActivityId,
          guestName: guestName.trim(),
          guestEmail: guestEmail.trim(),
          guestPhone: guestPhone.trim() || undefined,
        },
      })
      setTicket(res)
      show('Registrasi event berhasil! Tiket pass Anda siap.')
    } catch (err) {
      show(errorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  if (loading) return <div style={{ padding: '80px 20px', textAlign: 'center' }}>Memuat informasi event...</div>
  if (!event) {
    return (
      <div style={{ padding: '80px 20px', textAlign: 'center' }}>
        <p>Event tidak ditemukan.</p>
        <button className="button button-outline" onClick={() => go('/')}>Kembali ke Beranda</button>
      </div>
    )
  }

  if (ticket) {
    return (
      <main style={{ maxWidth: '480px', margin: '40px auto', padding: '0 16px' }}>
        <div className="panel" style={{ padding: '24px', textAlign: 'center', border: '2px solid #17392e' }}>
          <span className="tag tag-green" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', marginBottom: '8px' }}>
            <CheckCircle2 size={13} /> Registrasi Terkonfirmasi
          </span>
          <h2 style={{ margin: '6px 0', fontSize: '1.35rem' }}>E-Ticket Pass Komunitas</h2>
          <p style={{ margin: '0 0 16px', fontSize: '0.86rem', color: '#64748b' }}>{event.title}</p>
          <div style={{ background: '#f8fafc', padding: '14px', borderRadius: '8px', textAlign: 'left', marginBottom: '16px', fontSize: '13px' }}>
            <div>Nama: <strong>{ticket.guestName}</strong></div>
            <div>Sesi: <strong>{ticket.activityTitle}</strong></div>
            <div>Lokasi: <strong>{event.locationName}</strong></div>
          </div>
          {qrUrl && <img src={qrUrl} alt={ticket.ticketCode} style={{ width: '180px', height: '180px', margin: '0 auto 8px' }} />}
          <div style={{ fontWeight: 700, letterSpacing: '1px', fontSize: '1.1rem', color: '#17392e' }}>{ticket.ticketCode}</div>
          <small style={{ color: '#64748b', display: 'block', margin: '8px 0 16px' }}>Tunjukkan tiket ini kepada panitia saat tiba di lokasi acara.</small>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button className="button button-outline" onClick={() => window.print()} style={{ flex: 1 }}><Printer size={15} /> Cetak</button>
            <button className="button button-primary" onClick={() => go('/')} style={{ flex: 1 }}>Selesai</button>
          </div>
        </div>
      </main>
    )
  }

  return (
    <main style={{ maxWidth: '640px', margin: '40px auto', padding: '0 16px' }}>
      <div className="panel" style={{ padding: '28px' }}>
        <span className="eyebrow">EVENT LUAR STUDIO & KOMUNITAS</span>
        <h1 style={{ margin: '8px 0', fontSize: '1.75rem', color: '#17392e' }}>{event.title}</h1>
        <p style={{ color: '#475569', fontSize: '0.94rem', lineHeight: 1.6, marginBottom: '16px' }}>{event.description}</p>
        <div style={{ display: 'flex', gap: '16px', padding: '12px', background: '#f1f5f2', borderRadius: '8px', fontSize: '0.88rem', color: '#17392e', marginBottom: '20px', flexWrap: 'wrap', alignItems: 'center' }}>
          <a
            href={event.locationMapsUrl || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${event.locationName} ${event.locationAddress || ''}`)}`}
            target="_blank"
            rel="noopener noreferrer"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: '#17392e', fontWeight: 600, textDecoration: 'none' }}
            title="Buka titik lokasi di Google Maps"
          >
            <MapPin size={15} /> {event.locationName}
            <span style={{ fontSize: '11px', textDecoration: 'underline', color: '#2d6a4f' }}>(Buka Peta)</span>
          </a>
          <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Clock size={15} /> {formatDate(event.startDate, { day: 'numeric', month: 'long', year: 'numeric' })}</span>
        </div>
        <form onSubmit={(e) => void handleRegister(e)} className="live-form">
          <span className="eyebrow" style={{ display: 'block', marginBottom: '8px' }}>PILIH SESI KEGIATAN KELAS</span>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '16px' }}>
            {event.activities?.map((act) => {
              const isSelected = selectedActivityId === act.id
              return (
                <div
                  key={act.id}
                  onClick={() => setSelectedActivityId(act.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '12px',
                    padding: '14px 16px',
                    border: isSelected ? '2px solid #17392e' : '1px solid #cbd5e1',
                    borderRadius: '10px',
                    cursor: 'pointer',
                    background: isSelected ? '#f0fdf4' : '#ffffff',
                    transition: 'all 0.15s ease',
                    boxShadow: isSelected ? '0 2px 6px rgba(23, 57, 46, 0.08)' : 'none',
                  }}
                >
                  <input
                    type="radio"
                    name="act"
                    checked={isSelected}
                    onChange={() => setSelectedActivityId(act.id)}
                    style={{
                      width: '18px',
                      minWidth: '18px',
                      height: '18px',
                      minHeight: '18px',
                      marginTop: '3px',
                      accentColor: '#17392e',
                      cursor: 'pointer',
                    }}
                  />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '4px' }}>
                      <strong style={{ fontSize: '15px', color: '#17392e' }}>{act.title}</strong>
                      {act.category && (
                        <span style={{ fontSize: '11px', padding: '2px 8px', background: '#e2ece7', color: '#17392e', borderRadius: '4px', fontWeight: 600 }}>
                          {act.category}
                        </span>
                      )}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap', fontSize: '12.5px', color: '#475569' }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                        <User size={13} style={{ color: '#64748b' }} /> {act.coachName}
                      </span>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                        <Clock size={13} style={{ color: '#64748b' }} /> {act.startTime} - {act.endTime} WITA
                      </span>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                        <Users size={13} style={{ color: '#64748b' }} /> Sisa {act.seatsLeft ?? act.capacity} kursi
                      </span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
          <label>Nama Lengkap<input required minLength={2} value={guestName} onChange={(e) => setGuestName(e.target.value)} /></label>
          <label>Email Aktif<input required type="email" value={guestEmail} onChange={(e) => setGuestEmail(e.target.value)} /></label>
          <label>Nomor WhatsApp (Opsional)<input value={guestPhone} onChange={(e) => setGuestPhone(e.target.value)} /></label>
          <button className="button button-primary" disabled={busy} style={{ width: '100%', marginTop: '12px' }}>Daftar & Dapatkan E-Ticket Gratis</button>
        </form>
      </div>
    </main>
  )
}
