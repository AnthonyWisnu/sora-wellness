export type EventTicket = {
  id: string
  ticketCode: string | null
  ticketAccessToken?: string
  guestName: string
  activityTitle: string
  eventTitle?: string
  localDate?: string | null
  status: string
  priceIdr?: number
  holdExpiresAt?: string | null
  payment?: { orderId: string; status: string; redirectUrl: string | null } | null
}
