import type { Actor } from '../../shared/api'

export type DashboardRole = Actor['role']
export type DashboardItem = { id: string; label: string }
export type DashboardGroup = { label: string; items: DashboardItem[] }

export const dashboardNavigation: Record<DashboardRole, DashboardGroup[]> = {
  admin: [
    { label: 'Ikhtisar', items: [{ id: 'sessions', label: 'Ringkasan' }] },
    {
      label: 'Kelas & jadwal',
      items: [
        { id: 'manage', label: 'Kelola sesi' },
        { id: 'classes', label: 'Jenis kelas' },
        { id: 'rules', label: 'Jadwal berulang' },
        { id: 'attendance', label: 'Absensi' },
      ],
    },
    {
      label: 'Operasional',
      items: [
        { id: 'accounts', label: 'Akun' },
        { id: 'packages', label: 'Paket' },
        { id: 'lockers', label: 'Loker' },
        { id: 'finance', label: 'Transaksi' },
      ],
    },
    {
      label: 'Pengaturan',
      items: [
        { id: 'policy', label: 'Aturan studio' },
        { id: 'content', label: 'Konten publik' },
        { id: 'payment', label: 'Midtrans' },
      ],
    },
  ],
  coach: [
    {
      label: 'Ruang pelatih',
      items: [
        { id: 'overview', label: 'Ringkasan' },
        { id: 'attendance', label: 'Peserta & absensi' },
      ],
    },
  ],
  customer: [
    {
      label: 'Akun saya',
      items: [
        { id: 'overview', label: 'Ringkasan' },
        { id: 'bookings', label: 'Booking' },
        { id: 'membership', label: 'Paket & pembayaran' },
        { id: 'wallet', label: 'Saldo & loker' },
        { id: 'profile', label: 'Profil & kesehatan' },
      ],
    },
  ],
}

export function resolveDashboardSection(role: DashboardRole, path: string) {
  const requested = path.split('/')[2]
  const items = dashboardNavigation[role].flatMap((group) => group.items)
  return items.find((item) => item.id === requested)?.id ?? items[0].id
}

export function dashboardTitle(role: DashboardRole, section: string) {
  return (
    dashboardNavigation[role].flatMap((group) => group.items).find((item) => item.id === section)
      ?.label ?? 'Ringkasan'
  )
}
