import { useCallback, useEffect, useRef, useState } from 'react'
import { api } from '../../shared/api'
import { paymentFeedback } from './payment-feedback'
import type { PaymentStatusResponse } from './payment-feedback'

export type ActivePayment = {
  url: string
  kind: 'booking' | 'package' | 'event'
  id: string
  orderId?: string
}

type Options = {
  activePayment: ActivePayment | null
  setActivePayment: (payment: ActivePayment | null) => void
  onSuccess: () => Promise<void>
  show: (message: string) => void
}

export function usePaymentWatcher({
  activePayment,
  setActivePayment,
  onSuccess,
  show,
}: Options) {
  const [refreshing, setRefreshing] = useState(false)
  const lastRefreshAt = useRef<number>(0)
  const isChecking = useRef(false)

  const checkStatus = useCallback(async (manual = false) => {
    if (!activePayment || isChecking.current) return
    isChecking.current = true

    try {
      const endpoint =
        activePayment.kind === 'booking'
          ? `/bookings/${activePayment.id}/refresh-payment`
          : activePayment.kind === 'event'
            ? `/events/registrations/${activePayment.id}/refresh-payment`
            : `/me/membership-purchases/${activePayment.id}/refresh-payment`

      const res = await api<PaymentStatusResponse>(endpoint, { method: 'POST' })
      const feedback = paymentFeedback(activePayment.kind, res)
      if (feedback.terminal) {
        setActivePayment(null)
        await onSuccess()
        show(feedback.message)
      } else if (manual) {
        show(feedback.message)
      }
    } catch {
      if (manual) show('Status pembayaran belum dapat diperiksa. Periksa koneksi lalu coba lagi.')
    } finally {
      isChecking.current = false
    }
  }, [activePayment, onSuccess, setActivePayment, show])

  // Backoff dibatasi, tab tersembunyi tidak mengirim request.
  useEffect(() => {
    if (!activePayment) return
    let cancelled = false
    let attempts = 0
    let timer: ReturnType<typeof setTimeout>
    const schedule = () => {
      timer = setTimeout(() => {
        if (cancelled) return
        if (document.visibilityState === 'visible') {
          attempts += 1
          void checkStatus().finally(() => { if (!cancelled) schedule() })
        } else schedule()
      }, Math.min(4000 * 1.6 ** attempts, 30000))
    }
    schedule()
    return () => { cancelled = true; clearTimeout(timer) }
  }, [activePayment, checkStatus])

  // Cek seketika saat pengguna kembali ke tab ini dari tab Midtrans Sandbox
  useEffect(() => {
    if (!activePayment) return

    function handleVisibility() {
      if (document.visibilityState === 'visible') {
        void checkStatus()
      }
    }

    function handleFocus() {
      void checkStatus()
    }

    document.addEventListener('visibilitychange', handleVisibility)
    window.addEventListener('focus', handleFocus)
    return () => {
      document.removeEventListener('visibilitychange', handleVisibility)
      window.removeEventListener('focus', handleFocus)
    }
  }, [activePayment, checkStatus])

  // Tombol cadangan jika webhook belum terpasang di simulator
  const manualRefresh = useCallback(async () => {
    if (!activePayment || refreshing) return
    const now = Date.now()
    if (now - lastRefreshAt.current < 4000) {
      show('Status baru saja diperiksa. Tunggu beberapa detik sebelum memeriksa ulang.')
      return
    }

    lastRefreshAt.current = now
    setRefreshing(true)
    try {
      await checkStatus(true)
    } catch (err) {
      show(err instanceof Error ? err.message : 'Gagal memperbarui status dari penyedia pembayaran.')
    } finally {
      setRefreshing(false)
    }
  }, [activePayment, checkStatus, refreshing, show])

  return {
    refreshing,
    manualRefresh,
  }
}
