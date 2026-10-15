import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { Plus, RotateCcw, ShieldCheck } from 'lucide-react'
import { api, type AdminAccount } from '../../shared/api'
import { type PanelProps, errorMessage } from './management-common'
import { AdminDialog } from './AdminDialog'
import { StaffPermissionsDialog } from './StaffPermissionsDialog'

function randomPassword() {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%'
  const bytes = crypto.getRandomValues(new Uint8Array(24))
  return Array.from(bytes, (byte) => alphabet[byte % alphabet.length]).join('')
}

export function AdminAccountsPanel({ show }: PanelProps) {
  const [search, setSearch] = useState('')
  const [query, setQuery] = useState('')
  const [role, setRole] = useState('')
  const [page, setPage] = useState(1)
  const [rows, setRows] = useState<AdminAccount[]>([])
  const [staff, setStaff] = useState<{
    fullName: string
    email: string
    role: 'coach' | 'admin' | 'superadmin'
  }>({
    fullName: '',
    email: '',
    role: 'coach',
  })
  const [resetTarget, setResetTarget] = useState<AdminAccount | null>(null)
  const [verificationNote, setVerificationNote] = useState('')
  const [credential, setCredential] = useState<{ email: string; password: string } | null>(null)
  const [permissionsTarget, setPermissionsTarget] = useState<AdminAccount | null>(null)
  const [staffOpen, setStaffOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const load = useCallback(
    async () =>
      setRows(
        await api<AdminAccount[]>(
          `/admin/accounts?limit=20&page=${page}&q=${encodeURIComponent(query)}${role ? `&role=${role}` : ''}`,
        ),
      ),
    [page, query, role],
  )
  useEffect(() => {
    void load().catch((error) => show(errorMessage(error)))
  }, [load, show])
  async function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setBusy(true)
    setCredential(null)
    const password = randomPassword()
    try {
      await api('/admin/staff', {
        method: 'POST',
        body: { ...staff, fullName: staff.fullName.trim(), email: staff.email.trim(), password },
      })
      setCredential({ email: staff.email.trim(), password })
      setStaffOpen(false)
      setStaff({ fullName: '', email: '', role: 'coach' })
      setPage(1)
      await load()
      show('Akun staf dibuat. Sampaikan kata sandi sementara secara langsung.')
    } catch (error) {
      show(errorMessage(error))
    } finally {
      setBusy(false)
    }
  }
  async function reset(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!resetTarget) return
    setBusy(true)
    setCredential(null)
    try {
      const result = await api<{ temporaryPassword: string }>(
        `/admin/accounts/${resetTarget.id}/reset-password`,
        { method: 'POST', body: { verificationNote: verificationNote.trim() } },
      )
      setCredential({ email: resetTarget.email, password: result.temporaryPassword })
      setResetTarget(null)
      setVerificationNote('')
      await load()
      show('Kata sandi direset dan sesi lama dicabut.')
    } catch (error) {
      show(errorMessage(error))
    } finally {
      setBusy(false)
    }
  }
  return (
    <section className="admin-workspace">
      <div className="admin-workspace-head" style={{ justifyContent: 'flex-end', marginBottom: '14px' }}>
        <button className="button button-primary" onClick={() => setStaffOpen(true)}>
          <Plus size={15} /> Buat akun staf
        </button>
      </div>
      <div className="panel admin-account-search">
        <form
          className="admin-account-filters"
          onSubmit={(event) => {
            event.preventDefault()
            setPage(1)
            setQuery(search.trim())
          }}
        >
          <label>
            Nama atau email
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Cari nama atau email"
            />
          </label>
          <label>
            Peran
            <select
              value={role}
              onChange={(event) => {
                setRole(event.target.value)
                setPage(1)
              }}
            >
              <option value="">Semua peran</option>
              <option value="superadmin">Superadmin</option>
              <option value="admin">Staf Admin</option>
              <option value="coach">Pelatih</option>
              <option value="customer">Pelanggan</option>
            </select>
          </label>
          <button className="button button-outline">Cari akun</button>
        </form>
        <span className="admin-results-count">{rows.length} akun di halaman ini</span>
      </div>
      {credential && (
        <AdminDialog
          open
          title="Kata sandi sementara"
          description={`Untuk ${credential.email}. Sampaikan langsung kepada pemilik akun; kata sandi tidak dapat ditampilkan lagi setelah ditutup.`}
          onClose={() => setCredential(null)}
        >
          <div className="admin-secret" role="status">
            <strong>Kata sandi sementara untuk {credential.email}</strong>
            <code>{credential.password}</code>
            <p>
              Tampilkan sekali kepada pemilik akun. Salin atau sampaikan sekarang; setelah ditutup
              tidak dapat dilihat lagi. Pengguna wajib menggantinya saat masuk.
            </p>
            <button className="button button-outline" onClick={() => setCredential(null)}>
              Sudah disampaikan · tutup
            </button>
          </div>
        </AdminDialog>
      )}
      <div className="panel admin-account-table-wrap">
        <table className="admin-account-table">
          <thead>
            <tr>
              <th>Akun</th>
              <th>Peran</th>
              <th>Status akses</th>
              <th>Aksi</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id}>
                <td>
                  <strong>{row.fullName}</strong>
                  <small>{row.email}</small>
                </td>
                <td>
                  <span className="admin-role-tag">
                    {row.role === 'superadmin'
                      ? 'Superadmin'
                      : row.role === 'customer'
                        ? 'Pelanggan'
                        : row.role === 'coach'
                          ? 'Pelatih'
                          : 'Staf Admin'}
                  </span>
                  {row.role === 'admin' && row.permissions && row.permissions.length > 0 && (
                    <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginTop: '4px' }}>
                      {row.permissions.includes('finance_reports') && (
                        <span style={{ fontSize: '10px', padding: '1px 6px', background: '#eef2ff', color: '#3730a3', borderRadius: '4px', fontWeight: 600 }}>Keuangan</span>
                      )}
                      {row.permissions.includes('front_desk') && (
                        <span style={{ fontSize: '10px', padding: '1px 6px', background: '#ecfdf5', color: '#065f46', borderRadius: '4px', fontWeight: 600 }}>Meja Depan</span>
                      )}
                      {row.permissions.includes('classes_schedule') && (
                        <span style={{ fontSize: '10px', padding: '1px 6px', background: '#fef3c7', color: '#92400e', borderRadius: '4px', fontWeight: 600 }}>Jadwal Kelas</span>
                      )}
                      {row.permissions.includes('community_events') && (
                        <span style={{ fontSize: '10px', padding: '1px 6px', background: '#f5f3ff', color: '#5b21b6', borderRadius: '4px', fontWeight: 600 }}>Event Komunitas</span>
                      )}
                    </div>
                  )}
                </td>
                <td>{row.passwordChangeRequired ? 'Perlu ganti kata sandi' : 'Aktif'}</td>
                <td style={{ display: 'flex', gap: '6px' }}>
                  {(row.role === 'admin' || row.role === 'finance') && (
                    <button
                      className="button button-outline"
                      onClick={() => setPermissionsTarget(row)}
                    >
                      <ShieldCheck size={14} /> Atur Izin
                    </button>
                  )}
                  <button
                    className="button button-outline"
                    onClick={() => {
                      setResetTarget(row)
                      setVerificationNote('')
                      setCredential(null)
                    }}
                  >
                    <RotateCcw size={14} /> Reset sandi
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!rows.length && (
          <div className="admin-empty-state">Tidak ada akun pada pencarian ini.</div>
        )}
        <div className="admin-pagination">
          <button
            className="button button-outline"
            disabled={page === 1}
            onClick={() => setPage(page - 1)}
          >
            Sebelumnya
          </button>
          <span>Halaman {page}</span>
          <button
            className="button button-outline"
            disabled={rows.length < 20}
            onClick={() => setPage(page + 1)}
          >
            Berikutnya
          </button>
        </div>
      </div>
      <AdminDialog
        open={staffOpen}
        title="Buat akun staf"
        description="Sandi sementara dibuat acak dan hanya muncul setelah akun berhasil dibuat."
        onClose={() => setStaffOpen(false)}
      >
        <form className="live-form admin-dialog-form" onSubmit={(event) => void create(event)}>
          <label>
            Nama lengkap
            <input
              required
              minLength={2}
              maxLength={100}
              value={staff.fullName}
              onChange={(event) => setStaff({ ...staff, fullName: event.target.value })}
            />
          </label>
          <label>
            Email
            <input
              required
              type="email"
              value={staff.email}
              onChange={(event) => setStaff({ ...staff, email: event.target.value })}
            />
          </label>
          <label>
            Peran
            <select
              value={staff.role}
              onChange={(event) =>
                setStaff({
                  ...staff,
                  role: event.target.value as 'coach' | 'admin' | 'superadmin',
                })
              }
            >
              <option value="coach">Pelatih</option>
              <option value="admin">Staf Admin</option>
              <option value="superadmin">Superadmin</option>
            </select>
          </label>
          <button className="button button-primary" disabled={busy}>
            <Plus size={15} /> Buat staf
          </button>
        </form>
      </AdminDialog>
      <AdminDialog
        open={Boolean(resetTarget)}
        title={`Reset sandi${resetTarget ? ` · ${resetTarget.fullName}` : ''}`}
        description={
          resetTarget
            ? resetTarget.role === 'customer'
              ? 'Pastikan pelanggan menunjukkan akses ke inbox email akun di hadapan admin. Jangan simpan salinan identitas.'
              : 'Kenali pelatih atau admin sebagai staf sebelum reset. Jangan simpan salinan identitas.'
            : undefined
        }
        onClose={() => {
          setResetTarget(null)
          setVerificationNote('')
        }}
      >
        {resetTarget && (
          <form className="live-form admin-dialog-form" onSubmit={(event) => void reset(event)}>
            <label>
              Catatan verifikasi
              <input
                required
                minLength={8}
                maxLength={500}
                value={verificationNote}
                onChange={(event) => setVerificationNote(event.target.value)}
                placeholder="Cara identitas diverifikasi langsung"
              />
            </label>
            <div className="admin-form-actions">
              <button className="button button-primary" disabled={busy}>
                Reset dan cabut sesi
              </button>
              <button
                className="button button-text"
                type="button"
                onClick={() => {
                  setResetTarget(null)
                  setVerificationNote('')
                }}
              >
                Batal
              </button>
            </div>
          </form>
        )}
      </AdminDialog>
      {permissionsTarget && (
        <StaffPermissionsDialog
          account={permissionsTarget}
          onClose={() => setPermissionsTarget(null)}
          onSaved={() => void load()}
          show={show}
        />
      )}
    </section>
  )
}
