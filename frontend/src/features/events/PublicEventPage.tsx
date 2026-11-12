import { MapPin, RefreshCw } from 'lucide-react'
import type { Actor } from '../../shared/api'
import { formatDate } from '../../shared/format'
import { PaymentModal } from '../booking/PaymentModal'
import { useEventRegistration } from './useEventRegistration'
import { EventRegistrationForm } from './EventRegistrationForm'
import { EventTicketView } from './EventTicketView'
import './PublicEventPage.css'

type Props = {
  slug: string; go: (path: string)=>void; show: (text: string)=>void
  actor: Actor | null; authReady: boolean; timezone: string
}

export function PublicEventPage(props: Props) {
  const flow=useEventRegistration(props)
  const {event,ticket}=flow
  if(flow.loading || !props.authReady) return <main className="public-event-page" aria-busy="true"><p role="status">Memuat informasi kegiatan...</p></main>
  if(!event) return <main className="public-event-page">
    <h1>Event belum dapat ditampilkan</h1>
    <p>Periksa koneksi Anda atau kembali ke daftar kegiatan.</p>
    <button className="button button-outline" onClick={()=>void flow.load()}><RefreshCw size={18}/> Coba lagi</button>
    <button className="button button-text" onClick={()=>props.go('/')}>Kembali ke beranda</button>
  </main>
  const validTicket=ticket && ['registered','attended'].includes(ticket.status)
  const awaiting=ticket?.status==='pending_payment'
  return <main className="public-event-page">
    <header className="event-page-header no-print">
      <p>Kegiatan komunitas</p>
      <h1>{event.title}</h1>
      <p>{event.description}</p>
      <p>{formatDate(event.startDate,{dateStyle:'long'})}{event.endDate!==event.startDate && ` sampai ${formatDate(event.endDate,{dateStyle:'long'})}`}</p>
      <p><MapPin size={18} aria-hidden="true"/> {event.locationName}</p>
      <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${event.locationName} ${event.locationAddress ?? ''}`)}`} target="_blank" rel="noopener noreferrer">Lihat lokasi di Google Maps</a>
    </header>
    {validTicket ? <EventTicketView ticket={ticket} title={event.title} location={event.locationName} go={props.go}/>
      : awaiting ? <section className="event-order-state panel" aria-labelledby="event-order-title">
        <h2 id="event-order-title">Selesaikan pembayaran kegiatan</h2>
        <p>{ticket.activityTitle}</p>
        <p>Kursi sedang ditahan. Tiket tersedia setelah pembayaran dikonfirmasi.</p>
        {ticket.holdExpiresAt && <p>Batas pembayaran: {new Intl.DateTimeFormat('id-ID',{timeZone:props.timezone,dateStyle:'medium',timeStyle:'short'}).format(new Date(ticket.holdExpiresAt))}</p>}
        <button className="button button-primary" onClick={()=>void flow.resume()} disabled={flow.busy}>Lanjutkan pembayaran</button>
      </section>
      : <>
        {ticket && <section role="status" className="event-order-state panel">
          <h2>{ticket.status==='credited' ? 'Dana masuk ke wallet' : 'Pendaftaran sebelumnya telah berakhir'}</h2>
          <p>{ticket.status==='credited' ? 'Tiket tidak diterbitkan. Periksa kredit pembayaran di riwayat wallet Anda.' : 'Anda dapat memilih kegiatan dan membuat pendaftaran baru jika masih tersedia.'}</p>
          <button className="button button-outline" onClick={()=>props.go('/dashboard')}>Lihat akun saya</button>
        </section>}
        <EventRegistrationForm activities={event.activities ?? []} selected={flow.selected} select={flow.setSelected} paid={flow.paid} busy={flow.busy} actor={props.actor} timezone={props.timezone} submit={flow.submit}/>
      </>}
    {flow.activePayment && <PaymentModal payment={flow.activePayment} onClose={()=>flow.setActivePayment(null)} refreshing={flow.watcher.refreshing} onManualRefresh={()=>void flow.watcher.manualRefresh()}/>}
  </main>
}
