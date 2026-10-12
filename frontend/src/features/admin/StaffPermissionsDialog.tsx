import { useState } from 'react'
import { Check, ShieldCheck, X } from 'lucide-react'
import { api } from '../../shared/api'
import type { AdminAccount } from '../../shared/types/auth'

type Props = {
  account: AdminAccount | null
  onClose: () => void
  onSaved: () => void
  show: (message: string) => void
}

type PermissionItem = {
  key: string
  label: string
  desc: string
}

const ALL_PERMISSIONS: PermissionItem[] = [
  { key: 'front_desk', label: 'Verifikasi Tiket Lobi', desc: 'Memvalidasi e-ticket QR kedatangan peserta di meja depan' },
  { key: 'lockers', label: 'Matriks Loker Fisik', desc: 'Melihat status dan menetapkan loker fisik member studio' },
  { key: 'classes_schedule', label: 'Kelola Kelas & Jadwal', desc: 'Mengatur sesi kelas, kategori kelas, jadwal rutin, dan paket' },
  { key: 'community_events', label: 'Event Komunitas', desc: 'Mengelola jadwal event luar studio, brosur, dan pendaftar' },
  { key: 'studio_content', label: 'Konten Situs Publik', desc: 'Mengubah teks, galeri foto, dan tata letak landing page' },
  { key: 'studio_policy', label: 'Aturan Kebijakan Studio', desc: 'Mengatur batas pembatalan, kuota, dan durasi hold kursi' },
  { key: 'finance_reports', label: 'Laporan Keuangan', desc: 'Melihat omzet riil, mutasi saldo, dan ekspor rekonsiliasi CSV' },
  { key: 'finance_payouts', label: 'Persetujuan Payout', desc: 'Memverifikasi dan memproses transfer penarikan dana member' },
  { key: 'staff_management', label: 'Manajemen Akun Staf', desc: 'Mendaftarkan staf baru dan mereset kata sandi sementara' },
]

export function StaffPermissionsDialog({ account, onClose, onSaved, show }: Props) {
  const [selected, setSelected] = useState<string[]>(account?.permissions ?? [])
  const [saving, setSaving] = useState(false)

  if (!account) return null

  function toggle(key: string) {
    setSelected((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key],
    )
  }

  function applyPreset(preset: 'reception' | 'schedule' | 'finance' | 'manager') {
    if (preset === 'reception') setSelected(['front_desk', 'lockers'])
    if (preset === 'schedule') setSelected(['classes_schedule', 'community_events'])
    if (preset === 'finance') setSelected(['finance_reports', 'finance_payouts'])
    if (preset === 'manager') setSelected(ALL_PERMISSIONS.map((p) => p.key))
  }

  async function handleSave() {
    setSaving(true)
    try {
      await api(`/admin/staff/${account!.id}/permissions`, {
        method: 'PATCH',
        body: JSON.stringify({ permissions: selected }),
      })
      show('Hak akses staf berhasil diperbarui.')
      onSaved()
      onClose()
    } catch (err) {
      show(err instanceof Error ? err.message : 'Gagal menyimpan hak akses staf.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true">
      <div className="modal-card permissions-dialog-card">
        <div className="modal-head">
          <div className="modal-title-wrap">
            <ShieldCheck size={20} className="modal-icon" />
            <div>
              <h3>Hak Akses: {account.fullName}</h3>
              <p className="modal-subtitle">{account.email} · Peran {account.role.toUpperCase()}</p>
            </div>
          </div>
          <button className="icon-button" onClick={onClose} aria-label="Tutup dialog">
            <X size={18} />
          </button>
        </div>

        <div className="preset-bar">
          <span className="preset-label">Preset Cepat:</span>
          <button type="button" className="chip-button" onClick={() => applyPreset('reception')}>
            Resepsionis Lobi
          </button>
          <button type="button" className="chip-button" onClick={() => applyPreset('schedule')}>
            Koordinator Kelas
          </button>
          <button type="button" className="chip-button" onClick={() => applyPreset('finance')}>
            Staf Keuangan
          </button>
          <button type="button" className="chip-button chip-primary" onClick={() => applyPreset('manager')}>
            Manajer Umum
          </button>
        </div>

        <div className="permissions-grid">
          {ALL_PERMISSIONS.map((p) => {
            const active = selected.includes(p.key)
            return (
              <label
                key={p.key}
                className={`permission-toggle-item${active ? ' is-active' : ''}`}
                onClick={(e) => {
                  e.preventDefault()
                  toggle(p.key)
                }}
              >
                <div className={`switch-checkbox${active ? ' is-checked' : ''}`}>
                  {active && <Check size={14} />}
                </div>
                <div className="perm-info">
                  <strong>{p.label}</strong>
                  <small>{p.desc}</small>
                </div>
              </label>
            )
          })}
        </div>

        <div className="modal-footer">
          <button type="button" className="button button-outline" onClick={onClose} disabled={saving}>
            Batal
          </button>
          <button type="button" className="button button-primary" onClick={handleSave} disabled={saving}>
            {saving ? 'Menyimpan...' : 'Simpan Hak Akses'}
          </button>
        </div>
      </div>
    </div>
  )
}
