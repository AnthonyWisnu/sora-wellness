import { useCallback, useEffect, useState } from 'react'
import { CalendarDays, Edit3, MapPin, Plus, QrCode, Sparkles, Users } from 'lucide-react'
import { api } from '../../../shared/api'
import { formatDate } from '../../../shared/format'
import { errorMessage } from '../../../shared/errors'
import { EventEditorDialog } from './EventEditorDialog'
import { EventFlyerModal } from './EventFlyerModal'
import { EventRosterDialog } from './EventRosterDialog'
import type { CommunityEvent } from './event-types'

type Props = {
  timezone: string
  show: (message: string) => void
}

export function EventsManagement({ timezone, show }: Props) {
  const [events, setEvents] = useState<CommunityEvent[]>([])
  const [editorOpen, setEditorOpen] = useState(false)
  const [editingEvent, setEditingEvent] = useState<CommunityEvent | null>(null)
  const [flyerEvent, setFlyerEvent] = useState<CommunityEvent | null>(null)
  const [rosterEvent, setRosterEvent] = useState<CommunityEvent | null>(null)

  const load = useCallback(() => {
    void api<CommunityEvent[]>('/admin/events')
      .then(setEvents)
      .catch((err) => show(errorMessage(err)))
  }, [show])

  useEffect(() => {
    load()
  }, [load])

  async function openFlyer(event: CommunityEvent) {
    try {
      const full = await api<CommunityEvent>(`/admin/events/${event.slug}`)
      setFlyerEvent(full)
    } catch {
      setFlyerEvent(event)
    }
  }

  async function openEdit(event: CommunityEvent) {
    try {
      const full = await api<CommunityEvent>(`/admin/events/${event.slug}`)
      setEditingEvent(full)
    } catch {
      setEditingEvent(event)
    }
    setEditorOpen(true)
  }

  const activeCount = events.filter((e) => e.status === 'published').length
  const totalGuests = events.reduce((sum, e) => sum + (e.totalRegistered || 0), 0)

  return (
    <section className="live-admin-section">
      <div className="admin-page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <span className="eyebrow">PROGRAM OUTDOOR & KOMUNITAS</span>
          <h2 style={{ margin: 0, fontSize: '1.4rem' }}>Manajemen Event Luar Studio</h2>
          <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: '0.88rem' }}>
            Selenggarakan event yoga/pilates terbuka setiap 1-2 bulan sekali untuk menjangkau pelanggan baru studio.
          </p>
        </div>
        <button
          type="button"
          className="button button-primary"
          onClick={() => {
            setEditingEvent(null)
            setEditorOpen(true)
          }}
        >
          <Plus size={15} /> Buat Event Baru
        </button>
      </div>

      <div className="admin-kpi-grid" style={{ marginBottom: '20px' }}>
        <div className="admin-kpi-card">
          <div className="admin-kpi-head"><span>TOTAL EVENT</span><CalendarDays size={16} /></div>
          <div className="admin-kpi-val">{events.length}</div>
          <p className="admin-kpi-desc">Diselenggarakan studio</p>
        </div>
        <div className="admin-kpi-card">
          <div className="admin-kpi-head"><span>EVENT DIBUKA</span><Sparkles size={16} /></div>
          <div className="admin-kpi-val" style={{ color: '#166534' }}>{activeCount}</div>
          <p className="admin-kpi-desc">Buka pendaftaran publik</p>
        </div>
        <div className="admin-kpi-card">
          <div className="admin-kpi-head"><span>PESERTA TERDAFTAR</span><Users size={16} /></div>
          <div className="admin-kpi-val">{totalGuests}</div>
          <p className="admin-kpi-desc">Calon pelanggan & member</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '16px' }}>
        {events.map((evt) => (
          <div key={evt.id} className="panel" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '18px' }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                <span className={`tag ${evt.status === 'published' ? 'tag-green' : evt.status === 'completed' ? 'tag-blue' : 'tag-gold'}`}>
                  {evt.status === 'published' ? 'Pendaftaran Dibuka' : evt.status === 'completed' ? 'Selesai' : 'Draf'}
                </span>
                <span style={{ fontSize: '12px', color: '#64748b', fontWeight: 600 }}>
                  {formatDate(evt.startDate, { day: 'numeric', month: 'short', year: 'numeric' })}
                </span>
              </div>
              <h3 style={{ margin: '6px 0', fontSize: '1.15rem' }}>{evt.title}</h3>
              <p style={{ margin: '0 0 10px', fontSize: '0.85rem', color: '#475569', display: 'flex', alignItems: 'center', gap: '5px' }}>
                <MapPin size={14} style={{ color: '#17392e' }} /> {evt.locationName}
              </p>
              <div style={{ display: 'flex', gap: '12px', fontSize: '12px', color: '#64748b', marginBottom: '14px' }}>
                <span><strong>{evt.activityCount || 1}</strong> Sesi Kelas</span>
                <span>·</span>
                <span><strong>{evt.totalRegistered || 0}</strong> Peserta Terdaftar</span>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '8px', borderTop: '1px solid #e2e8f0', paddingTop: '12px', flexWrap: 'wrap' }}>
              <button
                type="button"
                className="button button-primary"
                style={{ flex: 1, padding: '6px 10px', fontSize: '12px' }}
                onClick={() => void openFlyer(evt)}
              >
                <QrCode size={14} /> Brosur & QR
              </button>
              <button
                type="button"
                className="button button-outline"
                style={{ padding: '6px 10px', fontSize: '12px' }}
                onClick={() => setRosterEvent(evt)}
              >
                <Users size={14} /> Roster
              </button>
              <button
                type="button"
                className="button button-outline"
                style={{ padding: '6px 8px', fontSize: '12px' }}
                onClick={() => void openEdit(evt)}
              >
                <Edit3 size={14} />
              </button>
            </div>
          </div>
        ))}
        {!events.length && (
          <div className="panel" style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '40px' }}>
            <p style={{ color: '#64748b' }}>Belum ada event komunitas luar studio. Klik tombol Buat Event Baru untuk memulai.</p>
          </div>
        )}
      </div>

      {editorOpen && (
        <EventEditorDialog
          event={editingEvent}
          onClose={() => setEditorOpen(false)}
          onSaved={load}
          show={show}
        />
      )}
      {flyerEvent && (
        <EventFlyerModal
          event={flyerEvent}
          onClose={() => setFlyerEvent(null)}
          show={show}
        />
      )}
      {rosterEvent && (
        <EventRosterDialog
          event={rosterEvent}
          timezone={timezone}
          onClose={() => setRosterEvent(null)}
          show={show}
        />
      )}
    </section>
  )
}
