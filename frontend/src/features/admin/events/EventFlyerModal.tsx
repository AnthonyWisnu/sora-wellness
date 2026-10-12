import { useEffect, useState } from 'react'
import { Copy, MapPin, Printer, X } from 'lucide-react'
import QRCode from 'qrcode'
import { formatDate } from '../../../shared/format'
import type { CommunityEvent } from './event-types'

type Props = {
  event: CommunityEvent | null
  onClose: () => void
  show: (text: string) => void
}

export function EventFlyerModal({ event, onClose, show }: Props) {
  const [qrUrl, setQrUrl] = useState<string>('')

  const shareUrl = event
    ? `${window.location.origin}/events/${event.slug}`
    : ''

  useEffect(() => {
    if (!shareUrl) return
    void QRCode.toDataURL(shareUrl, {
      width: 280,
      margin: 1,
      color: { dark: '#17392e', light: '#ffffff' },
      errorCorrectionLevel: 'H',
    }).then(setQrUrl)
  }, [shareUrl])

  if (!event) return null

  function copyLink() {
    void navigator.clipboard.writeText(shareUrl)
    show('Tautan pendaftaran event berhasil disalin ke clipboard.')
  }

  function handlePrint() {
    window.print()
  }

  return (
    <div className="sora-ticket-overlay" role="dialog" aria-modal="true" onClick={onClose}>
      <div
        className="panel sora-ticket-card"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '520px', padding: '24px', background: '#fafbfa', border: '2px solid #17392e' }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div>
            <span className="eyebrow" style={{ color: '#17392e', fontWeight: 700 }}>
              BROSUR PROMOSI MEDIA SOSIAL
            </span>
            <h3 style={{ margin: 0, fontSize: '1.2rem', color: '#17392e' }}>
              {event.title}
            </h3>
          </div>
          <button type="button" className="button button-text" onClick={onClose} style={{ padding: '6px' }}>
            <X size={18} />
          </button>
        </div>

        <div
          id="event-flyer-content"
          style={{
            background: '#ffffff',
            borderRadius: '12px',
            padding: '20px',
            border: '1px solid #e2e8f0',
            textAlign: 'center',
            boxShadow: '0 4px 12px rgba(0,0,0,0.04)',
          }}
        >
          <div style={{ fontSize: '12px', letterSpacing: '1.5px', textTransform: 'uppercase', color: '#64748b', fontWeight: 700 }}>
            SORA WELLNESS COMMUNITY
          </div>
          <h2 style={{ margin: '8px 0', fontSize: '1.45rem', color: '#17392e', fontFamily: 'serif' }}>
            {event.title}
          </h2>
          <p style={{ margin: '0 0 14px', fontSize: '0.88rem', color: '#475569' }}>
            {event.description || 'Mari bergabung bersama komunitas yoga dan pilates di ruang terbuka.'}
          </p>

          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 14px',
              background: '#f1f5f2',
              borderRadius: '20px',
              fontSize: '0.84rem',
              color: '#17392e',
              fontWeight: 600,
              marginBottom: '16px',
            }}
          >
            <MapPin size={14} /> {event.locationName} · {formatDate(event.startDate, { day: 'numeric', month: 'short', year: 'numeric' })}
          </div>

          <div style={{ margin: '14px 0', display: 'flex', justifyContent: 'center' }}>
            {qrUrl ? (
              <div style={{ padding: '10px', background: '#ffffff', borderRadius: '10px', border: '1px solid #cbd5e1' }}>
                <img src={qrUrl} alt={`QR Link ${event.title}`} style={{ width: '180px', height: '180px', display: 'block' }} />
                <span style={{ fontSize: '11px', color: '#64748b', display: 'block', marginTop: '4px' }}>
                  Scan untuk Mendaftar Langsung
                </span>
              </div>
            ) : (
              <p>Menyiapkan QR Code...</p>
            )}
          </div>

          <div style={{ background: '#f8fafc', padding: '10px 14px', borderRadius: '8px', textAlign: 'left', marginTop: '12px' }}>
            <span style={{ fontSize: '11.5px', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '4px' }}>
              Rangkaian Sesi Kegiatan:
            </span>
            <ul style={{ margin: 0, paddingLeft: '18px', fontSize: '12px', color: '#475569', lineHeight: 1.6 }}>
              {event.activities?.length ? (
                event.activities.map((act) => (
                  <li key={act.id}>
                    <strong>{act.title}</strong> ({act.startTime} - {act.endTime}) · Kuota: {act.capacity} orang
                  </li>
                ))
              ) : (
                <li>Sesi kelas terbuka dan pengenalan studio</li>
              )}
            </ul>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
          <button type="button" className="button button-outline" onClick={copyLink} style={{ flex: 1 }}>
            <Copy size={15} /> Salin Link Pendaftaran
          </button>
          <button type="button" className="button button-primary" onClick={handlePrint} style={{ flex: 1 }}>
            <Printer size={15} /> Cetak / Simpan PDF
          </button>
        </div>
      </div>
    </div>
  )
}
