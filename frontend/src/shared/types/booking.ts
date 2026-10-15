export type BookingOptions = {
  bookable: boolean
  reason: string | null
  seatsLeft: number
  memberOnDate: boolean
  quotaTotal: number
  quotaUsed: number
  quotaAvailable: boolean
  singlePriceIdr: number
  balanceIdr: number
}

export type Booking = {
  id: string
  bookingCode?: string | null
  status: string
  source: string
  priceIdr: number
  walletReservedIdr: number
  gatewayDueIdr: number
  holdExpiresAt: string | null
  createdAt: string
  cancelledAt: string | null
  cancellationOrigin: string | null
  quotaRetained: boolean
  localDate: string
  startsAt: string
  endsAt?: string | null
  sessionStatus?: string | null
  title: string
}

export type BookingCreated = {
  id: string
  bookingCode?: string | null
  status: string
  payment: { redirectUrl: string; orderId: string } | null
}
