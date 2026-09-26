const stateLabel: Record<string, string> = {
  confirmed: 'Terkonfirmasi',
  pending_payment: 'Menunggu pembayaran',
  cancelled: 'Dibatalkan',
  expired: 'Kedaluwarsa',
  success: 'Berhasil',
  pending: 'Menunggu',
  failed: 'Gagal',
}
export const sourceLabel: Record<string, string> = {
  quota: 'Jatah member',
  single: 'Satuan',
  free: 'Gratis',
}
export const kindLabel: Record<string, string> = {
  class_refund: 'Pengembalian kelas',
  late_payment: 'Pembayaran terlambat',
  class_purchase: 'Pembelian kelas',
  reservation_release: 'Pelepasan saldo tertahan',
  correction: 'Koreksi',
}
export function label(value: string | null) {
  return value ? (stateLabel[value] ?? value) : '—'
}
export function dateTime(value: string, timezone: string) {
  return new Intl.DateTimeFormat('id-ID', {
    timeZone: timezone,
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value))
}
