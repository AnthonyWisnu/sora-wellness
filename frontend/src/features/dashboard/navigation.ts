import type { Actor } from '../../shared/api'

export type DashboardRole = Actor['role']
export type DashboardItem = { id: string; label: string }
export type DashboardGroup = { label: string; items: DashboardItem[] }

export function getDashboardNavigation(actor: Actor): DashboardGroup[] {
  if (actor.role === 'superadmin') {
    return [
      { label: 'Menu Utama', items: [{ id: 'sessions', label: 'Ringkasan' }] },
      {
        label: 'Kelas & jadwal',
        items: [
          { id: 'manage', label: 'Kelola sesi' },
          { id: 'classes', label: 'Jenis kelas' },
          { id: 'rules', label: 'Jadwal berulang' },
          { id: 'attendance', label: 'Verifikasi tiket' },
        ],
      },
      {
        label: 'Operasional',
        items: [
          { id: 'events', label: 'Event Komunitas' },
          { id: 'accounts', label: 'Manajemen akun' },
          { id: 'packages', label: 'Paket member' },
          { id: 'lockers', label: 'Loker fisik' },
          { id: 'finance', label: 'Laporan keuangan' },
        ],
      },
      {
        label: 'Sistem & integrasi',
        items: [
          { id: 'policy', label: 'Aturan studio' },
          { id: 'content', label: 'Konten publik' },
          { id: 'payment', label: 'Gerbang Midtrans' },
        ],
      },
    ]
  }

  if (actor.role === 'admin' || actor.role === 'finance') {
    const perms = actor.permissions ?? []
    const activePerms =
      perms.length > 0
        ? perms
        : actor.role === 'finance'
          ? ['finance_reports', 'finance_payouts']
          : ['front_desk', 'lockers', 'classes_schedule', 'community_events']

    const groups: DashboardGroup[] = [
      { label: 'Menu Utama', items: [{ id: 'sessions', label: 'Ringkasan' }] },
    ]

    const frontDeskItems: DashboardItem[] = []
    if (activePerms.includes('front_desk')) frontDeskItems.push({ id: 'attendance', label: 'Verifikasi tiket' })
    if (activePerms.includes('lockers')) frontDeskItems.push({ id: 'lockers', label: 'Loker fisik' })
    if (frontDeskItems.length > 0) groups.push({ label: 'Meja depan', items: frontDeskItems })

    const classItems: DashboardItem[] = []
    if (activePerms.includes('classes_schedule')) {
      classItems.push(
        { id: 'manage', label: 'Kelola sesi' },
        { id: 'classes', label: 'Jenis kelas' },
        { id: 'rules', label: 'Jadwal berulang' },
        { id: 'packages', label: 'Paket member' },
      )
    }
    if (classItems.length > 0) groups.push({ label: 'Kelas & sesi', items: classItems })

    const opItems: DashboardItem[] = []
    if (activePerms.includes('community_events')) opItems.push({ id: 'events', label: 'Event Komunitas' })
    if (activePerms.includes('staff_management')) opItems.push({ id: 'accounts', label: 'Manajemen akun' })
    if (activePerms.includes('finance_reports') || activePerms.includes('finance_payouts')) {
      opItems.push({ id: 'finance', label: 'Laporan keuangan' })
    }
    if (opItems.length > 0) groups.push({ label: 'Operasional', items: opItems })

    const systemItems: DashboardItem[] = []
    if (activePerms.includes('studio_policy')) systemItems.push({ id: 'policy', label: 'Aturan studio' })
    if (activePerms.includes('studio_content')) systemItems.push({ id: 'content', label: 'Konten publik' })
    if (systemItems.length > 0) groups.push({ label: 'Pengaturan studio', items: systemItems })

    return groups
  }

  if (actor.role === 'coach') {
    return [
      {
        label: 'Ruang pelatih',
        items: [
          { id: 'overview', label: 'Ringkasan' },
          { id: 'attendance', label: 'Peserta & absensi' },
          { id: 'events', label: 'Event Komunitas' },
        ],
      },
    ]
  }

  return [
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
  ]
}

export const dashboardNavigation: Record<DashboardRole, DashboardGroup[]> = {
  superadmin: getDashboardNavigation({
    id: '',
    email: '',
    fullName: '',
    role: 'superadmin',
    passwordChangeRequired: false,
  }),
  finance: getDashboardNavigation({
    id: '',
    email: '',
    fullName: '',
    role: 'finance',
    permissions: ['finance_reports', 'finance_payouts'],
    passwordChangeRequired: false,
  }),
  admin: getDashboardNavigation({
    id: '',
    email: '',
    fullName: '',
    role: 'admin',
    permissions: ['front_desk', 'lockers', 'classes_schedule', 'community_events'],
    passwordChangeRequired: false,
  }),
  coach: getDashboardNavigation({
    id: '',
    email: '',
    fullName: '',
    role: 'coach',
    passwordChangeRequired: false,
  }),
  customer: getDashboardNavigation({
    id: '',
    email: '',
    fullName: '',
    role: 'customer',
    passwordChangeRequired: false,
  }),
}

export function resolveDashboardSection(actorOrRole: Actor | DashboardRole, path: string) {
  const requested = path.split('/')[2]
  const groups = typeof actorOrRole === 'string'
    ? dashboardNavigation[actorOrRole]
    : getDashboardNavigation(actorOrRole)
  const items = groups.flatMap((group) => group.items)
  return items.find((item) => item.id === requested)?.id ?? items[0]?.id ?? 'sessions'
}

export function dashboardTitle(actorOrRole: Actor | DashboardRole, section: string) {
  const groups = typeof actorOrRole === 'string'
    ? dashboardNavigation[actorOrRole]
    : getDashboardNavigation(actorOrRole)
  return groups.flatMap((group) => group.items).find((item) => item.id === section)?.label ?? 'Ringkasan'
}
