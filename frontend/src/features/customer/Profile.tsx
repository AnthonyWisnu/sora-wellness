import { useEffect, useState, type FormEvent } from 'react'
import { Check, HeartPulse, Trash2 } from 'lucide-react'
import { api, type Actor, type HealthProfile } from '../../shared/api'
import { localDateTime } from '../../shared/format'
import { errorMessage } from '../../shared/errors'
import { useConfirm } from '../../shared/confirm-context'
import '../dashboard/Panels.css'

export function CustomerProfilePanel({
  actor,
  timezone,
  onNameChanged,
  show,
}: {
  actor: Actor
  timezone: string
  onNameChanged: (name: string) => void
  show: (text: string) => void
}) {
  const confirm = useConfirm()
  const [name, setName] = useState(actor.fullName)
  const [health, setHealth] = useState<HealthProfile | null>(null)
  const [note, setNote] = useState('')
  const [consent, setConsent] = useState(false)
  const [busy, setBusy] = useState(false)
  useEffect(() => {
    let active = true
    void api<HealthProfile>('/me/health')
      .then((value) => {
        if (active) {
          setHealth(value)
          setNote(value.note ?? '')
        }
      })
      .catch((error) => {
        if (active) show(errorMessage(error))
      })
    return () => {
      active = false
    }
  }, [show])

  async function saveName(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setBusy(true)
    try {
      const result = await api<{ fullName: string }>('/me', {
        method: 'PATCH',
        body: { fullName: name.trim() },
      })
      setName(result.fullName)
      onNameChanged(result.fullName)
      show('Nama profil diperbarui.')
    } catch (error) {
      show(errorMessage(error))
    } finally {
      setBusy(false)
    }
  }
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
      setHealth(
        await api<HealthProfile>('/me/health', { method: 'DELETE' }).then(() => ({
          note: null,
          consentedAt: null,
          updatedAt: null,
        })),
      )
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
    <section className="live-profile-section">
      <div className="live-section-head">
        <h2>Profil & kesehatan</h2>
      </div>
      <div className="live-profile-grid">
        <form className="panel live-form" onSubmit={(event) => void saveName(event)}>
          <span className="eyebrow">PROFIL SAYA</span>
          <label>
            Nama lengkap
            <input
              value={name}
              minLength={2}
              maxLength={100}
              onChange={(event) => setName(event.target.value)}
              required
            />
          </label>
          <label>
            Email
            <input value={actor.email} readOnly aria-readonly="true" />
          </label>
          <button className="button button-outline" disabled={busy}>
            Simpan profil <Check size={16} />
          </button>
        </form>
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
              placeholder="Contoh: sedang pemulihan setelah patah tulang"
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
      </div>
    </section>
  )
}
