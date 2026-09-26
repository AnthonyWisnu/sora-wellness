export type Studio = {
  name: string
  slug: string
  description: string
  address: string
  timezone: string
  heroTitle: string
  heroSubtitle: string
  guestScheduleDays: number
  memberScheduleDays: number
  logoUrl: string | null
  heroImageUrl: string | null
  gallery: { id: string; url: string }[]
}

export type Session = {
  id: string
  classTypeId: string
  localDate: string
  startsAt: string
  endsAt: string
  capacity: number
  singlePriceIdr: number
  status: string
  title: string
  category: string
  level: 'beginner' | 'intermediate_1' | 'intermediate_2'
  coachName: string
  seatsLeft: number
}
