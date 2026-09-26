export type PageResult<T> = { items: T[]; page: number; limit: number; total: number }

export type AdminBookingRecord = {
  id: string
  customerId: string
  customerName: string
  customerEmail: string
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
  sessionId: string
  localDate: string
  startsAt: string
  title: string
  paymentStatus: string | null
  orderId: string | null
}

export type AdminPaymentRecord = {
  id: string
  orderId: string
  grossAmountIdr: number
  status: string
  providerStatus: string | null
  createdAt: string
  updatedAt: string
  bookingId: string | null
  packagePurchaseId: string | null
  kind: 'class' | 'package'
  customerId: string
  customerName: string
  customerEmail: string
  classTitle: string | null
  localDate: string | null
  packageAmountIdr: number | null
  durationMonths: number | null
}

export type AdminWalletRecord = {
  customerId: string
  customerName: string
  customerEmail: string
  balanceIdr: number
  updatedAt: string
}

export type AdminWalletEntry = {
  id: string
  bookingId: string | null
  amountIdr: number
  balanceAfterIdr: number
  kind: string
  reference: string
  createdAt: string
}

export type AdminWalletLedger = PageResult<AdminWalletEntry> & { customer: AdminWalletRecord }
