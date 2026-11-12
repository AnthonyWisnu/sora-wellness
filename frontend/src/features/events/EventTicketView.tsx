import { useEffect, useState } from 'react'
import { CheckCircle2, Printer } from 'lucide-react'
import QRCode from 'qrcode'
import { formatDate } from '../../shared/format'
import type { EventTicket } from './event-types'

type Props = { ticket: EventTicket; location: string; title: string; go: (path: string)=>void }

export function EventTicketView({ticket,location,title,go}: Props) {
  const [qr,setQr]=useState('')
  const code=ticket.ticketCode
  useEffect(()=>{
    let live=true
    if(code) void QRCode.toDataURL(code,{width:240,margin:1,color:{dark:'#203e32',light:'#ffffff'}}).then(value=>{if(live)setQr(value)})
    return ()=>{live=false}
  },[code])
  if(!code || !['registered','attended'].includes(ticket.status)) return null
  return <section className="event-ticket panel" aria-labelledby="event-ticket-title">
    <span className="tag tag-green"><CheckCircle2 size={16} aria-hidden="true"/> Pendaftaran dikonfirmasi</span>
    <h2 id="event-ticket-title">Tiket kegiatan</h2>
    <p>{title}</p>
    <dl className="event-ticket-details">
      <div><dt>Peserta</dt><dd>{ticket.guestName}</dd></div>
      <div><dt>Kegiatan</dt><dd>{ticket.activityTitle}</dd></div>
      {ticket.localDate && <div><dt>Tanggal</dt><dd>{formatDate(ticket.localDate,{dateStyle:'long'})}</dd></div>}
      <div><dt>Lokasi</dt><dd>{location}</dd></div>
    </dl>
    {qr && <img width={180} height={180} src={qr} alt="Kode QR tiket untuk verifikasi panitia"/>}
    <p className="event-ticket-code">{code}</p>
    <p>Tunjukkan QR atau kode tiket ini kepada panitia saat tiba.</p>
    <div className="event-actions no-print">
      <button className="button button-outline" onClick={()=>window.print()}><Printer size={18} aria-hidden="true"/> Cetak tiket</button>
      <button className="button button-primary" onClick={()=>go('/')}>Kembali ke beranda</button>
    </div>
    {ticket.ticketAccessToken && <small className="no-print">Simpan alamat halaman ini untuk membuka tiket kembali. Jangan bagikan tautan tiket.</small>}
  </section>
}
