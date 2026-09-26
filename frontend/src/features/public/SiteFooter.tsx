import type { SiteDocument } from '../../shared/api'
import { siteMediaUrl } from '../../shared/types/site'

export function SiteFooter({ site, go }: { site: SiteDocument; go: (path: string) => void }) {
  const nameParts = site.profile.name.split(' ')
  return (
    <footer className="site-footer zeira-footer">
      <div className="shell footer-grid">
        <div>
          <div className="footer-brand">
            {site.profile.logoMediaId && (
              <img src={siteMediaUrl(site.profile.logoMediaId)} alt="" />
            )}
            <span>{nameParts[0]}</span>
            <small>{nameParts.slice(1).join(' ') || 'STUDIO'}</small>
          </div>
          <p>{site.footer.tagline}</p>
        </div>
        <div>
          <strong>Studio</strong>
          <p>{site.profile.name}</p>
          <p>{site.profile.address}</p>
          {site.contact.hours && <p className="zeira-footer-hours">{site.contact.hours}</p>}
        </div>
        <div>
          <strong>Navigasi</strong>
          <button onClick={() => go('/jadwal')}>Jadwal</button>
          <button onClick={() => go('/membership')}>Membership</button>
          <button onClick={() => go('/kontak')}>Kontak</button>
          <button onClick={() => go('/')}>Beranda</button>
        </div>
        <div>
          <strong>Hubungi kami</strong>
          {site.contact.phone && (
            <a href={`tel:${site.contact.phone.replace(/[^+\d]/g, '')}`}>{site.contact.phone}</a>
          )}
          {site.contact.whatsapp && (
            <a
              href={`https://wa.me/${site.contact.whatsapp}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              WhatsApp
            </a>
          )}
          {site.contact.email && <a href={`mailto:${site.contact.email}`}>{site.contact.email}</a>}
          {site.contact.socialLinks.map((link) => (
            <a key={link.url} href={link.url} target="_blank" rel="noopener noreferrer">
              {link.label}
            </a>
          ))}
        </div>
      </div>
      <div className="shell footer-bottom">
        <span>
          © {new Date().getFullYear()} {site.profile.name}. Seluruh hak cipta dilindungi.
        </span>
        <span>Reservasi dan pembayaran melalui sistem studio.</span>
      </div>
    </footer>
  )
}
