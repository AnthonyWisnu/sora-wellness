import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { Plus } from 'lucide-react'
import { api, type AdminClassType, type AdminScheduleRule } from '../../shared/api'
import { formatDate, money } from '../../shared/format'
import {
  type PanelProps,
  type Coach,
  type RuleForm,
  weekdays,
  errorMessage,
  studioToday,
  referenceData,
} from './management-common'
import { SessionFields } from './SessionFields'
import { AdminDialog } from './AdminDialog'

export function AdminRulesPanel({
  timezone,
  show,
  onChanged,
}: PanelProps & { timezone: string; onChanged: () => void }) {
  const today = studioToday(timezone)
  const [rows, setRows] = useState<AdminScheduleRule[]>([])
  const [classes, setClasses] = useState<AdminClassType[]>([])
  const [coaches, setCoaches] = useState<Coach[]>([])
  const [form, setForm] = useState<RuleForm>({
    classTypeId: '',
    coachId: '',
    localDate: today,
    localStartTime: '09:00',
    capacity: 12,
    priceIdr: 0,
    isoWeekday: 1,
    startsOn: today,
    endsOn: today,
  })
  const [busy, setBusy] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const load = useCallback(
    async () => setRows(await api<AdminScheduleRule[]>('/admin/schedule-rules')),
    [],
  )
  useEffect(() => {
    void load().catch((error) => show(errorMessage(error)))
    void referenceData()
      .then(([types, people]) => {
        setClasses(types)
        setCoaches(people)
      })
      .catch((error) => show(errorMessage(error)))
  }, [load, show])
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setBusy(true)
    try {
      const { localDate: _unused, ...body } = form
      void _unused
      const result = await api<{ sessionsCreated: number }>('/admin/schedule-rules', {
        method: 'POST',
        body,
      })
      await load()
      setDialogOpen(false)
      setForm({ ...form, localDate: today, startsOn: today, endsOn: today })
      onChanged()
      show(`Aturan jadwal tersimpan; ${result.sessionsCreated} sesi dibuat.`)
    } catch (error) {
      show(errorMessage(error))
    } finally {
      setBusy(false)
    }
  }
  return (
    <section className="admin-workspace">
      <div className="admin-workspace-head">
        <div>
          <span className="eyebrow">JADWAL BERULANG</span>
          <h2>Aturan mingguan</h2>
          <p>
            Buat sesi otomatis untuk hari yang dipilih dalam rentang maksimal 180 hari. Pengecualian
            satu sesi dikelola di tab Kelola sesi.
          </p>
        </div>
        <button className="button button-primary" onClick={() => setDialogOpen(true)}>
          <Plus size={15} /> Tambah aturan
        </button>
      </div>
      <AdminDialog
        open={dialogOpen}
        title="Tambah aturan mingguan"
        description="Sesi dibuat otomatis dalam rentang tanggal yang dipilih."
        onClose={() => setDialogOpen(false)}
        wide
      >
        <form className="live-form admin-dialog-form" onSubmit={(event) => void save(event)}>
          <h3>Tambah aturan</h3>
          <SessionFields
            form={form}
            setForm={(value) => setForm({ ...form, ...value })}
            classes={classes}
            coaches={coaches}
            withDate={false}
          />
          <div className="live-form-grid">
            <label>
              Hari
              <select
                value={form.isoWeekday}
                onChange={(event) => setForm({ ...form, isoWeekday: Number(event.target.value) })}
              >
                {weekdays.map((day, index) => (
                  <option key={day} value={index + 1}>
                    {day}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Mulai berlaku
              <input
                type="date"
                required
                value={form.startsOn}
                onChange={(event) => setForm({ ...form, startsOn: event.target.value })}
              />
            </label>
          </div>
          <label>
            Sampai tanggal
            <input
              type="date"
              required
              min={form.startsOn}
              value={form.endsOn}
              onChange={(event) => setForm({ ...form, endsOn: event.target.value })}
            />
          </label>
          <p>
            Sesi dibuat untuk tanggal hari ini dan setelahnya. Aturan lama tidak mengubah sesi yang
            sudah ada.
          </p>
          <button
            className="button button-primary"
            disabled={busy || !classes.length || !coaches.length}
          >
            <Plus size={15} /> Buat aturan
          </button>
        </form>
      </AdminDialog>
      <div className="admin-entity-grid">
        {rows.map((row) => (
          <article className="panel admin-record" key={row.id}>
            <div>
              <span className="eyebrow">
                {weekdays[row.iso_weekday - 1]} · {String(row.local_start_time).slice(0, 5)}
              </span>
              <h3>{row.title}</h3>
              <p>
                {row.coach_name} · {formatDate(row.starts_on.slice(0, 10))} –{' '}
                {formatDate(row.ends_on.slice(0, 10))}
              </p>
              <p>
                {row.capacity} kursi · {money(row.price_idr)}
              </p>
            </div>
          </article>
        ))}
        {!rows.length && (
          <div className="panel">
            <p>Belum ada aturan jadwal berulang.</p>
          </div>
        )}
      </div>
    </section>
  )
}
