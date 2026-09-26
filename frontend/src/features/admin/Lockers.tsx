import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { Plus } from 'lucide-react'
import { api, type AdminLockers, type EligibleMember } from '../../shared/api'
import { formatDate } from '../../shared/format'
import { errorMessage } from '../../shared/errors'
import '../admin/StudioAssets.css'
import { AdminDialog } from './AdminDialog'
type Notice = { show: (message: string) => void }

export function AdminLockersPanel({ show }: Notice) {
  const [data, setData] = useState<AdminLockers | null>(null)
  const [members, setMembers] = useState<EligibleMember[]>([])
  const [search, setSearch] = useState('')
  const [code, setCode] = useState('')
  const [selectedLocker, setSelectedLocker] = useState<string | null>(null)
  const [createOpen, setCreateOpen] = useState(false)
  const [customerId, setCustomerId] = useState('')
  const [busy, setBusy] = useState(false)
  const load = useCallback(async () => setData(await api<AdminLockers>('/admin/lockers')), [])
  const loadMembers = useCallback(
    async (q: string) =>
      setMembers(
        await api<EligibleMember[]>(`/admin/lockers/eligible-customers?q=${encodeURIComponent(q)}`),
      ),
    [],
  )
  useEffect(() => {
    void load().catch((error) => show(errorMessage(error)))
    void loadMembers('').catch((error) => show(errorMessage(error)))
  }, [load, loadMembers, show])
  async function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setBusy(true)
    try {
      await api('/admin/lockers', { method: 'POST', body: { code: code.trim() } })
      setCode('')
      setCreateOpen(false)
      await load()
      show('Nomor loker ditambahkan.')
    } catch (error) {
      show(errorMessage(error))
    } finally {
      setBusy(false)
    }
  }
  async function assign(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!selectedLocker || !customerId) return
    setBusy(true)
    try {
      await api(`/admin/lockers/${selectedLocker}/assignment`, {
        method: 'PUT',
        body: { customerId },
      })
      setSelectedLocker(null)
      setCustomerId('')
      await Promise.all([load(), loadMembers(search)])
      show('Loker ditetapkan kepada member.')
    } catch (error) {
      show(errorMessage(error))
    } finally {
      setBusy(false)
    }
  }
  async function release(id: string, label: string) {
    if (!window.confirm(`Lepas penetapan loker ${label}?`)) return
    setBusy(true)
    try {
      await api(`/admin/lockers/${id}/assignment`, { method: 'DELETE' })
      await Promise.all([load(), loadMembers(search)])
      show('Penetapan loker dilepas. Riwayatnya tetap tersimpan.')
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
          <span className="eyebrow">FASILITAS STUDIO</span>
          <h2>Kelola loker</h2>
          <p>
            Nomor hanya dapat ditetapkan kepada pelanggan dengan paket aktif. Penetapan berakhir
            saat masa paket terkait berakhir.
          </p>
        </div>
        <button className="button button-primary" onClick={() => setCreateOpen(true)}>
          <Plus size={15} /> Tambah loker
        </button>
      </div>
      {data && !data.enabled && (
        <div className="panel studio-asset-note">
          Fitur loker sedang nonaktif. Aktifkan di tab Aturan studio sebelum menetapkan nomor.
        </div>
      )}
      <AdminDialog
        open={createOpen}
        title="Tambah nomor loker"
        onClose={() => setCreateOpen(false)}
      >
        <form className="live-form admin-dialog-form" onSubmit={(event) => void create(event)}>
          <label>
            Nomor atau kode
            <input
              required
              maxLength={32}
              pattern="[A-Za-z0-9][A-Za-z0-9-]*"
              value={code}
              onChange={(event) => setCode(event.target.value)}
              placeholder="Contoh: A-01"
            />
          </label>
          <button className="button button-primary" disabled={busy}>
            <Plus size={15} /> Tambah loker
          </button>
        </form>
      </AdminDialog>
      <div className="admin-entity-grid admin-locker-grid">
        {data?.lockers.map((row) => (
          <article className="panel admin-locker-card" key={row.id}>
            <div>
              <span className="eyebrow">
                {!row.active ? 'NONAKTIF' : row.customerId ? 'DITETAPKAN' : 'TERSEDIA'}
              </span>
              <h3>Loker {row.code}</h3>
              {row.customerId && (
                <p>
                  {row.customerName} · {row.customerEmail}
                  <br />
                  Paket sampai {formatDate(row.membershipEndsOn!)}
                </p>
              )}
            </div>
            {row.customerId ? (
              <button
                className="button button-text live-danger"
                disabled={busy}
                onClick={() => void release(row.id, row.code)}
              >
                Lepas
              </button>
            ) : (
              <button
                className="button button-outline"
                disabled={busy || !data.enabled || !row.active}
                onClick={() => {
                  setSelectedLocker(row.id)
                  setCustomerId('')
                  void loadMembers(search).catch((error) => show(errorMessage(error)))
                }}
              >
                Tetapkan
              </button>
            )}
          </article>
        ))}
        {data && !data.lockers.length && (
          <div className="panel">
            <p>Belum ada nomor loker.</p>
          </div>
        )}
      </div>
      <AdminDialog
        open={Boolean(selectedLocker)}
        title={`Tetapkan loker ${data?.lockers.find((row) => row.id === selectedLocker)?.code ?? ''}`}
        description="Pilih member aktif yang belum mendapatkan loker."
        onClose={() => {
          setSelectedLocker(null)
          setCustomerId('')
        }}
      >
        {selectedLocker && (
          <form className="live-form admin-dialog-form" onSubmit={(event) => void assign(event)}>
            <h3>Tetapkan loker {data?.lockers.find((row) => row.id === selectedLocker)?.code}</h3>
            <label>
              Cari member aktif
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Nama atau email"
              />
            </label>
            <button
              type="button"
              className="button button-outline"
              disabled={busy}
              onClick={() => void loadMembers(search).catch((error) => show(errorMessage(error)))}
            >
              Cari member
            </button>
            <label>
              Pelanggan
              <select
                required
                value={customerId}
                onChange={(event) => setCustomerId(event.target.value)}
              >
                <option value="">Pilih member</option>
                {members.map((row) => (
                  <option key={row.id} value={row.id}>
                    {row.fullName} · {row.email} · sampai {row.membershipEndsOn}
                  </option>
                ))}
              </select>
            </label>
            {!members.length && <p>Belum ada member aktif yang belum mendapat loker.</p>}
            <div className="admin-form-actions">
              <button className="button button-primary" disabled={busy || !customerId}>
                Tetapkan
              </button>
              <button
                type="button"
                className="button button-text"
                onClick={() => {
                  setSelectedLocker(null)
                  setCustomerId('')
                }}
              >
                Batal
              </button>
            </div>
          </form>
        )}
      </AdminDialog>
    </section>
  )
}
