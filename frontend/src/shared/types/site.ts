export type SitePageKey = 'home' | 'schedule' | 'membership' | 'contact'
export type SiteSectionType =
  | 'hero'
  | 'features'
  | 'sessions'
  | 'packages'
  | 'gallery'
  | 'testimonials'
  | 'faq'
  | 'cta'
  | 'contact'
export type SiteItem = { title: string; body: string; caption: string; mediaId: string | null; link?: string }
export type SiteSection = {
  type: SiteSectionType
  visible: boolean
  title: string
  body: string
  label: string
  link: string
  items: SiteItem[]
  featuredClassTypeIds: string[]
  featuredPackageOptionIds: string[]
}
export type SiteDocument = {
  profile: {
    name: string
    description: string
    address: string
    logoMediaId: string | null
    heroMediaId: string | null
    galleryMediaIds: string[]
  }
  contact: {
    phone: string
    whatsapp: string
    email: string
    hours: string
    mapEmbedUrl: string
    socialLinks: { label: string; url: string }[]
  }
  footer: { tagline: string }
  pages: Record<SitePageKey, SiteSection[]>
}
export type SiteDraft = {
  document: SiteDocument
  draftVersion: number
  publishedVersion: number
  updatedAt: string
  publishedAt: string
}
export type PublicClassType = {
  id: string
  title: string
  category: string
  level: string
  description: string
  durationMinutes: number
  singlePriceIdr: number
}
export const sitePageNames: Record<SitePageKey, string> = {
  home: 'Beranda',
  schedule: 'Jadwal',
  membership: 'Paket',
  contact: 'Kontak',
}
export const siteSectionNames: Record<SiteSectionType, string> = {
  hero: 'Judul utama',
  features: 'Keunggulan',
  sessions: 'Kelas',
  packages: 'Paket',
  gallery: 'Galeri',
  testimonials: 'Testimoni',
  faq: 'FAQ',
  cta: 'Ajakan booking',
  contact: 'Kontak dan peta',
}
export function siteMediaUrl(id: string | null): string | undefined {
  return id ? `/api/v1/public/media/${id}` : undefined
}
