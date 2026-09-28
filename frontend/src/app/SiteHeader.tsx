import { useState } from 'react'
import { ArrowRight, LockKeyhole, Menu, X } from 'lucide-react'
import type { Actor, Studio } from '../shared/api'

type Props = {
  studio: Studio | null
  primaryName: string
  path: string
  actor: Actor | null
  go: (path: string) => void
}
export function SiteHeader({ studio, primaryName, path, actor, go }: Props) {
  const [menu, setMenu] = useState(false)
  const publicPage = ['/', '/jadwal', '/membership', '/kontak'].includes(path)
  const brandSuffix = studio?.name.split(' ').slice(1).join(' ') || 'STUDIO'
  const navigate = (next: string) => {
    setMenu(false)
    go(next)
  }
  return (
    <>
      {!publicPage && (
        <div className="sandbox-banner">
          <span className="ribbon-dot" /> Pembayaran memakai Midtrans Sandbox
        </div>
      )}
      <header className={`site-header${publicPage ? ' sora-public-header' : ''}`}>
        <div className="shell header-inner">
          <button
            className="wordmark"
            onClick={() => navigate('/')}
            aria-label={`Beranda ${studio?.name ?? primaryName}`}
          >
            <img
              className="wordmark-logo"
              src={studio?.logoUrl ?? '/images/sora-mark.svg'}
              alt=""
            />
            <span>{primaryName}</span>
            <small>{publicPage ? brandSuffix : 'WELLNESS'}</small>
          </button>
          <nav className="nav-pill" aria-label="Navigasi utama">
            {[
              ['/', 'Beranda'],
              ['/jadwal', 'Jadwal'],
              ['/membership', 'Membership'],
              ['/kontak', 'Kontak'],
            ].map(([url, label]) => (
              <button
                key={url}
                className={path === url ? 'active' : ''}
                onClick={() => navigate(url)}
              >
                {label}
              </button>
            ))}
          </nav>
          <div className="header-actions">
            <button
              className="button button-primary header-login"
              onClick={() => navigate(actor ? '/dashboard' : '/masuk')}
            >
              {publicPage && !actor ? <LockKeyhole size={15} /> : null}
              {actor ? 'Dashboard' : 'Masuk'} {!publicPage && <ArrowRight size={16} />}
            </button>
            <button
              className="mobile-menu-button"
              onClick={() => setMenu(!menu)}
              aria-label="Buka menu"
            >
              {menu ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>
        </div>
        {menu && (
          <nav className="mobile-nav">
            <button onClick={() => navigate('/')}>Beranda</button>
            <button onClick={() => navigate('/jadwal')}>Jadwal</button>
            <button onClick={() => navigate('/membership')}>Membership</button>
            <button onClick={() => navigate('/kontak')}>Kontak</button>
            <button onClick={() => navigate(actor ? '/dashboard' : '/masuk')}>
              {actor ? 'Dashboard' : 'Masuk'}
            </button>
          </nav>
        )}
      </header>
    </>
  )
}
