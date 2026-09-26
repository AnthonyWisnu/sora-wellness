export type Policy = {
  guestScheduleDays: number
  memberScheduleDays: number
  bookingCutoffMinutes: number
  cancellationCutoffMinutes: number
  seatHoldMinutes: number
  monthlyClassQuota: number
  lockerEnabled: boolean
}

export type AdminSession = {
  id: string
  class_type_id: string
  coach_id: string
  local_date: string
  starts_at: string
  ends_at: string
  status: string
  capacity: number
  price_idr: number
  title: string
  coach_name: string
}

export type AdminClassType = {
  id: string
  title: string
  category: string
  level: 'beginner' | 'intermediate_1' | 'intermediate_2'
  description: string
  duration_minutes: number
  default_capacity: number
  default_price_idr: number
  active: boolean
}

export type AdminPackageOption = {
  id: string
  duration_months: number
  price_idr: number
  active: boolean
}

export type AdminScheduleRule = {
  id: string
  class_type_id: string
  coach_id: string
  iso_weekday: number
  local_start_time: string
  starts_on: string
  ends_on: string
  capacity: number
  price_idr: number
  title: string
  coach_name: string
}
