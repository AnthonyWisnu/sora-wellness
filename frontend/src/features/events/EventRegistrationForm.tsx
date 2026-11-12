import { useState, type FormEvent } from 'react'
import { Clock, User, Users } from 'lucide-react'
import type { Actor } from '../../shared/api'
import { formatDate, money } from '../../shared/format'
import type { EventActivity } from '../admin/events/event-types'

type Props = {
  activities: EventActivity[]; selected: string; select: (id: string)=>void
  paid: boolean; busy: boolean; actor: Actor | null; timezone: string
  submit: (guest: {guestName: string; guestEmail: string; guestPhone?: string})=>Promise<void>
}

export function EventRegistrationForm({activities,selected,select,paid,busy,actor,timezone,submit}: Props) {
  const [name,setName]=useState(actor?.fullName ?? '')
  const [email,setEmail]=useState(actor?.email ?? '')
  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    await submit({guestName:name.trim(),guestEmail:email.trim()})
  }
  return <form className="live-form event-registration" onSubmit={event=>void handleSubmit(event)}>
    <fieldset className="event-activity-options">
      <legend>Pilih kegiatan</legend>
      {activities.map(activity=><label className="event-activity-option" key={activity.id}>
        <input type="radio" name="activity" value={activity.id} checked={selected===activity.id} onChange={()=>select(activity.id)} required/>
        <span className="event-activity-copy">
          <strong>{activity.title}</strong>
          <span>{activity.localDate ? formatDate(activity.localDate,{dateStyle:'long'}) : 'Tanggal belum ditetapkan'}</span>
          <span><Clock size={16} aria-hidden="true"/> {activity.startTime} - {activity.endTime}, {timezone}</span>
          <span><User size={16} aria-hidden="true"/> {activity.coachName}</span>
          <span><Users size={16} aria-hidden="true"/> {activity.seatsLeft ?? activity.capacity} kursi tersedia</span>
          <strong>{activity.priceIdr>0 ? money(activity.priceIdr) : 'Gratis'}</strong>
        </span>
      </label>)}
    </fieldset>
    {paid ? <div className="event-payment-summary">
      <h2>Daftar dengan akun pelanggan</h2>
      <p>{actor?.role==='customer' ? `Tiket akan terdaftar atas nama ${actor.fullName} (${actor.email}).` : 'Masuk terlebih dahulu. Tiket diterbitkan setelah pembayaran dikonfirmasi.'}</p>
      <p>Pendaftaran ditutup 15 menit sebelum kegiatan. Kursi ditahan selama 15 menit sejak checkout.</p>
      <p>Jika pembayaran terlambat dan kursi tidak tersedia, dana masuk ke wallet Anda.</p>
      <small>Prototipe penelitian. Pembayaran menggunakan Midtrans Sandbox tanpa uang riil.</small>
    </div> : <>
      <label>Nama lengkap<input autoComplete="name" required minLength={2} maxLength={100} value={name} onChange={e=>setName(e.target.value)}/></label>
      <label>Email<input autoComplete="email" required type="email" value={email} onChange={e=>setEmail(e.target.value)}/></label>
    </>}
    <button className="button button-primary" disabled={busy || (paid && Boolean(actor) && actor?.role!=='customer')}>
      {busy ? 'Memproses...' : paid ? actor ? 'Lanjutkan ke pembayaran' : 'Masuk untuk mendaftar' : 'Daftar kegiatan gratis'}
    </button>
  </form>
}
