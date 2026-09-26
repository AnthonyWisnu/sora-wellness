export const money = (value: number) => `Rp${new Intl.NumberFormat('id-ID').format(value)}`

export const formatDate = (value: string, options: Intl.DateTimeFormatOptions = {}) =>
  new Intl.DateTimeFormat('id-ID', { timeZone: 'UTC', ...options }).format(
    new Date(`${value}T12:00:00Z`),
  )

export function localTime(iso: string, timezone: string) {
  return new Intl.DateTimeFormat('id-ID', {
    timeZone: timezone,
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  })
    .format(new Date(iso))
    .replace(':', '.')
}

export function localDateTime(iso: string, timezone: string) {
  return new Intl.DateTimeFormat('id-ID', {
    timeZone: timezone,
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(iso))
}

export function levelName(level: string) {
  return level === 'beginner' ? 'Pemula' : level === 'intermediate_1' ? 'Lanjutan 1' : 'Lanjutan 2'
}

export function statusName(status: string) {
  return (
    (
      {
        confirmed: 'Terkonfirmasi',
        pending_payment: 'Menunggu pembayaran',
        cancelled: 'Dibatalkan',
        expired: 'Kedaluwarsa',
      } as Record<string, string>
    )[status] ?? status
  )
}
