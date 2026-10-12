import type {
  AdminBookingRecord,
  AdminPaymentRecord,
  AdminWalletRecord,
  PageResult,
} from '../../shared/api'

export type Tab = 'bookings' | 'payments' | 'wallets' | 'withdrawals'

export type WalletWithdrawal = {
  id: string
  customerId?: string
  customerName?: string
  customerEmail?: string
  amountIdr: number
  destinationType: 'bank' | 'ewallet'
  providerCode: string
  accountNumber: string
  accountName: string
  status: 'pending' | 'completed' | 'rejected'
  transferRefNote?: string | null
  rejectedReason?: string | null
  proofMediaId?: string | null
  proofUrl?: string | null
  createdAt: string
  reviewedAt?: string | null
}

export type Listing =
  | PageResult<AdminBookingRecord>
  | PageResult<AdminPaymentRecord>
  | PageResult<AdminWalletRecord>
