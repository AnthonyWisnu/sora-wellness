import type { SiteSection } from '../../shared/api'
import { PublicHero } from './PublicHero'
import { PublicSessions } from './PublicSessions'
import { PublicPackages } from './PublicPackages'
import {
  PublicContact,
  PublicCta,
  PublicFaq,
  PublicFeatures,
  PublicGallery,
  PublicTestimonials,
} from './PublicEditorial'
import type { SiteBlockContext } from './public-types'

export type { SiteBlockContext } from './public-types'

export function SiteBlock({ section, ctx }: { section: SiteSection; ctx: SiteBlockContext }) {
  if (!section.visible) return null
  if (section.type === 'hero') return <PublicHero section={section} ctx={ctx} />
  if (section.type === 'sessions') return <PublicSessions section={section} ctx={ctx} />
  if (section.type === 'packages') return <PublicPackages section={section} ctx={ctx} />
  if (section.type === 'features') return <PublicFeatures section={section} />
  if (section.type === 'testimonials') return <PublicTestimonials section={section} />
  if (section.type === 'gallery') return <PublicGallery section={section} ctx={ctx} />
  if (section.type === 'faq') return <PublicFaq section={section} />
  if (section.type === 'cta') return <PublicCta section={section} ctx={ctx} />
  if (section.type === 'contact') return <PublicContact section={section} ctx={ctx} />
  return null
}
