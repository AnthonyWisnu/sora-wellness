import { ArrowRight, CalendarDays, Compass, ExternalLink, MapPin, Quote, ShieldCheck } from 'lucide-react'
import type { SiteSection } from '../../shared/api'
import { siteMediaUrl } from '../../shared/types/site'
import type { SiteBlockContext } from './public-types'

export function PublicFeatures({ section }: { section: SiteSection }) {
  if (!section.items.length) return null
  const items = section.items
  const icons = [Compass, CalendarDays, ShieldCheck]
  return (
    <section className="zeira-section shell zeira-features">
      <div className="zeira-section-heading">
        <div>
          <span className="zeira-overline">KEUNGGULAN</span>
          <h2>{section.title}</h2>
          {section.body && <p>{section.body}</p>}
        </div>
      </div>
      <div className="zeira-feature-grid">
        {items.map((item, index) => {
          const Icon = icons[index % icons.length]
          return (
            <article key={`${item.title}-${index}`}>
              <div className="zeira-feature-top">
                <span>{item.caption || `0${index + 1} / STUDIO`}</span>
                <Icon size={20} />
              </div>
              <h3>{item.title}</h3>
              <p>{item.body}</p>
            </article>
          )
        })}
      </div>
    </section>
  )
}

export function PublicTestimonials({ section }: { section: SiteSection }) {
  if (!section.items.length) return null
  const items = section.items
  return (
    <section className="zeira-section shell zeira-testimonials">
      <div className="zeira-testimonial-intro">
        <Quote size={34} />
        <div>
          <span className="zeira-overline">PENGALAMAN STUDIO</span>
          <h2>{section.title}</h2>
          {section.body && <p>{section.body}</p>}
        </div>
      </div>
      <div className="zeira-testimonial-list">
        {items.map((item, index) => (
          <blockquote key={`${item.title}-${index}`}>
            <p>“{item.body}”</p>
            <footer>
              {item.mediaId && <img src={siteMediaUrl(item.mediaId)} alt="" />}
              <span>
                <strong>{item.title}</strong>
                <small>{item.caption}</small>
              </span>
            </footer>
          </blockquote>
        ))}
      </div>
    </section>
  )
}

export function PublicGallery({ section, ctx }: { section: SiteSection; ctx: SiteBlockContext }) {
  const ids = ctx.site.profile.galleryMediaIds
  if (!ids.length) return null
  return (
    <section className="zeira-section shell zeira-gallery">
      <div className="zeira-section-heading">
        <div>
          <span className="zeira-overline">GALERI STUDIO</span>
          <h2>{section.title}</h2>
          {section.body && <p>{section.body}</p>}
        </div>
      </div>
      <div className="zeira-gallery-grid">
        {ids.map((id, index) => (
          <img key={id} src={siteMediaUrl(id)} alt={`Foto studio ${index + 1}`} loading="lazy" />
        ))}
      </div>
    </section>
  )
}

export function PublicFaq({ section }: { section: SiteSection }) {
  if (!section.items.length) return null
  return (
    <section className="zeira-section shell zeira-faq">
      <span className="zeira-overline">PERTANYAAN UMUM</span>
      <h2>{section.title}</h2>
      {section.body && <p>{section.body}</p>}
      <div className="zeira-faq-list">
        {section.items.map((item, index) => (
          <details key={`${item.title}-${index}`}>
            <summary>{item.title}</summary>
            <p>{item.body}</p>
          </details>
        ))}
      </div>
    </section>
  )
}

export function PublicCta({ section, ctx }: { section: SiteSection; ctx: SiteBlockContext }) {
  return (
    <section className="zeira-section shell zeira-cta">
      <div>
        <span className="zeira-overline">MULAI HARI INI</span>
        <h2>{section.title}</h2>
        {section.body && <p>{section.body}</p>}
      </div>
      {section.label && section.link && (
        <button className="zeira-btn zeira-btn-primary" onClick={() => ctx.go(section.link)}>
          {section.label} <ArrowRight size={16} />
        </button>
      )}
    </section>
  )
}

export function PublicContact({ section, ctx }: { section: SiteSection; ctx: SiteBlockContext }) {
  const { contact, profile } = ctx.site
  return (
    <section className="zeira-section shell zeira-contact">
      <div className="zeira-section-heading">
        <div>
          <span className="zeira-overline">KUNJUNGI KAMI</span>
          <h2>{section.title}</h2>
          {section.body && <p>{section.body}</p>}
        </div>
      </div>
      <div className={`zeira-contact-grid${contact.mapEmbedUrl ? '' : ' zeira-contact-no-map'}`}>
        <div className="zeira-contact-card">
          <MapPin size={23} />
          <h3>{profile.name}</h3>
          <p>{profile.address}</p>
          {contact.hours && <p className="zeira-contact-hours">{contact.hours}</p>}
          <div className="zeira-contact-links">
            {contact.phone && (
              <a href={`tel:${contact.phone.replace(/[^+\d]/g, '')}`}>Telepon · {contact.phone}</a>
            )}
            {contact.whatsapp && (
              <a
                href={`https://wa.me/${contact.whatsapp}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                WhatsApp · {contact.whatsapp}
              </a>
            )}
            {contact.email && <a href={`mailto:${contact.email}`}>Email · {contact.email}</a>}
            {contact.socialLinks.map((link) => (
              <a key={link.url} href={link.url} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                {link.label} <ExternalLink size={13} />
              </a>
            ))}
          </div>
        </div>
        {contact.mapEmbedUrl ? (
          <>
            <iframe
              title={`Peta ${profile.name}`}
              src={contact.mapEmbedUrl}
              loading="lazy"
              referrerPolicy="strict-origin-when-cross-origin"
              allowFullScreen
            />
            <a
              className="zeira-contact-map-link"
              href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${profile.name}, ${profile.address}`)}`}
              target="_blank"
              rel="noopener noreferrer"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}
            >
              Buka lokasi di Google Maps <ExternalLink size={13} />
            </a>
          </>
        ) : null}
      </div>
    </section>
  )
}
