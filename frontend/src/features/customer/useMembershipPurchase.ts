import { useRef, type Dispatch, type SetStateAction } from 'react'
import { api, type Actor, type PackagePurchase } from '../../shared/api'

type Options = {
  actor: Actor | null
  go: (path: string) => void
  show: (message: string) => void
  setBusy: Dispatch<SetStateAction<boolean>>
  loadCustomer: () => Promise<void>
  loadSessions: () => Promise<void>
  setPaymentLink: (url: string) => void
}
function message(error: unknown) {
  return error instanceof Error ? error.message : 'Terjadi kesalahan. Coba lagi.'
}

export function useMembershipPurchase({
  actor,
  go,
  show,
  setBusy,
  loadCustomer,
  loadSessions,
  setPaymentLink,
}: Options) {
  const purchaseKeys = useRef<Record<string, string>>({})
  async function buyPackage(optionId: string) {
    if (!actor) {
      go('/masuk')
      show('Masuk atau daftar untuk membeli paket.')
      return
    }
    if (actor.role !== 'customer') {
      show('Paket tersedia untuk pelanggan.')
      return
    }
    setBusy(true)
    const key = purchaseKeys.current[optionId] ?? crypto.randomUUID()
    purchaseKeys.current[optionId] = key
    try {
      const purchase = await api<PackagePurchase>('/me/membership-purchases', {
        method: 'POST',
        headers: { 'Idempotency-Key': key },
        body: { packageOptionId: optionId },
      })
      delete purchaseKeys.current[optionId]
      await loadCustomer()
      go('/dashboard')
      if (purchase.payment?.redirectUrl) {
        setPaymentLink(purchase.payment.redirectUrl)
        show('Pembelian paket menunggu pembayaran Midtrans Sandbox.')
      } else show('Paket aktif. Tanggal dan jatah sudah diperbarui.')
    } catch (error) {
      show(message(error))
    } finally {
      setBusy(false)
    }
  }
  async function refreshPackage(id: string) {
    setBusy(true)
    try {
      await api(`/me/membership-purchases/${id}/refresh-payment`, { method: 'POST' })
      await loadCustomer()
      await loadSessions()
      show('Status paket diperbarui dari Midtrans.')
    } catch (error) {
      show(message(error))
    } finally {
      setBusy(false)
    }
  }
  return { buyPackage, refreshPackage }
}
