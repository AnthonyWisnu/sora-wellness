import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { Calendar, LockKeyhole, Plus, Search, ShieldCheck, User } from 'lucide-react'
import { api, type AdminLockers, type EligibleMember } from '../../shared/api'
import { formatDate } from '../../shared/format'
import { errorMessage } from '../../shared/errors'
import '../admin/StudioAssets.css'
import { AdminDialog } from './AdminDialog'
import { useConfirm } from '../../shared/confirm-context'
type Notice = { show: (message: string) => void }

export function AdminLockersPanel({ show }: Notice) {
  const confirm = useConfirm()
  const [data, setData] = useState<AdminLockers | null>(null)
  const [members, setMembers] = useState<EligibleMember[]>([])
  const [search, setSearch] = useState('')
  const [code, setCode] = useState('')
  const [selectedLocker, setSelectedLocker] = useState<string | null>(null)
  const [createOpen, setCreateOpen] = useState(false)
  const [customerId, setCustomerId] = useState('')
  const [busy, setBusy] = useState(false)
  const [filterTab, setFilterTab] = useState<'all' | 'available' | 'assigned'>('all')
  const [lockerQuery, setLockerQuery] = useState('')

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
    if (
      !(await confirm({
        title: 'Lepas penetapan loker?',
        description: `Loker ${label} tidak lagi ditetapkan kepada member. Riwayat penetapan tetap tersimpan.`,
        confirmLabel: 'Lepas loker',
        tone: 'danger',
      }))
    )
      return
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

  const filteredLockers = (data?.lockers ?? []).filter((row) => {
    if (filterTab === 'available' && (!row.active || Boolean(row.customerId))) return false
    if (filterTab === 'assigned' && !row.customerId) return false
    if (lockerQuery.trim()) {
      const q = lockerQuery.toLowerCase()
      const matchCode = row.code.toLowerCase().includes(q)
      const matchName = row.customerName?.toLowerCase().includes(q) ?? false
      const matchEmail = row.customerEmail?.toLowerCase().includes(q) ?? false
      if (!matchCode && !matchName && !matchEmail) return false
    }
    return true
  })

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

      <div className="admin-locker-matrix-section">
        {(() => {
          const totalCount = data?.lockers.length ?? 0
          const availableCount = (data?.lockers ?? []).filter((l) => l.active && !l.customerId).length
          const assignedCount = (data?.lockers ?? []).filter((l) => Boolean(l.customerId)).length
          const occupancyPercent = totalCount > 0 ? Math.round((assignedCount / totalCount) * 100) : 0

          return (
            <div className="admin-locker-kpi-banner">
              <div className="admin-locker-kpi-card">
                <div className="admin-locker-kpi-icon-wrap blue">
                  <LockKeyhole size={18} />
                </div>
                <div className="admin-locker-kpi-info">
                  <span>Total Kapasitas</span>
                  <strong>{totalCount} Loker</strong>
                  <small>Kompartemen studio</small>
                </div>
              </div>

              <div className="admin-locker-kpi-card">
                <div className="admin-locker-kpi-icon-wrap green">
                  <ShieldCheck size={18} />
                </div>
                <div className="admin-locker-kpi-info">
                  <span>Loker Tersedia</span>
                  <strong style={{ color: '#15803d' }}>{availableCount} Loker</strong>
                  <small>Siap ditetapkan</small>
                </div>
              </div>

              <div className="admin-locker-kpi-card">
                <div className="admin-locker-kpi-icon-wrap amber">
                  <User size={18} />
                </div>
                <div className="admin-locker-kpi-info">
                  <span>Sedang Terisi</span>
                  <strong style={{ color: '#0369a1' }}>{assignedCount} Loker</strong>
                  <small>Aktif bersama member</small>
                </div>
              </div>

              <div className="admin-locker-kpi-card occupancy">
                <div className="admin-locker-occupancy-head">
                  <span>Okupansi Studio</span>
                  <strong>{occupancyPercent}%</strong>
                </div>
                <div className="admin-locker-progress-track">
                  <div
                    className="admin-locker-progress-bar"
                    style={{ width: `${occupancyPercent}%` }}
                  />
                </div>
                <span className="admin-locker-occupancy-sub">
                  {assignedCount} dari {totalCount} unit terisi
                </span>
              </div>
            </div>
          )
        })()}

        <div className="admin-locker-toolbar">
          <div className="admin-locker-filter-pills">
            <button
              type="button"
              className={`admin-locker-filter-btn ${filterTab === 'all' ? 'active' : ''}`}
              onClick={() => setFilterTab('all')}
            >
              Semua ({data?.lockers.length ?? 0})
            </button>
            <button
              type="button"
              className={`admin-locker-filter-btn ${filterTab === 'available' ? 'active' : ''}`}
              onClick={() => setFilterTab('available')}
            >
              Tersedia ({(data?.lockers ?? []).filter((l) => l.active && !l.customerId).length})
            </button>
            <button
              type="button"
              className={`admin-locker-filter-btn ${filterTab === 'assigned' ? 'active' : ''}`}
              onClick={() => setFilterTab('assigned')}
            >
              Terisi ({(data?.lockers ?? []).filter((l) => Boolean(l.customerId)).length})
            </button>
          </div>

          <div className="admin-locker-search-box">
            <Search size={14} style={{ color: 'var(--muted)', flexShrink: 0 }} />
            <input
              type="text"
              placeholder="Cari kode loker atau nama..."
              value={lockerQuery}
              onChange={(e) => setLockerQuery(e.target.value)}
            />
          </div>
        </div>

        <div className="admin-entity-grid admin-locker-grid admin-locker-matrix-grid">
          {filteredLockers.map((row) => {
            const initials = row.customerName
              ? row.customerName
                  .split(' ')
                  .filter(Boolean)
                  .map((n) => n[0])
                  .join('')
                  .slice(0, 2)
                  .toUpperCase()
              : 'MB'

            return (
              <article
                className={`panel admin-record admin-locker-card admin-locker-box ${
                  row.customerId ? 'assigned' : 'available'
                }`}
                key={row.id}
              >
                <div className="admin-locker-box-top">
                  <div className="admin-locker-compartment-pill">
                    <span className="admin-locker-compartment-label">LOKER</span>
                    <strong className="admin-locker-code">{row.code}</strong>
                  </div>
                  <span
                    className={`admin-locker-status-tag ${
                      !row.active ? 'inactive' : row.customerId ? 'assigned' : 'available'
                    }`}
                  >
                    {!row.active ? 'Nonaktif' : row.customerId ? 'Ditetapkan' : 'Tersedia'}
                  </span>
                </div>

                <div className="admin-locker-box-center">
                  {row.customerId ? (
                    <div className="admin-locker-occupant">
                      <div className="admin-locker-occupant-profile">
                        <div className="admin-locker-avatar">{initials}</div>
                        <div className="admin-locker-occupant-info">
                          <strong className="admin-locker-occupant-name">{row.customerName}</strong>
                          <span
                            className="admin-locker-occupant-email"
                            title={row.customerEmail ?? undefined}
                          >
                            {row.customerEmail}
                          </span>
                        </div>
                      </div>
                      <div className="admin-locker-validity-pill">
                        <Calendar size={12} style={{ flexShrink: 0 }} />
                        <span>Paket s/d {formatDate(row.membershipEndsOn!)}</span>
                      </div>
                    </div>
                  ) : (
                    <div className="admin-locker-vacant">
                      <div className="admin-locker-vacant-icon-wrap">
                        <LockKeyhole size={18} />
                      </div>
                      <div className="admin-locker-vacant-text">
                        <strong>Siap Ditetapkan</strong>
                        <span>Slot kosong untuk member</span>
                      </div>
                    </div>
                  )}
                </div>

                <div className="admin-locker-box-action">
                  {row.customerId ? (
                    <button
                      type="button"
                      className="button button-outline admin-locker-action-btn danger"
                      disabled={busy}
                      onClick={() => void release(row.id, row.code)}
                    >
                      Lepas
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="button button-outline admin-locker-action-btn primary"
                      disabled={busy || !data?.enabled || !row.active}
                      onClick={() => {
                        setSelectedLocker(row.id)
                        setCustomerId('')
                        void loadMembers(search).catch((error) => show(errorMessage(error)))
                      }}
                    >
                      Tetapkan
                    </button>
                  )}
                </div>
              </article>
            )
          })}
          {data && !filteredLockers.length && (
            <div className="panel" style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '36px 20px' }}>
              <p style={{ margin: 0, color: 'var(--muted)' }}>
                {lockerQuery ? 'Tidak ada loker yang cocok dengan pencarian.' : 'Belum ada nomor loker.'}
              </p>
            </div>
          )}
        </div>
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
