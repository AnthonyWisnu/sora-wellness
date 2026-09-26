import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { Check, Pencil, Plus } from 'lucide-react'
import { api, type AdminPackageOption } from '../../shared/api'
import { money } from '../../shared/format'
import { AdminDialog } from './AdminDialog'
import { type PanelProps, errorMessage } from './management-common'

export function AdminPackagesPanel({ show, onChanged }: PanelProps & { onChanged: () => void }) {
  const [rows, setRows] = useState<AdminPackageOption[]>([])
  const [editing, setEditing] = useState<string | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [durationMonths, setDurationMonths] = useState(1)
  const [priceIdr, setPriceIdr] = useState(0)
  const [active, setActive] = useState(true)
  const [busy, setBusy] = useState(false)
  const load = useCallback(
    async () => setRows(await api<AdminPackageOption[]>('/admin/package-options')),
    [],
  )
  useEffect(() => {
    void load().catch((error) => show(errorMessage(error)))
  }, [load, show])
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setBusy(true)
    try {
      if (editing)
        await api(`/admin/package-options/${editing}`, {
          method: 'PATCH',
          body: { priceIdr, active },
        })
      else
        await api('/admin/package-options', { method: 'POST', body: { durationMonths, priceIdr } })
      setEditing(null)
      setDialogOpen(false)
      setDurationMonths(1)
      setPriceIdr(0)
      setActive(true)
      await load()
      onChanged()
      show('Pilihan paket tersimpan.')
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
          <span className="eyebrow">MEMBERSHIP</span>
          <h2>Durasi & harga paket</h2>
          <p>
            Semua pilihan memakai manfaat dan jatah kelas yang sama. Harga tersimpan saat pelanggan
            membeli.
          </p>
        </div>
        <button
          className="button button-primary"
          onClick={() => {
            setEditing(null)
            setDurationMonths(1)
            setPriceIdr(0)
            setActive(true)
            setDialogOpen(true)
          }}
        >
          <Plus size={15} /> Tambah pilihan paket
        </button>
      </div>
      <AdminDialog
        open={dialogOpen}
        title={editing ? 'Ubah pilihan paket' : 'Tambah pilihan paket'}
        onClose={() => {
          setDialogOpen(false)
          setEditing(null)
          setDurationMonths(1)
          setPriceIdr(0)
          setActive(true)
        }}
      >
        <form className="live-form admin-dialog-form" onSubmit={(event) => void save(event)}>
          <h3>{editing ? 'Ubah pilihan paket' : 'Tambah pilihan paket'}</h3>
          <label>
            Durasi (bulan)
            <input
              type="number"
              min={1}
              max={36}
              required
              disabled={Boolean(editing)}
              value={durationMonths}
              onChange={(event) => setDurationMonths(Number(event.target.value))}
            />
          </label>
          <label>
            Harga paket (Rp)
            <input
              type="number"
              min={0}
              step={1}
              required
              value={priceIdr}
              onChange={(event) => setPriceIdr(Number(event.target.value))}
            />
          </label>
          {editing && (
            <label className="live-checkbox">
              <input
                type="checkbox"
                checked={active}
                onChange={(event) => setActive(event.target.checked)}
              />{' '}
              Tampilkan kepada pelanggan
            </label>
          )}
          <div className="admin-form-actions">
            <button className="button button-primary" disabled={busy}>
              <Check size={15} /> Simpan paket
            </button>
            {editing && (
              <button
                type="button"
                className="button button-text"
                onClick={() => {
                  setEditing(null)
                  setDurationMonths(1)
                  setPriceIdr(0)
                  setActive(true)
                  setDialogOpen(false)
                }}
              >
                Batal ubah
              </button>
            )}
          </div>
        </form>
      </AdminDialog>
      <div className="admin-entity-grid">
        {rows.map((row) => (
          <article className="panel admin-record" key={row.id}>
            <div>
              <span className="eyebrow">{row.active ? 'AKTIF' : 'DISEMBUNYIKAN'}</span>
              <h3>{row.duration_months} bulan</h3>
              <p>{money(row.price_idr)}</p>
            </div>
            <button
              className="button button-outline"
              onClick={() => {
                setEditing(row.id)
                setDialogOpen(true)
                setDurationMonths(row.duration_months)
                setPriceIdr(row.price_idr)
                setActive(row.active)
              }}
            >
              <Pencil size={14} /> Ubah
            </button>
          </article>
        ))}
        {!rows.length && (
          <div className="panel">
            <p>Belum ada pilihan paket.</p>
          </div>
        )}
      </div>
    </section>
  )
}
