import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react'
import { Calendar, Check, ChevronLeft, ChevronRight, Pencil, Plus } from 'lucide-react'
import { api, type AdminClassType, type AdminSession } from '../../shared/api'
import { formatDate, money } from '../../shared/format'
import {
  type PanelProps,
  type Coach,
  type SessionForm,
  errorMessage,
  studioToday,
  studioTime,
  referenceData,
} from './management-common'
import { SessionFields } from './SessionFields'
import { AdminDialog } from './AdminDialog'
import { useConfirm } from '../../shared/confirm-context'

function shiftDay(current: string, offset: number): string {
  const d = new Date(`${current}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + offset)
  return d.toISOString().slice(0, 10)
}

export function AdminSessionsPanel({
  timezone,
  show,
  onChanged,
}: PanelProps & { timezone: string; onChanged: () => void }) {
  const confirm = useConfirm()
  const today = studioToday(timezone)
  const tomorrow = shiftDay(today, 1)
  const dayAfter = shiftDay(today, 2)
  const [date, setDate] = useState(() => today)
  const [rows, setRows] = useState<AdminSession[]>([])
  const [classes, setClasses] = useState<AdminClassType[]>([])
  const [coaches, setCoaches] = useState<Coach[]>([])
  const [editing, setEditing] = useState<string | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [form, setForm] = useState<SessionForm>({
    classTypeId: '',
    coachId: '',
    localDate: studioToday(timezone),
    localStartTime: '09:00',
    capacity: 12,
    priceIdr: 0,
  })
  const [busy, setBusy] = useState(false)
  const request = useRef(0)
  const load = useCallback(
    async (day = date) => {
      const current = ++request.current
      const found = await api<AdminSession[]>(`/admin/sessions?date=${encodeURIComponent(day)}`)
      if (current === request.current) setRows(found)
    },
    [date],
  )
  useEffect(() => {
    void load().catch((error) => show(errorMessage(error)))
  }, [load, show])
  useEffect(() => {
    void referenceData()
      .then(([types, people]) => {
        setClasses(types)
        setCoaches(people)
      })
      .catch((error) => show(errorMessage(error)))
  }, [show])
  function edit(row: AdminSession) {
    setEditing(row.id)
    setForm({
      classTypeId: row.class_type_id,
      coachId: row.coach_id,
      localDate: row.local_date.slice(0, 10),
      localStartTime: studioTime(row.starts_at, timezone),
      capacity: row.capacity,
      priceIdr: row.price_idr,
    })
    setDialogOpen(true)
  }
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setBusy(true)
    try {
      await api(`/admin/sessions${editing ? `/${editing}` : ''}`, {
        method: editing ? 'PATCH' : 'POST',
        body: form,
      })
      setEditing(null)
      setDialogOpen(false)
      setDate(form.localDate)
      await load(form.localDate)
      onChanged()
      show('Sesi kelas tersimpan.')
    } catch (error) {
      show(errorMessage(error))
    } finally {
      setBusy(false)
    }
  }
  async function cancel(row: AdminSession) {
    if (
      !(await confirm({
        title: 'Batalkan sesi kelas?',
        description: `${row.title} pada ${row.local_date.slice(0, 10)} akan dibatalkan. Booking aktif diproses sesuai aturan pengembalian.`,
        confirmLabel: 'Batalkan sesi',
        tone: 'danger',
      }))
    )
      return
    setBusy(true)
    try {
      await api(`/admin/sessions/${row.id}/cancel`, { method: 'POST' })
      await load()
      onChanged()
      show('Sesi dibatalkan dan hak peserta diproses oleh backend.')
    } catch (error) {
      show(errorMessage(error))
    } finally {
      setBusy(false)
    }
  }
  return (
    <section className="admin-workspace">
      <div className="admin-workspace-head sessions-head-responsive" style={{ justifyContent: 'flex-end', marginBottom: '14px' }}>
        <button
          className="button button-primary"
          onClick={() => {
            setEditing(null)
            setForm({
              classTypeId: '',
              coachId: '',
              localDate: date,
              localStartTime: '09:00',
              capacity: 12,
              priceIdr: 0,
            })
            setDialogOpen(true)
          }}
        >
          <Plus size={15} /> Buat sesi
        </button>
      </div>

      <div className="sessions-date-nav-bar panel">
        <div className="date-pills">
          <button
            type="button"
            className={`chip-button${date === today ? ' chip-primary' : ''}`}
            onClick={() => setDate(today)}
          >
            Hari Ini
          </button>
          <button
            type="button"
            className={`chip-button${date === tomorrow ? ' chip-primary' : ''}`}
            onClick={() => setDate(tomorrow)}
          >
            Besok
          </button>
          <button
            type="button"
            className={`chip-button${date === dayAfter ? ' chip-primary' : ''}`}
            onClick={() => setDate(dayAfter)}
          >
            Lusa
          </button>
        </div>

        <div className="date-stepper-wrap">
          <button
            type="button"
            className="icon-button"
            title="Hari sebelumnya"
            aria-label="Hari sebelumnya"
            onClick={() => setDate((prev) => shiftDay(prev, -1))}
          >
            <ChevronLeft size={18} />
          </button>
          <div className="date-display-badge">
            <Calendar size={15} />
            <span>
              {formatDate(date, {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              })}
            </span>
            <input
              type="date"
              className="date-stepper-hidden-input"
              value={date}
              onChange={(event) => setDate(event.target.value)}
              aria-label="Pilih tanggal kalender"
            />
          </div>
          <button
            type="button"
            className="icon-button"
            title="Hari berikutnya"
            aria-label="Hari berikutnya"
            onClick={() => setDate((prev) => shiftDay(prev, 1))}
          >
            <ChevronRight size={18} />
          </button>
        </div>
      </div>
      <AdminDialog
        open={dialogOpen}
        title={editing ? 'Ubah sesi kelas' : 'Buat satu sesi'}
        description="Sesi yang telah memiliki booking hanya dapat diubah setelah dibatalkan dan dibuat ulang."
        onClose={() => {
          setDialogOpen(false)
          setEditing(null)
        }}
        wide
      >
        <form className="live-form admin-dialog-form" onSubmit={(event) => void save(event)}>
          <h3>{editing ? 'Ubah sesi kelas' : 'Buat satu sesi'}</h3>
          <SessionFields form={form} setForm={setForm} classes={classes} coaches={coaches} />
          <div className="admin-form-actions">
            <button
              className="button button-primary"
              disabled={busy || !classes.length || !coaches.length}
            >
              <Check size={15} /> Simpan sesi
            </button>
            {editing && (
              <button
                type="button"
                className="button button-text"
                onClick={() => {
                  setEditing(null)
                  setDialogOpen(false)
                }}
              >
                Batal ubah
              </button>
            )}
          </div>
        </form>
      </AdminDialog>
      <div className="admin-entity-grid admin-session-list">
        {rows.map((row) => (
          <article className="panel admin-record" key={row.id}>
            <div>
              <span className="eyebrow">
                {formatDate(row.local_date.slice(0, 10), {
                  weekday: 'long',
                  day: 'numeric',
                  month: 'long',
                })}{' '}
                · {row.status === 'cancelled' ? 'DIBATALKAN' : 'TERJADWAL'}
              </span>
              <h3>{row.title}</h3>
              <p>
                {studioTime(row.starts_at, timezone)} · {row.coach_name} · {row.capacity} kursi ·{' '}
                {money(row.price_idr)}
              </p>
            </div>
            {row.status === 'scheduled' && (
              <div className="admin-record-actions">
                <button className="button button-outline" disabled={busy} onClick={() => edit(row)}>
                  <Pencil size={14} /> Ubah
                </button>
                <button
                  className="button button-text live-danger"
                  disabled={busy}
                  onClick={() => void cancel(row)}
                >
                  Batalkan
                </button>
              </div>
            )}
          </article>
        ))}
        {!rows.length && (
          <div className="panel">
            <p>Belum ada sesi pada tanggal ini.</p>
          </div>
        )}
      </div>
    </section>
  )
}
