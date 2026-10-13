import { useState, type FormEvent } from 'react'
import { X } from 'lucide-react'
import { api } from '../../../shared/api'
import { errorMessage } from '../../../shared/errors'
import type { ActivityInput, CommunityEvent } from './event-types'
import { EventActivitiesInput } from './EventActivitiesInput'

type Props = {
  event: CommunityEvent | null
  onClose: () => void
  onSaved: () => void
  show: (text: string) => void
}

export function EventEditorDialog({ event, onClose, onSaved, show }: Props) {
  const [title, setTitle] = useState(event?.title ?? '')
  const [description, setDescription] = useState(event?.description ?? '')
  const [locationName, setLocationName] = useState(event?.locationName ?? '')
  const [locationAddress, setLocationAddress] = useState(event?.locationAddress ?? '')
  const [locationMapsUrl, setLocationMapsUrl] = useState(event?.locationMapsUrl ?? '')
  const [startDate, setStartDate] = useState(event?.startDate ?? '')
  const [endDate, setEndDate] = useState(event?.endDate ?? '')
  const [status, setStatus] = useState<'draft' | 'published' | 'completed' | 'cancelled'>(
    event?.status ?? 'published',
  )
  const [activities, setActivities] = useState<ActivityInput[]>(
    event?.activities?.length
      ? event.activities.map((a) => ({
          title: a.title,
          category: a.category,
          coachName: a.coachName,
          startTime: a.startTime,
          endTime: a.endTime,
          capacity: a.capacity,
          priceIdr: a.priceIdr,
        }))
      : [
          {
            title: 'Sesi Yoga Sunrise',
            category: 'Yoga',
            coachName: 'Nadia Putri',
            startTime: '06:30',
            endTime: '08:00',
            capacity: 30,
            priceIdr: 0,
          },
        ],
  )
  const [busy, setBusy] = useState(false)

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setBusy(true)
    const payload = {
      title: title.trim(),
      description: description.trim(),
      locationName: locationName.trim(),
      locationAddress: locationAddress.trim(),
      locationMapsUrl: locationMapsUrl.trim(),
      startDate,
      endDate: endDate || startDate,
      status,
      activities: activities.map((a) => ({
        title: a.title.trim(),
        category: a.category.trim(),
        coachName: a.coachName.trim(),
        startTime: a.startTime.trim(),
        endTime: a.endTime.trim(),
        capacity: Number(a.capacity),
        priceIdr: Number(a.priceIdr || 0),
      })),
    }

    try {
      if (event) {
        await api(`/admin/events/${event.id}`, { method: 'PUT', body: payload })
        show('Event komunitas berhasil diperbarui.')
      } else {
        await api('/admin/events', { method: 'POST', body: payload })
        show('Event komunitas berhasil dibuat.')
      }
      onSaved()
      onClose()
    } catch (err) {
      show(errorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div
      className="sora-ticket-overlay"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
      style={{
        alignItems: 'flex-start',
        padding: '32px 16px',
        overflowY: 'auto',
      }}
    >
      <div
        className="panel sora-ticket-card"
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: '680px',
          width: '100%',
          margin: '0 auto',
          padding: '24px',
          maxHeight: 'calc(100vh - 64px)',
          overflowY: 'auto',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div>
            <span className="eyebrow">{event ? 'UBAH EVENT' : 'BUAT EVENT BARU'}</span>
            <h3 style={{ margin: 0 }}>{event ? 'Edit Event Komunitas' : 'Penyelenggaraan Event Luar Studio'}</h3>
          </div>
          <button type="button" className="button button-text" onClick={onClose} style={{ padding: '6px' }}>
            <X size={18} />
          </button>
        </div>

        <form onSubmit={(e) => void handleSubmit(e)} className="live-form">
          <label>
            Nama Event Acara
            <input required minLength={3} maxLength={150} value={title} onChange={(e) => setTitle(e.target.value)} />
          </label>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <label>
              Nama Tempat / Lokasi
              <input required placeholder="Contoh: Pantai Sanur" value={locationName} onChange={(e) => setLocationName(e.target.value)} />
            </label>
            <label>
              Alamat Lengkap
              <input placeholder="Contoh: Jl. Cemara, Sanur" value={locationAddress} onChange={(e) => setLocationAddress(e.target.value)} />
            </label>
          </div>

          <label>
            Tautan Google Maps (URL Pin Lokasi Presisi)
            <input
              type="url"
              placeholder="Contoh: https://maps.app.goo.gl/... atau https://maps.google.com/?q=..."
              value={locationMapsUrl}
              onChange={(e) => setLocationMapsUrl(e.target.value)}
            />
          </label>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <label>
              Tanggal Mulai
              <input required type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </label>
            <label>
              Tanggal Selesai
              <input required type="date" value={endDate || startDate} onChange={(e) => setEndDate(e.target.value)} />
            </label>
          </div>

          <label>
            Status Event
            <select value={status} onChange={(e) => setStatus(e.target.value as 'draft' | 'published' | 'completed' | 'cancelled')}>
              <option value="published">Dipublikasikan (Buka Pendaftaran)</option>
              <option value="draft">Draf (Internal)</option>
              <option value="completed">Selesai Terlaksana</option>
            </select>
          </label>

          <label>
            Deskripsi / Pesan Singkat Promosi
            <textarea rows={2} value={description} onChange={(e) => setDescription(e.target.value)} />
          </label>

          <EventActivitiesInput activities={activities} onChange={setActivities} show={show} />

          <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
            <button type="button" className="button button-outline" onClick={onClose} disabled={busy} style={{ flex: 1 }}>Batal</button>
            <button type="submit" className="button button-primary" disabled={busy} style={{ flex: 1 }}>Simpan Event</button>
          </div>
        </form>
      </div>
    </div>
  )
}
