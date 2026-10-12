import { useCallback, useEffect, useState } from 'react'
import { Check, CheckCircle2, Search, X } from 'lucide-react'
import { api } from '../../../shared/api'
import { localDateTime } from '../../../shared/format'
import { errorMessage } from '../../../shared/errors'
import type { CommunityEvent, EventRegistration } from './event-types'

type Props = {
  event: CommunityEvent | null
  timezone: string
  onClose: () => void
  show: (text: string) => void
}

export function EventRosterDialog({ event, timezone, onClose, show }: Props) {
  const [items, setItems] = useState<EventRegistration[]>([])
  const [search, setSearch] = useState('')
  const [checkInCode, setCheckInCode] = useState('')
  const [busy, setBusy] = useState(false)

  const load = useCallback(() => {
    if (!event) return
    setBusy(true)
    void api<EventRegistration[]>(`/admin/events/${event.id}/registrations`)
      .then(setItems)
      .catch((err) => show(errorMessage(err)))
      .finally(() => setBusy(false))
  }, [event, show])

  useEffect(() => {
    load()
  }, [load])

  if (!event) return null

  async function handleCheckIn(code: string) {
    if (!code.trim()) return
    setBusy(true)
    try {
      await api(`/admin/events/registrations/${encodeURIComponent(code.trim())}/check-in`, {
        method: 'POST',
      })
      show('Peserta berhasil diverifikasi hadir di lokasi event.')
      setCheckInCode('')
      load()
    } catch (err) {
      show(errorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  const filtered = items.filter(
    (item) =>
      item.guestName.toLowerCase().includes(search.toLowerCase()) ||
      item.guestEmail.toLowerCase().includes(search.toLowerCase()) ||
      item.ticketCode.toLowerCase().includes(search.toLowerCase()),
  )

  return (
    <div className="sora-ticket-overlay" role="dialog" aria-modal="true" onClick={onClose}>
      <div className="panel sora-ticket-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '640px', padding: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div>
            <span className="eyebrow">ROSTER PESERTA EVENT</span>
            <h3 style={{ margin: 0 }}>{event.title}</h3>
          </div>
          <button type="button" className="button button-text" onClick={onClose} style={{ padding: '6px' }}>
            <X size={18} />
          </button>
        </div>

        <div style={{ display: 'flex', gap: '8px', marginBottom: '14px' }}>
          <input
            placeholder="Ketik atau scan kode tiket untuk check-in instan..."
            value={checkInCode}
            onChange={(e) => setCheckInCode(e.target.value)}
            style={{ flex: 1, padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }}
          />
          <button
            type="button"
            className="button button-primary"
            onClick={() => void handleCheckIn(checkInCode)}
            disabled={busy || !checkInCode.trim()}
          >
            <CheckCircle2 size={15} /> Check-In
          </button>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flex: 1, maxWidth: '280px' }}>
            <Search size={14} style={{ color: '#94a3b8' }} />
            <input
              placeholder="Cari nama, email, tiket..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ padding: '4px 8px', borderRadius: '4px', border: '1px solid #e2e8f0', fontSize: '12px', width: '100%' }}
            />
          </div>
          <span style={{ fontSize: '12px', color: '#64748b' }}>
            Total Terdaftar: {items.length} orang ({items.filter((i) => i.status === 'attended').length} Hadir)
          </span>
        </div>

        <div style={{ maxHeight: '360px', overflowY: 'auto', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
          <table className="admin-account-table" style={{ margin: 0 }}>
            <thead>
              <tr>
                <th>Peserta</th>
                <th>Sesi Kegiatan</th>
                <th>Kode Tiket</th>
                <th>Status</th>
                <th>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((item) => (
                <tr key={item.id}>
                  <td>
                    <strong>{item.guestName}</strong>
                    <small>{item.guestEmail} {item.guestPhone ? `· ${item.guestPhone}` : ''}</small>
                  </td>
                  <td>
                    <small>
                      {item.activityTitle} ({item.startTime})
                    </small>
                  </td>
                  <td>
                    <code>{item.ticketCode}</code>
                  </td>
                  <td>
                    <span className={`tag ${item.status === 'attended' ? 'tag-green' : 'tag-gold'}`}>
                      {item.status === 'attended' ? 'Hadir' : 'Terdaftar'}
                    </span>
                    <small style={{ display: 'block', color: '#94a3b8', fontSize: '11px', marginTop: '2px' }}>
                      {localDateTime(item.createdAt, timezone)}
                    </small>
                  </td>
                  <td>
                    {item.status !== 'attended' ? (
                      <button
                        type="button"
                        className="button button-primary"
                        style={{ padding: '3px 8px', fontSize: '11px' }}
                        onClick={() => void handleCheckIn(item.ticketCode)}
                        disabled={busy}
                      >
                        <Check size={12} /> Tandai Hadir
                      </button>
                    ) : (
                      <small style={{ color: '#16a34a', fontWeight: 600 }}>Tercatat</small>
                    )}
                  </td>
                </tr>
              ))}
              {!filtered.length && (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', padding: '24px', color: '#64748b' }}>
                    Belum ada peserta terdaftar.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
