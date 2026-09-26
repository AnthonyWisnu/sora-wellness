import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { X } from 'lucide-react'
import {
  api,
  type Packages,
  type Session,
  type Studio,
  type SiteDocument,
  type PublicClassType,
} from '../shared/api'
import { SitePage } from '../features/public/SitePage'
import { SiteFooter } from '../features/public/SiteFooter'
import { LoginPage } from '../features/auth/LoginPage'
import { ChangePasswordPage } from '../features/auth/ChangePasswordPage'
import { BookingModal } from '../features/booking/BookingModal'
import { PaymentModal } from '../features/booking/PaymentModal'
import { useCustomerData } from '../features/customer/useCustomerData'
import { useAuth } from '../features/auth/useAuth'
import { useBooking } from '../features/booking/useBooking'
import { useMembershipPurchase } from '../features/customer/useMembershipPurchase'
import { SiteHeader } from './SiteHeader'
import { DashboardPage } from './DashboardPage'
import '../styles'
import './LiveApp.css'
import '../features/public/StitchPublic.css'

function localToday(timezone: string) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date())
}
function message(error: unknown) {
  return error instanceof Error ? error.message : 'Terjadi kesalahan. Coba lagi.'
}

export default function LiveApp() {
  const [path, setPath] = useState(window.location.pathname)
  const [studio, setStudio] = useState<Studio | null>(null)
  const [site, setSite] = useState<SiteDocument | null>(null)
  const [classTypes, setClassTypes] = useState<PublicClassType[]>([])
  const [packages, setPackages] = useState<Packages | null>(null)
  const [sessions, setSessions] = useState<Session[]>([])
  const [siteStatus, setSiteStatus] = useState<'loading' | 'ready' | 'error'>('loading')
  const [packagesStatus, setPackagesStatus] = useState<'loading' | 'ready' | 'error'>('loading')
  const [sessionsStatus, setSessionsStatus] = useState<'loading' | 'ready' | 'error'>('loading')
  const sessionRequest = useRef(0)
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState('')
  const [category, setCategory] = useState('Semua')

  const go = (next: string) => {
    const preview = new URLSearchParams(window.location.search).has('preview')
    window.history.pushState({}, '', preview ? `${next}?preview=1` : next)
    setPath(next)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }
  const show = useCallback((text: string) => setNotice(text), [])
  const { membership, purchases, bookings, payments, balance, loadCustomer, resetCustomer } =
    useCustomerData()
  const {
    actor,
    setActor,
    authReady,
    mustChangePassword,
    authMode,
    setAuthMode,
    authenticate,
    changePassword,
    logout,
  } = useAuth({ go, show, setBusy, resetCustomer })
  const timezone = studio?.timezone ?? 'Asia/Makassar'
  const today = localToday(timezone)
  const member = Boolean(
    actor?.role === 'customer' &&
    membership?.ranges.some((range) => range.starts_on <= today && range.ends_on >= today),
  )
  const quota = membership?.quota.find((row) => row.month === today.slice(0, 7))
  const visibleSessions = useMemo(
    () => sessions.filter((row) => category === 'Semua' || row.category === category),
    [sessions, category],
  )

  const loadSessions = useCallback(async () => {
    const request = ++sessionRequest.current
    setSessionsStatus('loading')
    try {
      const all: Session[] = []
      for (let page = 1; ; page++) {
        const batch = await api<Session[]>(`/public/sessions?limit=100&page=${page}`)
        if (request !== sessionRequest.current) return
        all.push(...batch)
        if (batch.length < 100) break
      }
      setSessions(all)
      setSessionsStatus('ready')
    } catch (error) {
      if (request !== sessionRequest.current) return
      setSessionsStatus('error')
      throw error
    }
  }, [])
  const loadPackages = useCallback(async () => {
    setPackagesStatus('loading')
    try {
      setPackages(await api<Packages>('/public/packages'))
      setPackagesStatus('ready')
    } catch (error) {
      setPackagesStatus('error')
      throw error
    }
  }, [])
  const {
    selected,
    setSelected,
    options,
    choice,
    setChoice,
    useBalance,
    setUseBalance,
    paymentLink,
    setPaymentLink,
    openBooking,
    createBooking,
    cancelBooking,
    paymentAction,
  } = useBooking({ actor, go, show, setBusy, loadSessions, loadCustomer })
  const { buyPackage, refreshPackage } = useMembershipPurchase({
    actor,
    go,
    show,
    setBusy,
    loadCustomer,
    loadSessions,
    setPaymentLink,
  })

  useEffect(() => {
    const pop = () => setPath(window.location.pathname)
    window.addEventListener('popstate', pop)
    return () => window.removeEventListener('popstate', pop)
  }, [])
  useEffect(() => {
    if (!notice) return
    const timer = window.setTimeout(() => setNotice(''), 5500)
    return () => window.clearTimeout(timer)
  }, [notice])
  useEffect(() => {
    let active = true
    const preview = new URLSearchParams(window.location.search).has('preview')
    void api<Studio>('/public/studio')
      .then((value) => {
        if (active) setStudio(value)
      })
      .catch((error) => {
        if (active) show(message(error))
      })
    void loadPackages().catch((error) => {
      if (active) show(message(error))
    })
    void api<PublicClassType[]>('/public/class-types')
      .then((value) => {
        if (active) setClassTypes(value)
      })
      .catch((error) => {
        if (active) show(message(error))
      })
    void api<SiteDocument>(preview ? '/admin/site/preview' : '/public/site')
      .then((value) => {
        if (active) {
          setSite(value)
          setSiteStatus('ready')
        }
      })
      .catch((error) => {
        if (active) {
          setSiteStatus('error')
          show(message(error))
        }
      })
    return () => {
      active = false
    }
  }, [show, loadPackages])
  useEffect(() => {
    void loadSessions().catch((error) => show(message(error)))
  }, [actor, loadSessions, show])
  useEffect(() => {
    if (!actor || mustChangePassword) return
    if (actor.role === 'customer') void loadCustomer().catch((error) => show(message(error)))
  }, [actor, mustChangePassword, loadCustomer, show])

  const brand = studio?.name ?? 'Wellness Studio'
  const primaryName = brand.split(' ')[0].toUpperCase()
  const guestDays = studio?.guestScheduleDays ?? 7
  const memberDays = studio?.memberScheduleDays ?? 30

  return (
    <>
      {!path.startsWith('/dashboard') && (
        <SiteHeader studio={studio} primaryName={primaryName} path={path} actor={actor} go={go} />
      )}
      {new URLSearchParams(window.location.search).has('preview') && (
        <div className="site-preview-banner">
          PRATINJAU DRAF — hanya admin yang dapat melihat halaman ini
        </div>
      )}
      {site &&
        (path === '/' || path === '/jadwal' || path === '/membership' || path === '/kontak') && (
          <SitePage
            ctx={{
              page:
                path === '/'
                  ? 'home'
                  : path === '/jadwal'
                    ? 'schedule'
                    : path === '/membership'
                      ? 'membership'
                      : 'contact',
              site,
              sessions,
              visibleSessions,
              packages,
              classTypes,
              timezone,
              category,
              setCategory,
              member,
              guestDays,
              memberDays,
              busy,
              sessionsStatus,
              packagesStatus,
              retrySessions: () => {
                void loadSessions().catch((error) => show(message(error)))
              },
              retryPackages: () => {
                void loadPackages().catch((error) => show(message(error)))
              },
              go,
              openBooking,
              buyPackage,
            }}
          />
        )}
      {!site &&
        siteStatus !== 'ready' &&
        (path === '/' || path === '/jadwal' || path === '/membership' || path === '/kontak') && (
          <main
            className="shell zeira-public-state"
            role={siteStatus === 'error' ? 'alert' : 'status'}
          >
            <h1>
              {siteStatus === 'loading'
                ? 'Memuat situs studio…'
                : 'Konten situs belum dapat dimuat'}
            </h1>
            {siteStatus === 'error' && (
              <button
                className="zeira-btn zeira-btn-primary"
                onClick={() => window.location.reload()}
              >
                Coba lagi
              </button>
            )}
          </main>
        )}

      {path === '/masuk' && (
        <LoginPage
          authMode={authMode}
          setAuthMode={setAuthMode}
          busy={busy}
          authenticate={authenticate}
          go={go}
        />
      )}

      {path === '/ganti-sandi' && (
        <ChangePasswordPage busy={busy} changePassword={changePassword} />
      )}

      {(path === '/dashboard' || path.startsWith('/dashboard/')) && (
        <DashboardPage
          authReady={authReady}
          path={path}
          actor={actor}
          mustChangePassword={mustChangePassword}
          member={member}
          quota={quota}
          balance={balance}
          bookings={bookings}
          payments={payments}
          purchases={purchases}
          timezone={timezone}
          busy={busy}
          go={go}
          logout={logout}
          paymentAction={paymentAction}
          cancelBooking={cancelBooking}
          setPaymentLink={setPaymentLink}
          refreshPackage={refreshPackage}
          show={show}
          setActor={setActor}
          loadSessions={loadSessions}
          setPackages={setPackages}
          setStudio={setStudio}
          setSite={setSite}
        />
      )}

      {paymentLink && <PaymentModal paymentLink={paymentLink} setPaymentLink={setPaymentLink} />}
      {selected && (
        <BookingModal
          selected={selected}
          setSelected={setSelected}
          options={options}
          choice={choice}
          setChoice={setChoice}
          useBalance={useBalance}
          setUseBalance={setUseBalance}
          busy={busy}
          createBooking={createBooking}
          timezone={timezone}
        />
      )}
      {notice && (
        <div className="toast" role="status">
          {notice}
          <button onClick={() => setNotice('')} aria-label="Tutup pesan">
            <X size={15} />
          </button>
        </div>
      )}
      {site &&
        (path === '/' || path === '/jadwal' || path === '/membership' || path === '/kontak') && (
          <SiteFooter site={site} go={go} />
        )}
    </>
  )
}
