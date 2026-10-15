import { ArrowRight, RefreshCw, X } from 'lucide-react'
import type { ActivePayment } from './usePaymentWatcher'

type Props = {
  payment: ActivePayment | null
  onClose: () => void
  onManualRefresh?: () => void
  refreshing?: boolean
}

export function PaymentModal({
  payment,
  onClose,
  onManualRefresh,
  refreshing = false,
}: Props) {
  if (!payment) return null

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="booking-modal live-payment-modal"
        onClick={(event) => event.stopPropagation()}
      >
        <button className="modal-close" onClick={onClose} aria-label="Tutup">
          <X size={20} />
        </button>
        <span className="eyebrow">MIDTRANS SANDBOX</span>
        <h2>Lanjutkan pembayaran</h2>
        <p>
          Buka halaman pembayaran Sandbox. Sistem akan secara otomatis mendeteksi ketika pembayaran Anda selesai dan memperbarui status pesanan Anda.
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '16px' }}>
          <a
            className="button button-primary full-width"
            href={payment.url}
            target="_blank"
            rel="noopener noreferrer"
          >
            Buka halaman pembayaran <ArrowRight size={17} />
          </a>
          {onManualRefresh && (
            <button
              type="button"
              className="button button-outline full-width"
              onClick={onManualRefresh}
              disabled={refreshing}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
            >
              <RefreshCw size={15} style={refreshing ? { animation: 'spin 1s linear infinite' } : undefined} />
              {refreshing ? 'Memeriksa status...' : 'Perbarui status'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
