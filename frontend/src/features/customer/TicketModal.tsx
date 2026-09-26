import { useEffect, useState } from 'react'
import { CheckCircle2, Printer, X } from 'lucide-react'
import QRCode from 'qrcode'
import type { Actor, Booking } from '../../shared/api'
import { formatDate, localTime } from '../../shared/format'
import './TicketModal.css'

export function TicketModal({
  booking,
  actor,
  timezone,
  onClose,
}: {
  booking: Booking
  actor: Actor
  timezone: string
  onClose: () => void
}) {
  const [qrUrl, setQrUrl] = useState<string>('')

  useEffect(() => {
    // Generate QR Code with booking verification payload
    const payload = JSON.stringify({
      app: 'sora-wellness',
      type: 'pass',
      bookingId: booking.id,
      customerId: actor.id,
      customerName: actor.fullName,
      classTitle: booking.title,
      startsAt: booking.startsAt,
    })

    void QRCode.toDataURL(payload, {
      width: 260,
      margin: 1,
      color: {
        dark: '#1b261b',
        light: '#ffffff',
      },
      errorCorrectionLevel: 'M',
    }).then(setQrUrl)
  }, [booking, actor])

  function handlePrint() {
    window.print()
  }

  return (
    <div className="sora-ticket-overlay" role="dialog" aria-modal="true" onClick={onClose}>
      <div className="sora-ticket-card" onClick={(e) => e.stopPropagation()}>
        <div className="sora-ticket-header">
          <div className="sora-ticket-brand">
            <h3>SORA Wellness</h3>
            <span>Digital Studio Pass</span>
          </div>
          <span className="sora-ticket-badge">
            <CheckCircle2 size={12} /> Terkonfirmasi
          </span>
        </div>

        <div className="sora-ticket-punchline">
          <div className="sora-ticket-divider" />
        </div>

        <div className="sora-ticket-body">
          <h2 className="sora-ticket-class-title">{booking.title}</h2>

          <div className="sora-ticket-grid">
            <div className="sora-ticket-field">
              <span>Hari & Tanggal</span>
              <strong>
                {formatDate(booking.localDate, {
                  weekday: 'short',
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                })}
              </strong>
            </div>

            <div className="sora-ticket-field">
              <span>Waktu Sesi</span>
              <strong>{localTime(booking.startsAt, timezone)} WITA</strong>
            </div>

            <div className="sora-ticket-field">
              <span>Nama Peserta</span>
              <strong>{actor.fullName}</strong>
            </div>

            <div className="sora-ticket-field">
              <span>ID Order</span>
              <strong>CLS-{booking.id.slice(0, 8).toUpperCase()}</strong>
            </div>
          </div>

          <div className="sora-ticket-qr-section">
            {qrUrl ? (
              <img
                src={qrUrl}
                alt={`QR Pass ${booking.id}`}
                className="sora-ticket-qr-img"
              />
            ) : (
              <div style={{ height: 180, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ fontSize: '0.8rem', color: '#777' }}>Menyiapkan QR Code...</span>
              </div>
            )}
            <div className="sora-ticket-code">{booking.id}</div>
            <p className="sora-ticket-instruction">
              Tunjukkan QR Code ini kepada resepsionis saat tiba di studio untuk check-in kehadiran instan.
            </p>
          </div>
        </div>

        <div className="sora-ticket-actions">
          <button className="button button-outline" type="button" onClick={handlePrint}>
            <Printer size={15} /> Cetak / PDF
          </button>
          <button className="button button-primary" type="button" onClick={onClose}>
            <X size={15} /> Tutup
          </button>
        </div>
      </div>
    </div>
  )
}
