import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { Pencil, Plus, Trash2 } from 'lucide-react'
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
import { useConfirm } from '../../shared/confirm-context'

export function AdminRulesPanel({
  timezone,
  show,
  onChanged,
}: PanelProps & { timezone: string; onChanged: () => void }) {
  const confirm = useConfirm()
  const today = studioToday(timezone)
  const [rows, setRows] = useState<AdminScheduleRule[]>([])
  const [classes, setClasses] = useState<AdminClassType[]>([])
  const [coaches, setCoaches] = useState<Coach[]>([])
  const [selectedDay, setSelectedDay] = useState<number>(0)
  const [editingRule, setEditingRule] = useState<AdminScheduleRule | null>(null)
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

  function openCreate() {
    setEditingRule(null)
    setForm({
      classTypeId: classes[0]?.id ?? '',
      coachId: coaches[0]?.id ?? '',
      localDate: today,
      localStartTime: '09:00',
      capacity: classes[0]?.default_capacity ?? 12,
      priceIdr: classes[0]?.default_price_idr ?? 0,
      isoWeekday: 1,
      startsOn: today,
      endsOn: today,
    })
    setDialogOpen(true)
  }

  function openEdit(row: AdminScheduleRule) {
    setEditingRule(row)
    setForm({
      classTypeId: row.class_type_id,
      coachId: row.coach_id,
      localDate: today,
      localStartTime: String(row.local_start_time).slice(0, 5),
      capacity: row.capacity,
      priceIdr: row.price_idr,
      isoWeekday: row.iso_weekday,
      startsOn: row.starts_on.slice(0, 10),
      endsOn: row.ends_on.slice(0, 10),
    })
    setDialogOpen(true)
  }

  async function removeRule(row: AdminScheduleRule) {
    const ok = await confirm({
      title: 'Hapus aturan jadwal berulang?',
      description: `Aturan ${row.title} (${weekdays[row.iso_weekday - 1]} pukul ${String(row.local_start_time).slice(0, 5)}) akan dihapus. Sesi mendatang yang belum dipesan akan ikut dihapus.`,
      confirmLabel: 'Hapus aturan',
      tone: 'danger',
    })
    if (!ok) return

    setBusy(true)
    try {
      await api(`/admin/schedule-rules/${row.id}`, { method: 'DELETE' })
      await load()
      onChanged()
      show('Aturan jadwal dan sesi mendatang yang belum dipesan berhasil dihapus.')
    } catch (error) {
      show(errorMessage(error))
    } finally {
      setBusy(false)
    }
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setBusy(true)
    try {
      if (editingRule) {
        await api(`/admin/schedule-rules/${editingRule.id}`, {
          method: 'PATCH',
          body: {
            coachId: form.coachId,
            capacity: form.capacity,
            priceIdr: form.priceIdr,
            localStartTime: form.localStartTime,
            isoWeekday: form.isoWeekday,
          },
        })
        await load()
        setDialogOpen(false)
        setEditingRule(null)
        onChanged()
        show('Aturan jadwal berhasil diperbarui dan sesi mendatang disinkronkan.')
      } else {
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
      }
    } catch (error) {
      show(errorMessage(error))
    } finally {
      setBusy(false)
    }
  }

  const filteredRows = selectedDay === 0 ? rows : rows.filter((r) => r.iso_weekday === selectedDay)

  return (
    <section className="admin-workspace">
      <div className="admin-workspace-head" style={{ justifyContent: 'flex-end', marginBottom: '10px' }}>
        <button className="button button-primary" onClick={openCreate}>
          <Plus size={15} /> Tambah aturan
        </button>
      </div>

      <div className="admin-day-filter-bar" style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '20px' }}>
        <button
          type="button"
          className={`button ${selectedDay === 0 ? 'button-primary' : 'button-outline'}`}
          style={{ padding: '6px 14px', fontSize: '0.85rem' }}
          onClick={() => setSelectedDay(0)}
        >
          Semua Hari ({rows.length})
        </button>
        {weekdays.map((dayName, idx) => {
          const dayNum = idx + 1
          const count = rows.filter((r) => r.iso_weekday === dayNum).length
          return (
            <button
              key={dayName}
              type="button"
              className={`button ${selectedDay === dayNum ? 'button-primary' : 'button-outline'}`}
              style={{ padding: '6px 14px', fontSize: '0.85rem' }}
              onClick={() => setSelectedDay(dayNum)}
            >
              {dayName} {count > 0 ? `(${count})` : ''}
            </button>
          )
        })}
      </div>

      <AdminDialog
        open={dialogOpen}
        title={editingRule ? 'Ubah aturan mingguan' : 'Tambah aturan mingguan'}
        description={
          editingRule
            ? 'Perubahan pelatih, jam, kapasitas, dan harga akan disinkronkan ke sesi mendatang yang belum dipesan.'
            : 'Sesi dibuat otomatis dalam rentang tanggal yang dipilih.'
        }
        onClose={() => {
          setDialogOpen(false)
          setEditingRule(null)
        }}
        wide
      >
        <form className="live-form admin-dialog-form" onSubmit={(event) => void save(event)}>
          <h3>{editingRule ? 'Edit aturan jadwal' : 'Tambah aturan'}</h3>
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
                disabled={Boolean(editingRule)}
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
              disabled={Boolean(editingRule)}
              min={form.startsOn}
              value={form.endsOn}
              onChange={(event) => setForm({ ...form, endsOn: event.target.value })}
            />
          </label>
          <p>
            {editingRule
              ? 'Mengubah aturan ini memperbarui sesi aktif mendatang yang belum dibooking member.'
              : 'Sesi dibuat untuk tanggal hari ini dan setelahnya. Aturan lama tidak mengubah sesi yang sudah ada.'}
          </p>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              className="button button-primary"
              disabled={busy || !classes.length || !coaches.length}
            >
              {editingRule ? <Pencil size={15} /> : <Plus size={15} />} {editingRule ? 'Simpan perubahan' : 'Buat aturan'}
            </button>
            {editingRule && (
              <button
                type="button"
                className="button button-outline"
                onClick={() => {
                  setDialogOpen(false)
                  setEditingRule(null)
                }}
              >
                Batal
              </button>
            )}
          </div>
        </form>
      </AdminDialog>

      <div className="admin-entity-grid">
        {filteredRows.map((row) => (
          <article className="panel admin-record" key={row.id}>
            <div>
              <span className="eyebrow">
                {weekdays[row.iso_weekday - 1]} · {String(row.local_start_time).slice(0, 5)}
              </span>
              <h3>{row.title}</h3>
              <p>
                {row.coach_name} · {formatDate(row.starts_on.slice(0, 10))} s/d{' '}
                {formatDate(row.ends_on.slice(0, 10))}
              </p>
              <p>
                {row.capacity} kursi · {money(row.price_idr)}
              </p>
            </div>
            <div className="admin-record-actions">
              <button
                className="button button-outline"
                disabled={busy}
                onClick={() => openEdit(row)}
              >
                <Pencil size={14} /> Ubah
              </button>
              <button
                className="button button-text live-danger"
                disabled={busy}
                onClick={() => void removeRule(row)}
              >
                <Trash2 size={14} /> Hapus
              </button>
            </div>
          </article>
        ))}
        {!filteredRows.length && (
          <div className="panel">
            <p>
              {selectedDay === 0
                ? 'Belum ada aturan jadwal berulang.'
                : `Belum ada aturan jadwal berulang untuk hari ${weekdays[selectedDay - 1]}.`}
            </p>
          </div>
        )}
      </div>
    </section>
  )
}
