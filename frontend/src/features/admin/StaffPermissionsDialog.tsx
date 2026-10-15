import { useEffect, useState } from 'react'
import { Check } from 'lucide-react'
import { api } from '../../shared/api'
import type { AdminAccount } from '../../shared/types/auth'
import { AdminDialog } from './AdminDialog'

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
  const [activePreset, setActivePreset] = useState<'reception' | 'schedule' | 'finance' | 'manager' | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const perms = account?.permissions ?? []
    setSelected(perms)
    if (perms.length === ALL_PERMISSIONS.length && ALL_PERMISSIONS.every((p) => perms.includes(p.key))) {
      setActivePreset('manager')
    } else {
      setActivePreset(null)
    }
  }, [account?.id, account?.permissions])

  if (!account) return null

  const PRESET_MAP: Record<'reception' | 'schedule' | 'finance' | 'manager', string[]> = {
    reception: ['front_desk', 'lockers'],
    schedule: ['classes_schedule', 'community_events'],
    finance: ['finance_reports', 'finance_payouts'],
    manager: ALL_PERMISSIONS.map((p) => p.key),
  }

  function toggle(key: string) {
    setActivePreset(null)
    setSelected((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key],
    )
  }

  function applyPreset(preset: 'reception' | 'schedule' | 'finance' | 'manager') {
    setActivePreset(preset)
    setSelected(PRESET_MAP[preset])
  }

  function isPresetActive(preset: 'reception' | 'schedule' | 'finance' | 'manager'): boolean {
    if (activePreset === preset) return true
    const target = PRESET_MAP[preset]
    return selected.length === target.length && target.every((k) => selected.includes(k))
  }

  async function handleSave() {
    setSaving(true)
    try {
      await api(`/admin/staff/${account!.id}/permissions`, {
        method: 'PATCH',
        body: { permissions: selected },
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
    <AdminDialog
      open={Boolean(account)}
      title={`Hak Akses: ${account.fullName}`}
      description={`${account.email} · Peran ${account.role.toUpperCase()}`}
      onClose={onClose}
      wide
    >
      <div className="preset-bar">
        <span className="preset-label">Preset Cepat:</span>
        <button
          type="button"
          className={`chip-button ${isPresetActive('reception') ? 'chip-primary' : ''}`}
          onClick={() => applyPreset('reception')}
        >
          Resepsionis Lobi
        </button>
        <button
          type="button"
          className={`chip-button ${isPresetActive('schedule') ? 'chip-primary' : ''}`}
          onClick={() => applyPreset('schedule')}
        >
          Koordinator Kelas
        </button>
        <button
          type="button"
          className={`chip-button ${isPresetActive('finance') ? 'chip-primary' : ''}`}
          onClick={() => applyPreset('finance')}
        >
          Staf Keuangan
        </button>
        <button
          type="button"
          className={`chip-button ${isPresetActive('manager') ? 'chip-primary' : ''}`}
          onClick={() => applyPreset('manager')}
        >
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

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', borderTop: '1px solid #e7e3da', paddingTop: '16px' }}>
        <button type="button" className="button button-outline" onClick={onClose} disabled={saving}>
          Batal
        </button>
        <button type="button" className="button button-primary" onClick={handleSave} disabled={saving}>
          {saving ? 'Menyimpan...' : 'Simpan Hak Akses'}
        </button>
      </div>
    </AdminDialog>
  )
}
