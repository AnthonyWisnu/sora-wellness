import { useCallback, useEffect, useRef, useState } from 'react'
import { api } from '../../shared/api'

export type ActivePayment = {
  url: string
  kind: 'booking' | 'package'
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

  const checkStatus = useCallback(async () => {
    if (!activePayment || isChecking.current) return
    isChecking.current = true

    try {
      const endpoint =
        activePayment.kind === 'booking'
          ? `/bookings/${activePayment.id}/refresh-payment`
          : `/me/membership-purchases/${activePayment.id}/refresh-payment`

      const res = await api<{
        bookingStatus?: string
        purchaseStatus?: string
        paymentStatus?: string
      }>(endpoint, { method: 'POST' })

      const isSuccess =
        res.bookingStatus === 'confirmed' ||
        res.purchaseStatus === 'paid' ||
        res.paymentStatus === 'success'

      if (isSuccess) {
        setActivePayment(null)
        await onSuccess()
        show(
          activePayment.kind === 'booking'
            ? 'Pembayaran berhasil dikonfirmasi. Tiket dan sesi kelas Anda telah aktif.'
            : 'Pembelian paket berhasil. Masa aktif dan jatah kelas telah diperbarui.',
        )
        return
      }

      const isFailed =
        res.bookingStatus === 'cancelled' ||
        res.bookingStatus === 'expired' ||
        res.purchaseStatus === 'cancelled' ||
        res.purchaseStatus === 'expired' ||
        res.paymentStatus === 'expired' ||
        res.paymentStatus === 'failed'

      if (isFailed) {
        setActivePayment(null)
        await onSuccess()
        show('Batas waktu pembayaran telah habis atau pesanan dibatalkan.')
        return
      }
    } catch {
      // Abaikan kegagalan jaringan sementara saat polling latar belakang
    } finally {
      isChecking.current = false
    }
  }, [activePayment, onSuccess, setActivePayment, show])

  // Polling ringan berkala setiap 4 detik saat modal pembayaran aktif
  useEffect(() => {
    if (!activePayment) return
    const timer = setInterval(() => {
      void checkStatus()
    }, 4000)
    return () => clearInterval(timer)
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
      await checkStatus()
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
