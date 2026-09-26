import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { Check, Clock, Pencil, Plus, Users } from 'lucide-react'
import { api, type AdminClassType } from '../../shared/api'
import { money } from '../../shared/format'
import { AdminDialog } from './AdminDialog'
import {
  type PanelProps,
  type ClassForm,
  levelLabel,
  blankClass,
  errorMessage,
} from './management-common'

export function AdminClassTypesPanel({ show, onChanged }: PanelProps & { onChanged: () => void }) {
  const [rows, setRows] = useState<AdminClassType[]>([])
  const [editing, setEditing] = useState<string | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [form, setForm] = useState<ClassForm>(blankClass)
  const [busy, setBusy] = useState(false)
  const load = useCallback(
    async () => setRows(await api<AdminClassType[]>('/admin/class-types')),
    [],
  )
  useEffect(() => {
    void load().catch((error) => show(errorMessage(error)))
  }, [load, show])
  function edit(row: AdminClassType) {
    setEditing(row.id)
    setForm({
      title: row.title,
      category: row.category,
      level: row.level,
      description: row.description,
      durationMinutes: row.duration_minutes,
      defaultCapacity: row.default_capacity,
      defaultPriceIdr: row.default_price_idr,
    })
    setDialogOpen(true)
  }
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setBusy(true)
    try {
      await api(`/admin/class-types${editing ? `/${editing}` : ''}`, {
        method: editing ? 'PATCH' : 'POST',
        body: {
          ...form,
          title: form.title.trim(),
          category: form.category.trim(),
          description: form.description.trim(),
        },
      })
      setEditing(null)
      setDialogOpen(false)
      setForm(blankClass)
      await load()
      onChanged()
      show('Jenis kelas tersimpan.')
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
          <span className="eyebrow">KATALOG</span>
          <h2>Jenis kelas</h2>
          <p>
            Nilai bawaan digunakan saat membuat sesi. Perubahan katalog tidak mengubah transaksi
            lama.
          </p>
        </div>
        <button
          className="button button-primary"
          onClick={() => {
            setEditing(null)
            setForm(blankClass)
            setDialogOpen(true)
          }}
        >
          <Plus size={15} /> Tambah jenis kelas
        </button>
      </div>
      <AdminDialog
        open={dialogOpen}
        title={editing ? 'Ubah jenis kelas' : 'Tambah jenis kelas'}
        onClose={() => {
          setDialogOpen(false)
          setEditing(null)
          setForm(blankClass)
        }}
      >
        <form className="live-form admin-dialog-form" onSubmit={(event) => void save(event)}>
          <h3>{editing ? 'Ubah jenis kelas' : 'Tambah jenis kelas'}</h3>
          <label>
            Nama kelas
            <input
              required
              minLength={2}
              maxLength={120}
              value={form.title}
              onChange={(event) => setForm({ ...form, title: event.target.value })}
            />
          </label>
          <div className="live-form-grid">
            <label>
              Kategori
              <input
                required
                minLength={2}
                maxLength={80}
                value={form.category}
                onChange={(event) => setForm({ ...form, category: event.target.value })}
              />
            </label>
            <label>
              Tingkat
              <select
                value={form.level}
                onChange={(event) =>
                  setForm({ ...form, level: event.target.value as ClassForm['level'] })
                }
              >
                {Object.entries(levelLabel).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <label>
            Deskripsi
            <textarea
              rows={3}
              value={form.description}
              onChange={(event) => setForm({ ...form, description: event.target.value })}
            />
          </label>
          <div className="live-form-grid">
            <label>
              Durasi (menit)
              <input
                type="number"
                required
                min={15}
                max={480}
                value={form.durationMinutes}
                onChange={(event) =>
                  setForm({ ...form, durationMinutes: Number(event.target.value) })
                }
              />
            </label>
            <label>
              Kapasitas bawaan
              <input
                type="number"
                required
                min={1}
                max={500}
                value={form.defaultCapacity}
                onChange={(event) =>
                  setForm({ ...form, defaultCapacity: Number(event.target.value) })
                }
              />
            </label>
          </div>
          <label>
            Harga satuan bawaan (Rp)
            <input
              type="number"
              required
              min={0}
              step={1}
              value={form.defaultPriceIdr}
              onChange={(event) =>
                setForm({ ...form, defaultPriceIdr: Number(event.target.value) })
              }
            />
          </label>
          <div className="admin-form-actions">
            <button className="button button-primary" disabled={busy}>
              <Check size={15} /> Simpan kelas
            </button>
            {editing && (
              <button
                type="button"
                className="button button-text"
                onClick={() => {
                  setEditing(null)
                  setForm(blankClass)
                  setDialogOpen(false)
                }}
              >
                Batal ubah
              </button>
            )}
          </div>
        </form>
      </AdminDialog>
      <div className="admin-entity-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))' }}>
        {rows.map((row) => (
          <article className="panel admin-record admin-class-card" key={row.id}>
            <div>
              <div className="admin-class-card-top">
                <span className="eyebrow" style={{ margin: 0 }}>{row.category}</span>
                <span className={`admin-class-level-badge ${row.level}`}>
                  {levelLabel[row.level]}
                </span>
              </div>
              <h3 className="admin-class-card-title">{row.title}</h3>
              {row.description ? (
                <p className="admin-class-card-desc">{row.description}</p>
              ) : (
                <p className="admin-class-card-desc" style={{ fontStyle: 'italic', opacity: 0.6 }}>Tidak ada deskripsi</p>
              )}
              <div className="admin-class-card-specs">
                <span>
                  <Clock size={13} style={{ color: 'var(--muted)' }} /> {row.duration_minutes} menit
                </span>
                <span>·</span>
                <span>
                  <Users size={13} style={{ color: 'var(--muted)' }} /> {row.default_capacity} kursi
                </span>
              </div>
            </div>
            <div className="admin-class-card-bottom">
              <div>
                <span style={{ fontSize: '11px', color: 'var(--muted)', display: 'block' }}>Tarif Bawaan</span>
                <span className="admin-class-price">{money(row.default_price_idr)}</span>
              </div>
              <button className="button button-outline" onClick={() => edit(row)}>
                <Pencil size={14} /> Ubah
              </button>
            </div>
          </article>
        ))}
        {!rows.length && (
          <div className="panel" style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '36px' }}>
            <p style={{ margin: 0, color: 'var(--muted)' }}>Belum ada jenis kelas.</p>
          </div>
        )}
      </div>
    </section>
  )
}
