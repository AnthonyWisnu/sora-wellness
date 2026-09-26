import { useState } from 'react'
import { ArrowRight, ChevronLeft, ChevronRight, MapPin } from 'lucide-react'
import type { SiteSection } from '../../shared/api'
import { formatDate, localTime } from '../../shared/format'
import { siteMediaUrl } from '../../shared/types/site'
import type { SiteBlockContext } from './public-types'

export function PublicHero({ section, ctx }: { section: SiteSection; ctx: SiteBlockContext }) {
  const [slideIndex, setSlideIndex] = useState(0)
  const { profile } = ctx.site
  const images = [profile.heroMediaId, ...profile.galleryMediaIds]
    .filter((id): id is string => Boolean(id))
    .map((id) => siteMediaUrl(id)!)
  const slides = images.length ? images : ['/images/sora-studio-hero.png']
  const slide = slideIndex % slides.length
  const nearest = ctx.sessions.find(
    (session) =>
      session.status === 'scheduled' &&
      session.seatsLeft > 0 &&
      (ctx.member || session.level === 'beginner'),
  )

  if (ctx.page === 'membership' || ctx.page === 'contact') {
    return (
      <section className="zeira-page-intro shell">
        <span className="zeira-overline">{profile.name}</span>
        <h1>{section.title}</h1>
        <p>{section.body}</p>
        {section.label && section.link && (
          <button className="zeira-btn zeira-btn-outline" onClick={() => ctx.go(section.link)}>
            {section.label} <ArrowRight size={16} />
          </button>
        )}
      </section>
    )
  }

  if (ctx.page === 'schedule') {
    return (
      <section className="zeira-schedule-hero shell">
        <img
          src={siteMediaUrl(profile.heroMediaId) ?? '/images/sora-studio-hero.png'}
          alt="Ruang studio wellness"
        />
        <div className="zeira-schedule-hero-content">
          <span className="zeira-overline">
            <MapPin size={13} /> {profile.name}
          </span>
          <h1>{section.title}</h1>
          <p>{section.body || profile.description}</p>
          {profile.address && <small>{profile.address}</small>}
        </div>
      </section>
    )
  }

  return (
    <section className="zeira-hero shell" aria-label="Beranda studio">
      <img className="zeira-hero-image" src={slides[slide]} alt="Ruang studio wellness" />
      <div className="zeira-hero-scrim" />
      <div className="zeira-hero-top">
        <span className="zeira-hero-location">
          <MapPin size={13} /> {profile.name}
        </span>
        {slides.length > 1 && (
          <span className="zeira-hero-count">
            {String(slide + 1).padStart(2, '0')} / {String(slides.length).padStart(2, '0')}
          </span>
        )}
      </div>
      <div className="zeira-hero-center">
        <span className="zeira-overline">{profile.name}</span>
        <h1>{section.title}</h1>
        <p>{section.body || profile.description}</p>
        {section.label && section.link && (
          <button className="zeira-btn zeira-btn-ghost" onClick={() => ctx.go(section.link)}>
            {section.label} <ArrowRight size={16} />
          </button>
        )}
      </div>
      {slides.length > 1 && (
        <>
          <button
            className="zeira-hero-arrow zeira-hero-prev"
            aria-label="Gambar sebelumnya"
            onClick={() => setSlideIndex((value) => (value + slides.length - 1) % slides.length)}
          >
            <ChevronLeft size={21} />
          </button>
          <button
            className="zeira-hero-arrow zeira-hero-next"
            aria-label="Gambar berikutnya"
            onClick={() => setSlideIndex((value) => (value + 1) % slides.length)}
          >
            <ChevronRight size={21} />
          </button>
          <div className="zeira-hero-dots" aria-label="Pilih gambar hero">
            {slides.map((_, index) => (
              <button
                key={index}
                className={index === slide ? 'active' : ''}
                aria-label={`Gambar ${index + 1}`}
                aria-current={index === slide ? 'true' : undefined}
                onClick={() => setSlideIndex(index)}
              />
            ))}
          </div>
        </>
      )}
      <div className="zeira-hero-dock">
        {nearest ? (
          <>
            <span className="zeira-hero-status">
              <i /> SESI TERDEKAT ·{' '}
              {formatDate(nearest.localDate, { day: 'numeric', month: 'short' })} ·{' '}
              {localTime(nearest.startsAt, ctx.timezone)}
            </span>
            <span className="zeira-hero-session">
              <strong>{nearest.title}</strong>
              <small>
                {nearest.coachName} · Sisa {nearest.seatsLeft} kursi
              </small>
            </span>
            <button onClick={() => ctx.openBooking(nearest)}>
              Reservasi sesi <ArrowRight size={14} />
            </button>
          </>
        ) : (
          <>
            <span className="zeira-hero-session">
              <strong>Temukan sesi yang sesuai</strong>
              <small>Jadwal terbaru tersedia di halaman kelas.</small>
            </span>
            <button onClick={() => ctx.go('/jadwal')}>
              Lihat jadwal <ArrowRight size={14} />
            </button>
          </>
        )}
      </div>
    </section>
  )
}
