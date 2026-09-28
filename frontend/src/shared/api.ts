const base = '/api/v1'

export class ApiError extends Error {
  readonly status: number
  constructor(message: string, status: number) {
    super(message)
    this.status = status
  }
}

async function csrfToken(): Promise<string> {
  const response = await fetch(`${base}/auth/csrf`, { credentials: 'same-origin' })
  if (!response.ok)
    throw new ApiError(
      'Tidak dapat memulai sesi. Periksa apakah backend berjalan.',
      response.status,
    )
  return ((await response.json()) as { token: string }).token
}

export async function api<T>(
  path: string,
  options: {
    method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
    body?: unknown
    headers?: Record<string, string>
  } = {},
): Promise<T> {
  const method = options.method ?? 'GET'
  const headers: Record<string, string> = { ...options.headers }
  if (method !== 'GET') headers['x-csrf-token'] = await csrfToken()
  if (options.body !== undefined && !(options.body instanceof FormData))
    headers['content-type'] = 'application/json'
  let response: Response
  try {
    response = await fetch(`${base}${path}`, {
      method,
      headers,
      credentials: 'same-origin',
      body:
        options.body === undefined
          ? undefined
          : options.body instanceof FormData
            ? options.body
            : JSON.stringify(options.body),
    })
  } catch {
    throw new ApiError('Backend tidak dapat dihubungi. Jalankan backend dan coba lagi.', 0)
  }
  if (response.status === 204) return undefined as T
  const result = (await response.json().catch(() => null)) as
    T | { message?: string | string[] } | null
  if (!response.ok) {
    const problem = result as { message?: string | string[] } | null
    const message = problem && typeof problem === 'object' ? problem.message : undefined
    throw new ApiError(
      Array.isArray(message)
        ? message.join(', ')
        : message || `Permintaan gagal (HTTP ${response.status}).`,
      response.status,
    )
  }
  return result as T
}

export type { Actor, AdminAccount } from './types/auth'
export type { Studio, Session } from './types/public'
export type { Packages, Membership, PackagePurchase } from './types/membership'
export type { BookingOptions, Booking, BookingCreated } from './types/booking'
export type { Payment, PaymentSettings } from './types/payments'
export type {
  Policy,
  AdminSession,
  AdminClassType,
  AdminPackageOption,
  AdminScheduleRule,
} from './types/catalog'
export type { HealthProfile } from './types/health'
export type {
  CoachSession,
  CoachParticipant,
  CoachParticipants,
  AdminParticipant,
  AttendanceCorrection,
  CheckInResult,
} from './types/attendance'
export type { LockerMine, AdminLocker, AdminLockers, EligibleMember } from './types/lockers'
export type { StudioContent, MediaAsset } from './types/content'
export type {
  SiteDocument,
  SiteDraft,
  SitePageKey,
  SiteSection,
  SiteSectionType,
  SiteItem,
  PublicClassType,
} from './types/site'
export type {
  PageResult,
  AdminBookingRecord,
  AdminPaymentRecord,
  AdminWalletRecord,
  AdminWalletEntry,
  AdminWalletLedger,
} from './types/finance'
