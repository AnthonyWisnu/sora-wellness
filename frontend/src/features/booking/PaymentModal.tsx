import { ArrowRight, X } from 'lucide-react'

type Props = { paymentLink: string; setPaymentLink: (value: string) => void }
export function PaymentModal({ paymentLink, setPaymentLink }: Props) {
  return (
    <div className="modal-backdrop" onClick={() => setPaymentLink('')}>
      <div
        className="booking-modal live-payment-modal"
        onClick={(event) => event.stopPropagation()}
      >
        <button className="modal-close" onClick={() => setPaymentLink('')} aria-label="Tutup">
          <X size={20} />
        </button>
        <span className="eyebrow">MIDTRANS SANDBOX</span>
        <h2>Lanjutkan pembayaran</h2>
        <p>
          Buka halaman pembayaran Sandbox. Setelah kembali, pilih “Periksa status” pada transaksi di
          dashboard.
        </p>
        <a
          className="button button-primary full-width"
          href={paymentLink}
          target="_blank"
          rel="noopener noreferrer"
        >
          Buka halaman pembayaran <ArrowRight size={17} />
        </a>
      </div>
    </div>
  )
}
