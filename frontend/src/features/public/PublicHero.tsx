import { useEffect, useState } from 'react'
import { ArrowRight, ChevronLeft, ChevronRight, MapPin } from 'lucide-react'
import type { SiteSection } from '../../shared/api'
import { formatDate, localTime } from '../../shared/format'
import { siteMediaUrl } from '../../shared/types/site'
import type { SiteBlockContext } from './public-types'

export function PublicHero({ section, ctx }: { section: SiteSection; ctx: SiteBlockContext }) {
  const [slideIndex, setSlideIndex] = useState(0)
  const { profile } = ctx.site

  // Custom slides if configured by admin in section.items
  const customSlides = section.items && section.items.length > 0 ? section.items : null

  // Fallback images if no custom slides
  const images = [profile.heroMediaId, ...profile.galleryMediaIds]
    .filter((id): id is string => Boolean(id))
    .map((id) => siteMediaUrl(id)!)
  const fallbackSlides = images.length ? images : ['/images/sora-studio-hero.png']

  const totalSlides = customSlides ? customSlides.length : fallbackSlides.length
  const currentSlide = totalSlides > 0 ? slideIndex % totalSlides : 0

  // Auto-play timer (transitions every 6 seconds)
  useEffect(() => {
    if (totalSlides <= 1) return
    const timer = setInterval(() => {
      setSlideIndex((prev) => (prev + 1) % totalSlides)
    }, 6000)
    return () => clearInterval(timer)
  }, [totalSlides])

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

  // Active slide content
  const activeCustom = customSlides ? customSlides[currentSlide] : null
  const currentImage = activeCustom
    ? (siteMediaUrl(activeCustom.mediaId) ?? siteMediaUrl(profile.heroMediaId) ?? '/images/sora-studio-hero.png')
    : fallbackSlides[currentSlide]
  const currentTitle = activeCustom?.title?.trim() || section.title || profile.name
  const currentBody = activeCustom?.body?.trim() || section.body || profile.description
  const currentLabel = activeCustom?.caption?.trim() || section.label || ''
  const currentLink = activeCustom?.link || section.link || ''

  return (
    <section className="zeira-hero shell" aria-label="Beranda studio">
      <img
        key={currentImage}
        className="zeira-hero-image"
        src={currentImage}
        alt="Ruang studio wellness"
        style={{ animation: 'fadeIn 0.6s ease-in-out' }}
      />
      <div className="zeira-hero-scrim" />
      <div className="zeira-hero-top">
        <span className="zeira-hero-location">
          <MapPin size={13} /> {profile.name}
        </span>
        {totalSlides > 1 && (
          <span className="zeira-hero-count">
            {String(currentSlide + 1).padStart(2, '0')} / {String(totalSlides).padStart(2, '0')}
          </span>
        )}
      </div>
      <div className="zeira-hero-center" key={`text-${currentSlide}`}>
        <span className="zeira-overline">{profile.name}</span>
        <h1>{currentTitle}</h1>
        <p>{currentBody}</p>
        {currentLabel && currentLink && (
          <button className="zeira-btn zeira-btn-ghost" onClick={() => ctx.go(currentLink)}>
            {currentLabel} <ArrowRight size={16} />
          </button>
        )}
      </div>
      {totalSlides > 1 && (
        <>
          <button
            className="zeira-hero-arrow zeira-hero-prev"
            aria-label="Gambar sebelumnya"
            onClick={() => setSlideIndex((value) => (value + totalSlides - 1) % totalSlides)}
          >
            <ChevronLeft size={21} />
          </button>
          <button
            className="zeira-hero-arrow zeira-hero-next"
            aria-label="Gambar berikutnya"
            onClick={() => setSlideIndex((value) => (value + 1) % totalSlides)}
          >
            <ChevronRight size={21} />
          </button>
          <div className="zeira-hero-dots" aria-label="Pilih gambar hero">
            {Array.from({ length: totalSlides }).map((_, index) => (
              <button
                key={index}
                className={index === currentSlide ? 'active' : ''}
                aria-label={`Gambar ${index + 1}`}
                aria-current={index === currentSlide ? 'true' : undefined}
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
