export type EventActivity = {
  id: string
  title: string
  category: string
  coachName: string
  classTypeId?: string | null
  coachId?: string | null
  isGuestCoach?: boolean
  guestCoachName?: string | null
  startTime: string
  endTime: string
  capacity: number
  priceIdr: number
  seatsLeft?: number
}

export type ActivityInput = {
  id?: string
  title: string
  category: string
  coachName: string
  classTypeId?: string
  coachId?: string
  isGuestCoach?: boolean
  guestCoachName?: string
  startTime: string
  endTime: string
  capacity: number
  priceIdr: number
}

export type CommunityEvent = {
  id: string
  slug: string
  title: string
  description: string
  locationName: string
  locationAddress?: string
  locationMapsUrl?: string
  startDate: string
  endDate: string
  status: 'draft' | 'published' | 'completed' | 'cancelled'
  bannerMediaId?: string | null
  bannerUrl?: string | null
  activityCount?: number
  totalRegistered?: number
  activities?: EventActivity[]
  createdAt?: string
}

export type EventRegistration = {
  id: string
  ticketCode: string
  guestName: string
  guestEmail: string
  guestPhone?: string
  status: 'registered' | 'attended' | 'cancelled'
  attendedAt?: string | null
  createdAt: string
  activityTitle: string
  startTime: string
  endTime: string
}
