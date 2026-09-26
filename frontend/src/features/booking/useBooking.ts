import { useState, type Dispatch, type SetStateAction } from 'react'
import {
  api,
  type Actor,
  type BookingCreated,
  type BookingOptions,
  type Session,
} from '../../shared/api'

type Options = {
  actor: Actor | null
  go: (path: string) => void
  show: (message: string) => void
  setBusy: Dispatch<SetStateAction<boolean>>
  loadSessions: () => Promise<void>
  loadCustomer: () => Promise<void>
}
function message(error: unknown) {
  return error instanceof Error ? error.message : 'Terjadi kesalahan. Coba lagi.'
}

export function useBooking({ actor, go, show, setBusy, loadSessions, loadCustomer }: Options) {
  const [selected, setSelected] = useState<Session | null>(null)
  const [options, setOptions] = useState<BookingOptions | null>(null)
  const [choice, setChoice] = useState<'quota' | 'single'>('single')
  const [useBalance, setUseBalance] = useState(false)
  const [bookingKey, setBookingKey] = useState('')
  const [paymentLink, setPaymentLink] = useState('')

  async function openBooking(session: Session) {
    if (!actor) {
      go('/masuk')
      show('Masuk atau daftar untuk memesan kelas.')
      return
    }
    if (actor.role !== 'customer') {
      show('Booking tersedia untuk akun pelanggan.')
      return
    }
    setSelected(session)
    setOptions(null)
    setUseBalance(false)
    setBookingKey(crypto.randomUUID())
    try {
      const result = await api<BookingOptions>(`/sessions/${session.id}/booking-options`)
      setOptions(result)
      setChoice(result.quotaAvailable ? 'quota' : 'single')
    } catch (error) {
      setSelected(null)
      show(message(error))
    }
  }
  async function createBooking() {
    if (!selected || !options) return
    setBusy(true)
    try {
      const created = await api<BookingCreated>('/bookings', {
        method: 'POST',
        headers: { 'Idempotency-Key': bookingKey },
        body: {
          sessionId: selected.id,
          paymentChoice: choice,
          useBalance: choice === 'single' && useBalance,
        },
      })
      setSelected(null)
      await Promise.all([loadSessions(), loadCustomer()])
      go('/dashboard')
      if (created.payment?.redirectUrl) {
        setPaymentLink(created.payment.redirectUrl)
        show('Kursi ditahan 15 menit. Buka pembayaran Midtrans Sandbox.')
      } else show('Booking berhasil dikonfirmasi.')
    } catch (error) {
      show(message(error))
    } finally {
      setBusy(false)
    }
  }
  async function cancelBooking(id: string) {
    if (!window.confirm('Batalkan booking ini sesuai batas pembatalan studio?')) return
    setBusy(true)
    try {
      await api(`/bookings/${id}/cancel`, { method: 'POST' })
      await Promise.all([loadCustomer(), loadSessions()])
      show('Booking dibatalkan. Status jatah dan saldo sudah diperbarui.')
    } catch (error) {
      show(message(error))
    } finally {
      setBusy(false)
    }
  }
  async function paymentAction(id: string, refresh: boolean) {
    setBusy(true)
    try {
      if (refresh) {
        await api(`/bookings/${id}/refresh-payment`, { method: 'POST' })
        await loadCustomer()
        await loadSessions()
        show('Status pembayaran diperbarui dari Midtrans.')
      } else {
        const detail = await api<{ redirectUrl: string | null }>(`/bookings/${id}`)
        if (!detail.redirectUrl)
          throw new Error('Tautan pembayaran tidak tersedia untuk booking ini.')
        setPaymentLink(detail.redirectUrl)
      }
    } catch (error) {
      show(message(error))
    } finally {
      setBusy(false)
    }
  }

  return {
    selected,
    setSelected,
    options,
    choice,
    setChoice,
    useBalance,
    setUseBalance,
    paymentLink,
    setPaymentLink,
    openBooking,
    createBooking,
    cancelBooking,
    paymentAction,
  }
}
