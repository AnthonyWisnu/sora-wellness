import { useCallback, useState } from 'react'
import {
  api,
  type Booking,
  type Membership,
  type PackagePurchase,
  type Payment,
} from '../../shared/api'

export function useCustomerData() {
  const [membership, setMembership] = useState<Membership | null>(null)
  const [purchases, setPurchases] = useState<PackagePurchase[]>([])
  const [bookings, setBookings] = useState<Booking[]>([])
  const [payments, setPayments] = useState<Payment[]>([])
  const [balance, setBalance] = useState(0)

  const loadCustomer = useCallback(async () => {
    const [nextMembership, nextPurchases, nextBookings, nextWallet, nextPayments] =
      await Promise.all([
        api<Membership>('/me/membership'),
        api<PackagePurchase[]>('/me/membership-purchases'),
        api<Booking[]>('/bookings?limit=100'),
        api<{ balanceIdr: number }>('/me/wallet'),
        api<Payment[]>('/me/payments?limit=100'),
      ])
    setMembership(nextMembership)
    setPurchases(nextPurchases)
    setBookings(nextBookings)
    setBalance(nextWallet.balanceIdr)
    setPayments(nextPayments)
  }, [])

  function resetCustomer() {
    setMembership(null)
    setPurchases([])
    setBookings([])
    setPayments([])
    setBalance(0)
  }

  return { membership, purchases, bookings, payments, balance, loadCustomer, resetCustomer }
}
