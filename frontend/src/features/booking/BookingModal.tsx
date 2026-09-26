import { ArrowRight, X } from 'lucide-react'
import type { BookingOptions, Session } from '../../shared/api'
import { formatDate, localTime, money } from '../../shared/format'

type Props = {
  selected: Session
  setSelected: (session: Session | null) => void
  options: BookingOptions | null
  choice: 'quota' | 'single'
  setChoice: (choice: 'quota' | 'single') => void
  useBalance: boolean
  setUseBalance: (value: boolean) => void
  busy: boolean
  createBooking: () => void
  timezone: string
}
export function BookingModal({
  selected,
  setSelected,
  options,
  choice,
  setChoice,
  useBalance,
  setUseBalance,
  busy,
  createBooking,
  timezone,
}: Props) {
  return (
    <div className="modal-backdrop" onClick={() => setSelected(null)}>
      <div
        className="booking-modal live-booking-modal"
        onClick={(event) => event.stopPropagation()}
      >
        <button className="modal-close" onClick={() => setSelected(null)} aria-label="Tutup">
          <X size={20} />
        </button>
        <span className="eyebrow">RESERVASI KELAS</span>
        <h2>{selected.title}</h2>
        <p>
          {formatDate(selected.localDate, { weekday: 'long', day: 'numeric', month: 'long' })} ·{' '}
          {localTime(selected.startsAt, timezone)} WITA
        </p>
        {!options ? (
          <p>Memeriksa pilihan booking...</p>
        ) : !options.bookable ? (
          <p className="live-error">{options.reason}</p>
        ) : (
          <>
            <div className="live-options">
              <label>
                <input
                  type="radio"
                  checked={choice === 'single'}
                  onChange={() => setChoice('single')}
                />{' '}
                Kelas satuan <strong>{money(options.singlePriceIdr)}</strong>
              </label>
              {options.quotaAvailable && (
                <label>
                  <input
                    type="radio"
                    checked={choice === 'quota'}
                    onChange={() => setChoice('quota')}
                  />{' '}
                  Pakai jatah member{' '}
                  <strong>{options.quotaTotal - options.quotaUsed} tersisa</strong>
                </label>
              )}
            </div>
            {choice === 'single' && options.singlePriceIdr > 0 && (
              <label className="live-checkbox">
                <input
                  type="checkbox"
                  checked={useBalance}
                  onChange={(event) => setUseBalance(event.target.checked)}
                />{' '}
                Gunakan saldo tersedia ({money(options.balanceIdr)})
              </label>
            )}
            <p className="live-note">
              Backend akan memeriksa kembali harga, kapasitas, hak akses, dan jatah saat booking
              dibuat.
            </p>
            <button
              className="button button-primary full-width"
              disabled={busy || options.seatsLeft < 1}
              onClick={() => void createBooking()}
            >
              {busy ? 'Memproses...' : 'Konfirmasi reservasi'} <ArrowRight size={16} />
            </button>
          </>
        )}
      </div>
    </div>
  )
}
