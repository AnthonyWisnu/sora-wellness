import { useCallback, useEffect, useState } from 'react'
import { Plus, Search } from 'lucide-react'
import { api, type AdminLockers, type EligibleMember, type BatchLockerResult } from '../../shared/api'
import { errorMessage } from '../../shared/errors'
import { useConfirm } from '../../shared/confirm-context'
import { LockerKpiBanner } from './lockers/LockerKpiBanner'
import { LockerCard } from './lockers/LockerCard'
import { LockerCreateDialog } from './lockers/LockerCreateDialog'
import { LockerAssignDialog } from './lockers/LockerAssignDialog'
import './Management.css'
import './StudioAssets.css'

type Notice = { show: (message: string) => void }
type FilterTab = 'all' | 'available' | 'assigned' | 'maintenance'

export function AdminLockersPanel({ show }: Notice) {
  const confirm = useConfirm()
  const [data, setData] = useState<AdminLockers | null>(null)
  const [members, setMembers] = useState<EligibleMember[]>([])
  const [selectedLocker, setSelectedLocker] = useState<string | null>(null)
  const [createOpen, setCreateOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [filterTab, setFilterTab] = useState<FilterTab>('all')
  const [lockerQuery, setLockerQuery] = useState('')

  const load = useCallback(async () => {
    setData(await api<AdminLockers>('/admin/lockers'))
  }, [])

  const loadMembers = useCallback(async (q: string) => {
    setMembers(
      await api<EligibleMember[]>(`/admin/lockers/eligible-customers?q=${encodeURIComponent(q)}`),
    )
  }, [])

  useEffect(() => {
    void load().catch((error) => show(errorMessage(error)))
    void loadMembers('').catch((error) => show(errorMessage(error)))
  }, [load, loadMembers, show])

  async function handleCreateSingle(code: string) {
    setBusy(true)
    try {
      await api('/admin/lockers', { method: 'POST', body: { code } })
      setCreateOpen(false)
      await load()
      show(`Nomor loker ${code} berhasil ditambahkan.`)
    } catch (error) {
      show(errorMessage(error))
    } finally {
      setBusy(false)
    }
  }

  async function handleCreateBatch(prefix: string, startNum: number, endNum: number) {
    setBusy(true)
    try {
      const res = await api<BatchLockerResult>('/admin/lockers/batch', {
        method: 'POST',
        body: { prefix, startNum, endNum },
      })
      setCreateOpen(false)
      await load()
      const skippedMsg = res.skippedCodes.length ? ` (${res.skippedCodes.length} nomor dilewati karena sudah ada)` : ''
      show(`Berhasil membuat ${res.createdCount} unit loker baru${skippedMsg}.`)
    } catch (error) {
      show(errorMessage(error))
    } finally {
      setBusy(false)
    }
  }

  async function handleToggleStatus(id: string, active: boolean) {
    const locker = data?.lockers.find((l) => l.id === id)
    const label = locker?.code ?? 'loker'

    if (!active) {
      if (
        !(await confirm({
          title: `Tandai Loker ${label} dalam Perawatan?`,
          description: `Kompartemen ini akan dinonaktifkan sementara dan tidak dapat ditetapkan kepada member hingga diaktifkan kembali.`,
          confirmLabel: 'Tandai Perawatan',
          tone: 'primary',
        }))
      )
        return
    }

    setBusy(true)
    try {
      await api(`/admin/lockers/${id}/status`, {
        method: 'PATCH',
        body: { active },
      })
      await load()
      show(active ? `Loker ${label} berhasil diaktifkan kembali.` : `Loker ${label} ditandai dalam perawatan.`)
    } catch (error) {
      show(errorMessage(error))
    } finally {
      setBusy(false)
    }
  }

  async function handleAssign(customerId: string) {
    if (!selectedLocker) return
    setBusy(true)
    try {
      await api(`/admin/lockers/${selectedLocker}/assignment`, {
        method: 'PUT',
        body: { customerId },
      })
      setSelectedLocker(null)
      await Promise.all([load(), loadMembers('')])
      show('Loker berhasil ditetapkan kepada member.')
    } catch (error) {
      show(errorMessage(error))
    } finally {
      setBusy(false)
    }
  }

  async function handleRelease(id: string, label: string) {
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
      await Promise.all([load(), loadMembers('')])
      show('Penetapan loker dilepas. Riwayatnya tetap tersimpan.')
    } catch (error) {
      show(errorMessage(error))
    } finally {
      setBusy(false)
    }
  }

  const lockersList = data?.lockers ?? []
  const availableCount = lockersList.filter((l) => l.active && !l.customerId).length
  const assignedCount = lockersList.filter((l) => Boolean(l.customerId)).length
  const maintenanceCount = lockersList.filter((l) => !l.active).length

  const filteredLockers = lockersList.filter((row) => {
    if (filterTab === 'available' && (!row.active || Boolean(row.customerId))) return false
    if (filterTab === 'assigned' && !row.customerId) return false
    if (filterTab === 'maintenance' && row.active) return false
    if (lockerQuery.trim()) {
      const q = lockerQuery.toLowerCase()
      const matchCode = row.code.toLowerCase().includes(q)
      const matchName = row.customerName?.toLowerCase().includes(q) ?? false
      const matchEmail = row.customerEmail?.toLowerCase().includes(q) ?? false
      if (!matchCode && !matchName && !matchEmail) return false
    }
    return true
  })

  const targetLocker = lockersList.find((l) => l.id === selectedLocker)

  return (
    <section className="admin-workspace">
      <div className="admin-workspace-head" style={{ justifyContent: 'flex-end', marginBottom: '10px' }}>
        <button className="button button-primary" onClick={() => setCreateOpen(true)}>
          <Plus size={15} /> Tambah loker
        </button>
      </div>

      {data && !data.enabled && (
        <div className="panel studio-asset-note">
          Fitur loker sedang nonaktif. Aktifkan di tab Aturan studio sebelum menetapkan nomor.
        </div>
      )}

      <div className="admin-locker-matrix-section">
        <LockerKpiBanner lockers={lockersList} />

        <div className="admin-locker-toolbar">
          <div className="admin-locker-filter-pills">
            <button
              type="button"
              className={`admin-locker-filter-btn ${filterTab === 'all' ? 'active' : ''}`}
              onClick={() => setFilterTab('all')}
            >
              Semua ({lockersList.length})
            </button>
            <button
              type="button"
              className={`admin-locker-filter-btn ${filterTab === 'available' ? 'active' : ''}`}
              onClick={() => setFilterTab('available')}
            >
              Tersedia ({availableCount})
            </button>
            <button
              type="button"
              className={`admin-locker-filter-btn ${filterTab === 'assigned' ? 'active' : ''}`}
              onClick={() => setFilterTab('assigned')}
            >
              Terisi ({assignedCount})
            </button>
            <button
              type="button"
              className={`admin-locker-filter-btn ${filterTab === 'maintenance' ? 'active' : ''}`}
              onClick={() => setFilterTab('maintenance')}
            >
              Perawatan ({maintenanceCount})
            </button>
          </div>

          <div className="admin-locker-search-box">
            <Search size={14} style={{ color: 'var(--muted)', flexShrink: 0 }} />
            <input
              type="text"
              placeholder="Cari kode loker atau nama member..."
              value={lockerQuery}
              onChange={(e) => setLockerQuery(e.target.value)}
            />
          </div>
        </div>

        <div className="admin-entity-grid admin-locker-grid admin-locker-matrix-grid">
          {filteredLockers.map((row) => (
            <LockerCard
              key={row.id}
              locker={row}
              busy={busy}
              featureEnabled={Boolean(data?.enabled)}
              onAssign={(id) => {
                setSelectedLocker(id)
                void loadMembers('').catch((err) => show(errorMessage(err)))
              }}
              onRelease={(id, code) => void handleRelease(id, code)}
              onToggleStatus={(id, active) => void handleToggleStatus(id, active)}
            />
          ))}

          {data && !filteredLockers.length && (
            <div className="panel" style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '36px 20px' }}>
              <p style={{ margin: 0, color: 'var(--muted)' }}>
                {lockerQuery ? 'Tidak ada loker yang cocok dengan pencarian.' : 'Belum ada loker dalam kategori ini.'}
              </p>
            </div>
          )}
        </div>
      </div>

      <LockerCreateDialog
        open={createOpen}
        busy={busy}
        onClose={() => setCreateOpen(false)}
        onCreateSingle={handleCreateSingle}
        onCreateBatch={handleCreateBatch}
      />

      <LockerAssignDialog
        open={Boolean(selectedLocker)}
        lockerCode={targetLocker?.code ?? ''}
        members={members}
        busy={busy}
        onClose={() => setSelectedLocker(null)}
        onAssign={handleAssign}
        onSearch={(q) => void loadMembers(q).catch((err) => show(errorMessage(err)))}
      />
    </section>
  )
}
