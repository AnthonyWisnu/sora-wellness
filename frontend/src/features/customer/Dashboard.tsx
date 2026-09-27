import { useState } from 'react'
import { ArrowRight, CreditCard, QrCode, Sparkles } from 'lucide-react'
import type { Actor, Booking, Membership, PackagePurchase, Payment } from '../../shared/api'
import { formatDate, localDateTime, localTime, money, statusName } from '../../shared/format'
import { CustomerProfilePanel } from './Profile'
import { CustomerLockerPanel } from './Locker'
import { CustomerWalletPanel } from './Wallet'
import { TicketModal } from './TicketModal'

type Props = {
  section: string
  actor: Actor
  member: boolean
  quota: Membership['quota'][number] | undefined
  balance: number
  bookings: Booking[]
  payments: Payment[]
  purchases: PackagePurchase[]
  timezone: string
  busy: boolean
  go: (path: string) => void
  paymentAction: (id: string, refresh: boolean) => void
  cancelBooking: (id: string) => void
  setPaymentLink: (url: string) => void
  refreshPackage: (id: string) => void
  show: (message: string) => void
  onNameChanged: (name: string) => void
}

export function CustomerDashboard({
  section,
  actor,
  member,
  quota,
  balance,
  bookings,
  payments,
  purchases,
  timezone,
  busy,
  go,
  paymentAction,
  cancelBooking,
  setPaymentLink,
  refreshPackage,
  show,
  onNameChanged,
}: Props) {
  const [ticketBooking, setTicketBooking] = useState<Booking | null>(null)
  return (
    <>
      {section === 'overview' && (
        <>
          <div className="live-stats">
            <div className="panel">
              <span className="eyebrow">STATUS PAKET</span>
              <h2>{member ? 'Member aktif' : 'Pelanggan'}</h2>
              <p>{member ? 'Akses semua tingkat kelas' : 'Anda dapat memesan kelas pemula.'}</p>
            </div>
            <div className="panel">
              <span className="eyebrow">JATAH BULAN INI</span>
              <h2>{quota ? `${Math.max(0, quota.total - quota.used)} / ${quota.total}` : '-'}</h2>
              <p>
                {quota ? `${quota.used} kelas sudah digunakan` : 'Belum ada paket aktif bulan ini.'}
              </p>
            </div>
            <div className="panel">
              <span className="eyebrow">SALDO KELAS</span>
              <h2>{money(balance)}</h2>
              <p>Hanya untuk pembelian kelas satuan.</p>
            </div>
          </div>

          {bookings.find((b) => b.status === 'confirmed') && (
            (() => {
              const nextBooking = bookings.find((b) => b.status === 'confirmed')!
              return (
                <div
                  className="panel"
                  style={{
                    margin: '18px 0',
                    background: 'linear-gradient(135deg, #17392e 0%, #1e4538 100%)',
                    color: '#fff',
                    borderRadius: '14px',
                    padding: '22px 24px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '20px',
                    flexWrap: 'wrap',
                    boxShadow: '0 8px 24px rgba(23, 57, 46, 0.15)',
                  }}
                >
                  <div>
                    <span
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        fontSize: '11px',
                        fontWeight: 700,
                        letterSpacing: '0.1em',
                        textTransform: 'uppercase',
                        color: 'rgba(255, 255, 255, 0.75)',
                        marginBottom: '6px',
                      }}
                    >
                      <Sparkles size={13} style={{ color: '#dcfce7' }} /> Sesi Terdekat Anda
                    </span>
                    <h3 style={{ margin: '0 0 6px', fontSize: '22px', fontWeight: 800, color: '#fff' }}>
                      {nextBooking.title}
                    </h3>
                    <p style={{ margin: 0, fontSize: '13.5px', color: 'rgba(255, 255, 255, 0.85)' }}>
                      {formatDate(nextBooking.localDate, {
                        weekday: 'long',
                        day: 'numeric',
                        month: 'long',
                      })}{' '}
                      · {localTime(nextBooking.startsAt, timezone)} WITA
                    </p>
                  </div>
                  <button
                    className="button"
                    style={{
                      background: '#fff',
                      color: '#17392e',
                      fontWeight: 700,
                      border: 'none',
                      padding: '12px 20px',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '8px',
                      borderRadius: '8px',
                      boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
                      cursor: 'pointer',
                    }}
                    onClick={() => setTicketBooking(nextBooking)}
                  >
                    <QrCode size={16} /> Buka E-Ticket Masuk
                  </button>
                </div>
              )
            })()
          )}
        </>
      )}
      {(section === 'overview' || section === 'bookings') && (
        <>
          <div className="live-section-head">
            <h2>{section === 'overview' ? 'Booking terdekat' : 'Booking Anda'}</h2>
            <button className="button button-outline" onClick={() => go('/jadwal')}>
              Pesan kelas <ArrowRight size={15} />
            </button>
          </div>
          <div className="live-booking-list">
            {bookings.length ? (
              (section === 'overview' ? bookings.slice(0, 3) : bookings).map((row) => (
                <article className="panel live-booking" key={row.id}>
                  <div>
                    <span className="eyebrow">
                      {formatDate(row.localDate, {
                        weekday: 'long',
                        day: 'numeric',
                        month: 'long',
                      })}
                    </span>
                    <h3>{row.title}</h3>
                    <p>
                      {localTime(row.startsAt, timezone)} WITA ·{' '}
                      {row.source === 'quota'
                        ? 'Jatah member'
                        : row.source === 'free'
                          ? 'Gratis'
                          : money(row.priceIdr)}
                    </p>
                  </div>
                  <div className="live-booking-actions">
                    <span
                      className={`tag ${row.status === 'confirmed' ? 'tag-green' : row.status === 'pending_payment' ? 'tag-gold' : 'tag-gray'}`}
                    >
                      {statusName(row.status)}
                    </span>
                    {row.status === 'confirmed' && (
                      <button
                        className="button button-outline"
                        style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                        onClick={() => setTicketBooking(row)}
                      >
                        <QrCode size={14} /> E-Ticket QR
                      </button>
                    )}
                    {row.status === 'pending_payment' && (
                      <>
                        <button
                          className="button button-primary"
                          disabled={busy}
                          onClick={() => void paymentAction(row.id, false)}
                        >
                          Lanjutkan bayar
                        </button>
                        <button
                          className="button button-text"
                          disabled={busy}
                          onClick={() => void paymentAction(row.id, true)}
                        >
                          Periksa status
                        </button>
                      </>
                    )}
                    {['confirmed', 'pending_payment'].includes(row.status) && (
                      <button
                        className="button button-text live-danger"
                        disabled={busy}
                        onClick={() => void cancelBooking(row.id)}
                      >
                        Batalkan
                      </button>
                    )}
                  </div>
                </article>
              ))
            ) : (
              <div className="panel">
                <p>Belum ada booking. Pilih kelas dari jadwal studio.</p>
              </div>
            )}
          </div>
          {section === 'overview' && bookings.length > 3 && (
            <button className="button button-text" onClick={() => go('/dashboard/bookings')}>
              Lihat semua booking <ArrowRight size={15} />
            </button>
          )}
        </>
      )}
      {section === 'membership' && (
        <>
          <div className="live-section-head">
            <h2>Riwayat pembayaran</h2>
          </div>
          <div className="panel">
            {payments.length ? (
              payments.slice(0, 8).map((row) => (
                <div className="live-payment-row" key={row.id}>
                  <CreditCard size={18} />
                  <span>{row.orderId}</span>
                  <strong>{money(row.grossAmountIdr)}</strong>
                  <span className={`tag ${row.status === "success" ? "tag-green" : row.status === "pending" ? "tag-gold" : "tag-gray"}`}>
                    {row.status === "success" ? "Berhasil" : row.status === "pending" ? "Menunggu" : row.status === "expired" ? "Kedaluwarsa" : row.status === "failed" ? "Gagal" : row.status}
                  </span>
                  {row.status === "pending" && row.redirectUrl && (
                    <button
                      className="button button-primary"
                      style={{ padding: "0.3rem 0.75rem", fontSize: "0.82rem", marginLeft: "auto" }}
                      onClick={() => setPaymentLink(row.redirectUrl!)}
                    >
                      Lanjutkan bayar
                    </button>
                  )}
                </div>
              ))
            ) : (
              <p>Belum ada transaksi gateway.</p>
            )}
          </div>
        </>
      )}
      {section === 'membership' && (
        <section className="live-package-history">
          <div className="live-section-head">
            <h2>Paket Anda</h2>
            <button className="button button-outline" onClick={() => go('/membership')}>
              Lihat paket <ArrowRight size={15} />
            </button>
          </div>
          <div className="live-booking-list">
            {purchases.length ? (
              purchases.map((purchase) => (
                <article className="panel live-booking" key={purchase.id}>
                  <div>
                    <span className="eyebrow">
                      {purchase.durationMonths} BULAN · {money(purchase.amountIdr)}
                    </span>
                    <h3>
                      {purchase.status === 'paid'
                        ? 'Paket terbayar'
                        : purchase.status === 'pending_payment'
                          ? 'Menunggu pembayaran'
                          : 'Pembayaran tidak selesai'}
                    </h3>
                    <p>
                      {purchase.startsOn && purchase.endsOn
                        ? `Aktif ${formatDate(purchase.startsOn)} s/d ${formatDate(purchase.endsOn)}`
                        : purchase.expiresAt
                          ? `Masa aktif dimulai setelah pembayaran berhasil. Bayar sebelum ${localDateTime(purchase.expiresAt, timezone)}.`
                          : 'Masa aktif dimulai setelah pembayaran berhasil.'}
                    </p>
                  </div>
                  {purchase.status === 'pending_payment' && (
                    <div className="live-booking-actions">
                      {purchase.payment?.redirectUrl && (
                        <button
                          className="button button-primary"
                          onClick={() => setPaymentLink(purchase.payment!.redirectUrl!)}
                        >
                          Lanjutkan bayar
                        </button>
                      )}
                      <button
                        className="button button-text"
                        disabled={busy}
                        onClick={() => void refreshPackage(purchase.id)}
                      >
                        Periksa status
                      </button>
                    </div>
                  )}
                </article>
              ))
            ) : (
              <div className="panel">
                <p>Belum ada paket. Lihat pilihan membership untuk mulai berlangganan.</p>
              </div>
            )}
          </div>
        </section>
      )}
      {section === 'wallet' && (
        <>
          <CustomerWalletPanel balance={balance} timezone={timezone} show={show} />
          {member && <CustomerLockerPanel show={show} />}
        </>
      )}
      {section === 'profile' && (
        <CustomerProfilePanel
          actor={actor}
          timezone={timezone}
          onNameChanged={onNameChanged}
          show={show}
        />
      )}
      {ticketBooking && (
        <TicketModal
          booking={ticketBooking}
          actor={actor}
          timezone={timezone}
          onClose={() => setTicketBooking(null)}
        />
      )}
    </>
  )
}
