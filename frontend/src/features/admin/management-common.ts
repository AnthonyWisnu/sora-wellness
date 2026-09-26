import { api, type AdminAccount, type AdminClassType } from '../../shared/api'

export type PanelProps = { show: (text: string) => void }
export type Coach = Pick<AdminAccount, 'id' | 'fullName' | 'email'>
export type ClassForm = {
  title: string
  category: string
  level: AdminClassType['level']
  description: string
  durationMinutes: number
  defaultCapacity: number
  defaultPriceIdr: number
}
export type SessionForm = {
  classTypeId: string
  coachId: string
  localDate: string
  localStartTime: string
  capacity: number
  priceIdr: number
}
export type RuleForm = SessionForm & { isoWeekday: number; startsOn: string; endsOn: string }

export const weekdays = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu']
export const levelLabel: Record<AdminClassType['level'], string> = {
  beginner: 'Pemula',
  intermediate_1: 'Lanjutan 1',
  intermediate_2: 'Lanjutan 2',
}
export const blankClass: ClassForm = {
  title: '',
  category: '',
  level: 'beginner',
  description: '',
  durationMinutes: 60,
  defaultCapacity: 12,
  defaultPriceIdr: 0,
}
export function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'Permintaan gagal.'
}
export function studioToday(timezone: string) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date())
}
export function studioTime(iso: string, timezone: string) {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: timezone,
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(new Date(iso))
  return `${parts.find((part) => part.type === 'hour')?.value ?? '00'}:${parts.find((part) => part.type === 'minute')?.value ?? '00'}`
}
export async function referenceData(): Promise<[AdminClassType[], Coach[]]> {
  const classes = await api<AdminClassType[]>('/admin/class-types')
  const coaches: Coach[] = []
  for (let page = 1; ; page++) {
    const batch = await api<Coach[]>(`/admin/accounts?role=coach&limit=100&page=${page}`)
    coaches.push(...batch)
    if (batch.length < 100) break
  }
  return [classes, coaches]
}
