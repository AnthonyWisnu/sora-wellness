import { useEffect, type Dispatch, type SetStateAction } from 'react'
import { ArrowRight, UserRound } from 'lucide-react'
import type {
  Actor,
  Booking,
  Membership,
  PackagePurchase,
  Packages,
  Payment,
  Studio,
  SiteDocument,
} from '../shared/api'
import { CustomerDashboard } from '../features/customer/Dashboard'
import { AdminDashboard } from '../features/admin/Dashboard'
import { CoachDashboard } from '../features/coach/Dashboard'
import { DashboardShell } from '../features/dashboard/DashboardShell'
import { resolveDashboardSection, dashboardTitle } from '../features/dashboard/navigation'
import type { AdminTab } from '../features/admin/admin-types'

type Props = {
  authReady: boolean
  path: string
  actor: Actor | null
  mustChangePassword: boolean
  member: boolean
  quota: Membership['quota'][number] | undefined
  balance: number
  bookings: Booking[]
  payments: Payment[]
  purchases: PackagePurchase[]
  timezone: string
  busy: boolean
  go: (path: string) => void
  logout: () => void
  paymentAction: (id: string, refresh: boolean) => void
  cancelBooking: (id: string) => void
  setPaymentLink: (url: string) => void
  refreshPackage: (id: string) => void
  show: (message: string) => void
  setActor: Dispatch<SetStateAction<Actor | null>>
  loadSessions: () => Promise<void>
  setPackages: Dispatch<SetStateAction<Packages | null>>
  setStudio: Dispatch<SetStateAction<Studio | null>>
  setSite: Dispatch<SetStateAction<SiteDocument | null>>
}
export function DashboardPage({
  authReady,
  path,
  actor,
  mustChangePassword,
  member,
  quota,
  balance,
  bookings,
  payments,
  purchases,
  timezone,
  busy,
  go,
  logout,
  paymentAction,
  cancelBooking,
  setPaymentLink,
  refreshPackage,
  show,
  setActor,
  loadSessions,
  setPackages,
  setStudio,
  setSite,
}: Props) {
  const section = actor ? resolveDashboardSection(actor.role, path) : 'overview'
  useEffect(() => {
    if (actor && path !== `/dashboard/${section}`) go(`/dashboard/${section}`)
  }, [actor, path, section, go])

  if (actor && authReady && !mustChangePassword) {
    return (
      <DashboardShell actor={actor} member={member} section={section} go={go} logout={logout}>
        <div className="dashboard-page-head">
          <div>
            <span className="eyebrow">
              RUANG{' '}
              {actor.role === 'admin'
                ? 'ADMIN'
                : actor.role === 'coach'
                  ? 'PELATIH'
                  : member
                    ? 'MEMBER'
                    : 'PELANGGAN'}
            </span>
            <h1>{dashboardTitle(actor.role, section)}</h1>
            <p>Selamat datang, {actor.fullName.split(' ')[0]}.</p>
          </div>
        </div>
        {actor.role === 'customer' && (
          <CustomerDashboard
            section={section}
            actor={actor}
            member={member}
            quota={quota}
            balance={balance}
            bookings={bookings}
            payments={payments}
            purchases={purchases}
            timezone={timezone}
            busy={busy}
            go={go}
            paymentAction={paymentAction}
            cancelBooking={cancelBooking}
            setPaymentLink={setPaymentLink}
            refreshPackage={refreshPackage}
            show={show}
            onNameChanged={(fullName) =>
              setActor((current) => (current ? { ...current, fullName } : current))
            }
          />
        )}
        {actor.role === 'admin' && (
          <AdminDashboard
            adminTab={section as AdminTab}
            timezone={timezone}
            show={show}
            loadSessions={loadSessions}
            setPackages={setPackages}
            setStudio={setStudio}
            setSite={setSite}
          />
        )}
        {actor.role === 'coach' && (
          <CoachDashboard section={section} timezone={timezone} show={show} go={go} />
        )}
      </DashboardShell>
    )
  }
  return (
    <main className="page-main shell live-dashboard">
      {!authReady ? (
        <p>Memuat akun...</p>
      ) : !actor ? (
        <div className="empty-state">
          <UserRound size={30} />
          <h2>Masuk untuk membuka dashboard</h2>
          <button className="button button-primary" onClick={() => go('/masuk')}>
            Masuk <ArrowRight size={16} />
          </button>
        </div>
      ) : mustChangePassword ? (
        <div className="empty-state">
          <h2>Ganti kata sandi dahulu</h2>
          <button className="button button-primary" onClick={() => go('/ganti-sandi')}>
            Ganti kata sandi
          </button>
        </div>
      ) : null}
    </main>
  )
}
