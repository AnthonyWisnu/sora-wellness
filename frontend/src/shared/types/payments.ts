export type Payment = {
  id: string
  orderId: string
  grossAmountIdr: number
  status: string
  providerStatus: string | null
  createdAt: string
  bookingId: string | null
  packagePurchaseId: string | null
  redirectUrl?: string | null
}

export type PaymentSettings = {
  configured: boolean
  environment: string
  merchantId?: string
  clientKey?: string
  serverKeyConfigured?: boolean
}
