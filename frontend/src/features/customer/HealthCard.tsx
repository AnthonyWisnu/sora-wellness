import { useEffect, useState, type FormEvent } from 'react'
import { HeartPulse, Trash2 } from 'lucide-react'
import { api, type HealthProfile } from '../../shared/api'
import { localDateTime } from '../../shared/format'
import { errorMessage } from '../../shared/errors'
import { useConfirm } from '../../shared/confirm-context'

type HealthCardProps = {
  health: HealthProfile | null
  setHealth: (profile: HealthProfile | null) => void
  timezone: string
  show: (text: string) => void
}

export function HealthCard({ health, setHealth, timezone, show }: HealthCardProps) {
  const confirm = useConfirm()
  const [note, setNote] = useState(health?.note ?? '')
  const [consent, setConsent] = useState(false)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (health?.note !== undefined) {
      setNote(health?.note ?? '')
    }
  }, [health?.note])

  async function saveHealth(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setBusy(true)
    try {
      const saved = await api<HealthProfile>('/me/health', {
        method: 'PUT',
        body: { note: note.trim(), consent },
      })
      setHealth(saved)
      setNote(saved.note ?? '')
      setConsent(false)
      show('Catatan kesehatan tersimpan untuk pelatih kelas Anda.')
    } catch (error) {
      show(errorMessage(error))
    } finally {
      setBusy(false)
    }
  }

  async function deleteHealth() {
    if (
      !(await confirm({
        title: 'Hapus data kesehatan?',
        description:
          'Catatan kesehatan dan semua salinan pada kelas Anda akan dihapus. Tindakan ini tidak dapat dibatalkan.',
        confirmLabel: 'Hapus data',
        tone: 'danger',
      }))
    )
      return
    setBusy(true)
    try {
      await api('/me/health', { method: 'DELETE' })
      setHealth({ note: null, consentedAt: null, updatedAt: null })
      setNote('')
      setConsent(false)
      show('Catatan kesehatan dan snapshot kelas dihapus.')
    } catch (error) {
      show(errorMessage(error))
    } finally {
      setBusy(false)
    }
  }

  return (
    <form className="panel live-form" onSubmit={(event) => void saveHealth(event)}>
      <span className="eyebrow">
        <HeartPulse size={15} /> CATATAN KESEHATAN OPSIONAL
      </span>
      <p>
        Isi hanya kondisi yang perlu diketahui pelatih untuk kelas Anda. Pelatih lain dan admin
        tidak dapat membaca isinya.
      </p>
      <label>
        Catatan untuk pelatih
        <textarea
          value={note}
          maxLength={2000}
          rows={5}
          onChange={(event) => setNote(event.target.value)}
          placeholder="Contoh: sedang pemulihan setelah cedera lutut"
          required
        />
      </label>
      <label className="live-checkbox">
        <input
          type="checkbox"
          checked={consent}
          onChange={(event) => setConsent(event.target.checked)}
          required
        />{' '}
        Saya setuju catatan ini digunakan oleh pelatih kelas yang saya ikuti.
      </label>
      <div className="live-profile-actions">
        <button className="button button-primary" disabled={busy || !consent || !note.trim()}>
          Simpan catatan
        </button>
        {health?.note && (
          <button
            className="button button-text live-danger"
            type="button"
            disabled={busy}
            onClick={() => void deleteHealth()}
          >
            <Trash2 size={15} /> Hapus semua data kesehatan
          </button>
        )}
      </div>
      {health?.updatedAt && (
        <small>Terakhir diperbarui: {localDateTime(health.updatedAt, timezone)}</small>
      )}
    </form>
  )
}
