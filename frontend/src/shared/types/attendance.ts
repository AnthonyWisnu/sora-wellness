export type CoachSession = {
  id: string
  localDate: string
  startsAt: string
  endsAt: string
  status: string
  capacity: number
  title: string
  level: string
  category: string
  participantCount: number
}

export type CoachParticipant = {
  bookingId: string
  customerId: string
  fullName: string
  present: boolean | null
  recordedAt: string | null
  healthNote: string | null
  healthSource: 'current' | 'snapshot' | null
}

export type CoachParticipants = {
  sessionId: string
  startsAt: string
  endsAt: string
  participants: CoachParticipant[]
}

export type AdminParticipant = {
  bookingId: string
  customerId: string
  fullName: string
  present: boolean | null
  recordedAt: string | null
}

export type AttendanceCorrection = {
  id: number
  customerId: string
  customerName: string
  previousPresent: boolean | null
  newPresent: boolean
  reason: string
  correctedAt: string
  adminName: string
}
