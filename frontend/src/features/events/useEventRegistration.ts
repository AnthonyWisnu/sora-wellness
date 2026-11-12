import { useCallback, useEffect, useRef, useState } from 'react'
import { api, type Actor } from '../../shared/api'
import { errorMessage } from '../../shared/errors'
import type { CommunityEvent } from '../admin/events/event-types'
import { usePaymentWatcher, type ActivePayment } from '../booking/usePaymentWatcher'
import { paymentFeedback, type PaymentStatusResponse } from '../booking/payment-feedback'
import type { EventTicket } from './event-types'

type Options = {
  slug: string; actor: Actor | null; authReady: boolean
  show: (text: string) => void; go: (path: string) => void
}

export function useEventRegistration({ slug, actor, authReady, show, go }: Options) {
  const [event, setEvent] = useState<CommunityEvent | null>(null)
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState('')
  const [busy, setBusy] = useState(false)
  const [ticket, setTicket] = useState<EventTicket | null>(null)
  const [activePayment, setActivePayment] = useState<ActivePayment | null>(null)
  const keys = useRef<Record<string,string>>({})
  const activity = event?.activities?.find(item=>item.id===selected)
  const paid = (activity?.priceIdr ?? 0)>0

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const value = await api<CommunityEvent>(`/public/events/${encodeURIComponent(slug)}`)
      setEvent(value)
      const requested = new URLSearchParams(window.location.search).get('activity')
      setSelected(value.activities?.find(item=>item.id===requested)?.id ?? value.activities?.[0]?.id ?? '')
    } catch (error) { show(errorMessage(error)) }
    finally { setLoading(false) }
  },[slug,show])
  useEffect(()=>{ void load() },[load])

  const reloadTicket = useCallback(async () => {
    if (ticket && actor?.role==='customer') setTicket(await api<EventTicket>(`/events/registrations/${ticket.id}`))
  },[ticket,actor])
  const watcher = usePaymentWatcher({ activePayment, setActivePayment, onSuccess: reloadTicket, show })

  useEffect(()=>{
    if (!authReady || !event || !selected) return
    let live = true
    const query = new URLSearchParams(window.location.search)
    const registration = query.get('registration')
    const accessToken = new URLSearchParams(window.location.hash.slice(1)).get('ticket')
    void (async()=>{
      try {
        let found: EventTicket | null = null
        if (actor?.role==='customer') {
          if (registration && /^[a-f0-9-]{36}$/.test(registration)) {
            if (query.has('payment')) {
              const status=await api<PaymentStatusResponse>(`/events/registrations/${registration}/refresh-payment`,{method:'POST'})
              if(live) show(paymentFeedback('event',status).message)
            }
            found=await api<EventTicket>(`/events/registrations/${registration}`)
          } else if (paid) found=await api<EventTicket | null>(`/events/${encodeURIComponent(slug)}/my-registration?activityId=${selected}`)
        }
        if (!found && accessToken && /^[a-f0-9]{64}$/.test(accessToken)) found=await api<EventTicket>(`/public/events/ticket/${accessToken}`)
        if(live) setTicket(found)
      } catch(error) { if(live) show(errorMessage(error)) }
    })()
    return ()=>{live=false}
  },[authReady,event,selected,paid,slug,actor,show])

  function remember(row: EventTicket) {
    setTicket(row)
    const target=new URL(window.location.href)
    target.searchParams.delete('payment');target.searchParams.delete('order_id')
    if(row.payment) target.searchParams.set('registration',row.id)
    if(row.ticketAccessToken) target.hash='ticket='+row.ticketAccessToken
    window.history.replaceState({},'',target.pathname+target.search+target.hash)
    if(row.payment?.redirectUrl && row.status==='pending_payment') {
      setActivePayment({kind:'event',id:row.id,orderId:row.payment.orderId,url:row.payment.redirectUrl})
    }
  }

  async function submit(guest: { guestName: string; guestEmail: string; guestPhone?: string }) {
    if (busy || !activity) return
    if(paid && !actor) {
      go('/masuk?returnTo='+encodeURIComponent(`/events/${slug}?activity=${selected}`))
      show('Masuk ke akun pelanggan untuk membayar kegiatan ini.')
      return
    }
    if(paid && actor?.role!=='customer') {show('Pembayaran kegiatan tersedia untuk akun pelanggan.');return}
    setBusy(true)
    try {
      if(paid) {
        const key=keys.current[selected] ?? crypto.randomUUID()
        keys.current[selected]=key
        const row=await api<EventTicket>(`/events/${encodeURIComponent(slug)}/checkout`,{method:'POST',headers:{'Idempotency-Key':key},body:{activityId:selected}})
        remember(row)
        delete keys.current[selected]
      } else {
        const row=await api<EventTicket>(`/public/events/${encodeURIComponent(slug)}/register`,{method:'POST',body:{activityId:selected,...guest}})
        remember(row)
        show('Pendaftaran dikonfirmasi. Simpan tiket kegiatan Anda.')
      }
    } catch(error) {
      show(errorMessage(error))
      if(paid && actor?.role==='customer') {
        try {setTicket(await api<EventTicket | null>(`/events/${encodeURIComponent(slug)}/my-registration?activityId=${selected}`))} catch { /* Error utama tetap terlihat. */ }
      }
    } finally {setBusy(false)}
  }

  async function resume() {
    if(!ticket || busy) return
    setBusy(true)
    try {
      const payment=await api<{redirectUrl: string}>(`/events/registrations/${ticket.id}/resume-payment`,{method:'POST'})
      setActivePayment({kind:'event',id:ticket.id,url:payment.redirectUrl,orderId:ticket.payment?.orderId})
    } catch(error){show(errorMessage(error));await reloadTicket().catch(()=>undefined)}
    finally{setBusy(false)}
  }

  return {event,loading,selected,setSelected,activity,paid,busy,ticket,submit,resume,activePayment,setActivePayment,watcher,load}
}
