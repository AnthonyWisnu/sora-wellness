import { useEffect, useRef, useState, type ReactNode } from 'react'
import {
  ArrowLeft,
  CalendarDays,
  ClipboardCheck,
  CreditCard,
  Grid2X2,
  HeartPulse,
  LayoutDashboard,
  LockKeyhole,
  LogOut,
  Menu,
  Repeat2,
  Settings2,
  ShieldCheck,
  Sparkles,
  UsersRound,
  Wallet,
  X,
  type LucideIcon,
} from 'lucide-react'
import type { Actor } from '../../shared/api'
import { dashboardNavigation, dashboardTitle } from './navigation'
import './DashboardShell.css'

const icons: Record<string, LucideIcon> = {
  sessions: LayoutDashboard,
  overview: LayoutDashboard,
  manage: CalendarDays,
  classes: Grid2X2,
  rules: Repeat2,
  attendance: ClipboardCheck,
  accounts: UsersRound,
  packages: Sparkles,
  lockers: LockKeyhole,
  finance: Wallet,
  policy: ShieldCheck,
  content: Settings2,
  payment: CreditCard,
  bookings: CalendarDays,
  membership: CreditCard,
  wallet: Wallet,
  profile: HeartPulse,
}

const roleName = { admin: 'Admin studio', coach: 'Pelatih', customer: 'Pelanggan' }

type Props = {
  actor: Actor
  member: boolean
  section: string
  go: (path: string) => void
  logout: () => void
  children: ReactNode
}

export function DashboardShell({ actor, member, section, go, logout, children }: Props) {
  const [menuOpen, setMenuOpen] = useState(false)
  const closeButton = useRef<HTMLButtonElement>(null)
  const menuButton = useRef<HTMLButtonElement>(null)
  const sidebar = useRef<HTMLElement>(null)
  const title = dashboardTitle(actor.role, section)

  useEffect(() => {
    if (!menuOpen) return
    closeButton.current?.focus()
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setMenuOpen(false)
        menuButton.current?.focus()
      }
      if (event.key === 'Tab') {
        const focusable = sidebar.current?.querySelectorAll<HTMLElement>(
          'a, button:not([disabled])',
        )
        if (!focusable?.length) return
        const first = focusable[0]
        const last = focusable[focusable.length - 1]
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault()
          last.focus()
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault()
          first.focus()
        }
      }
    }
    window.addEventListener('keydown', closeOnEscape)
    return () => window.removeEventListener('keydown', closeOnEscape)
  }, [menuOpen])

  function navigate(path: string) {
    setMenuOpen(false)
    go(path)
  }

  return (
    <div className="dashboard-app">
      {menuOpen && (
        <button
          className="dashboard-scrim"
          aria-label="Tutup menu navigasi"
          onClick={() => setMenuOpen(false)}
        />
      )}
      <aside ref={sidebar} className={`dashboard-sidebar${menuOpen ? ' is-open' : ''}`}>
        <div className="dashboard-brand">
          <img src="/images/sora-mark.svg" alt="" />
          <span>
            <strong>SORA</strong>
            <small>WELLNESS STUDIO</small>
          </span>
          <button
            ref={closeButton}
            className="dashboard-close"
            aria-label="Tutup menu"
            onClick={() => {
              setMenuOpen(false)
              menuButton.current?.focus()
            }}
          >
            <X size={20} />
          </button>
        </div>

        <div className="dashboard-sidebar-scroll">
          <div className="dashboard-workspace-label">
            RUANG {roleName[actor.role].toUpperCase()}
          </div>
          <nav className="dashboard-nav" aria-label="Navigasi dashboard">
            {dashboardNavigation[actor.role].map((group) => (
              <div className="dashboard-nav-group" key={group.label}>
                <span className="dashboard-nav-heading">{group.label}</span>
                {group.items.map((item) => {
                  const Icon = icons[item.id] ?? Grid2X2
                  return (
                    <a
                      key={item.id}
                      href={`/dashboard/${item.id}`}
                      aria-current={section === item.id ? 'page' : undefined}
                      className={`dashboard-nav-link${section === item.id ? ' is-active' : ''}`}
                      onClick={(event) => {
                        if (
                          event.button !== 0 ||
                          event.metaKey ||
                          event.ctrlKey ||
                          event.shiftKey ||
                          event.altKey
                        )
                          return
                        event.preventDefault()
                        navigate(`/dashboard/${item.id}`)
                      }}
                    >
                      <Icon size={18} strokeWidth={1.8} />
                      <span>{item.label}</span>
                    </a>
                  )
                })}
              </div>
            ))}
          </nav>
        </div>

        <div className="dashboard-sidebar-bottom">
          <a
            href="/"
            className="dashboard-site-link"
            onClick={(event) => {
              if (
                event.button !== 0 ||
                event.metaKey ||
                event.ctrlKey ||
                event.shiftKey ||
                event.altKey
              )
                return
              event.preventDefault()
              navigate('/')
            }}
          >
            <ArrowLeft size={17} /> Lihat situs publik
          </a>
          <div className="dashboard-account">
            <span className="dashboard-avatar" aria-hidden="true">
              {actor.fullName.charAt(0).toUpperCase()}
            </span>
            <span className="dashboard-account-text">
              <strong>{actor.fullName}</strong>
              <small>{member ? 'Member aktif' : roleName[actor.role]}</small>
            </span>
            <button aria-label="Keluar" title="Keluar" onClick={() => void logout()}>
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </aside>

      <div className="dashboard-main">
        <header className="dashboard-topbar">
          <button
            ref={menuButton}
            className="dashboard-menu-button"
            aria-label="Buka menu dashboard"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen(true)}
          >
            <Menu size={22} />
          </button>
          <div className="dashboard-topbar-title">
            <span>{roleName[actor.role]}</span>
            <strong>{title}</strong>
          </div>
          <span className="dashboard-sandbox-badge">MIDTRANS SANDBOX</span>
        </header>
        <main className="dashboard-content" id="main-content">
          {children}
        </main>
      </div>
    </div>
  )
}
