import type {
  Packages,
  PublicClassType,
  Session,
  SiteDocument,
  SitePageKey,
} from '../../shared/api'

export type SiteBlockContext = {
  page: SitePageKey
  site: SiteDocument
  sessions: Session[]
  visibleSessions: Session[]
  packages: Packages | null
  classTypes: PublicClassType[]
  timezone: string
  category: string
  setCategory: (value: string) => void
  member: boolean
  guestDays: number
  memberDays: number
  busy: boolean
  go: (path: string) => void
  openBooking: (session: Session) => void
  buyPackage: (id: string) => void
}
