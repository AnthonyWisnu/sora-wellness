import type {
  AdminBookingRecord,
  AdminPaymentRecord,
  AdminWalletRecord,
  PageResult,
} from '../../shared/api'
export type Tab = 'bookings' | 'payments' | 'wallets'
export type Listing =
  PageResult<AdminBookingRecord> | PageResult<AdminPaymentRecord> | PageResult<AdminWalletRecord>
