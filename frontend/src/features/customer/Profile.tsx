import { useEffect, useState, type FormEvent } from 'react'
import { Check } from 'lucide-react'
import { api, type Actor, type HealthProfile } from '../../shared/api'
import { errorMessage } from '../../shared/errors'
import { AvatarUpload } from './AvatarUpload'
import { HealthCard } from './HealthCard'
import '../dashboard/Panels.css'

export function CustomerProfilePanel({
  actor,
  timezone,
  onNameChanged,
  onAvatarChanged,
  show,
}: {
  actor: Actor
  timezone: string
  onNameChanged: (name: string) => void
  onAvatarChanged?: (url: string | null) => void
  show: (text: string) => void
}) {
  const [name, setName] = useState(actor.fullName)
  const [health, setHealth] = useState<HealthProfile | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    let active = true
    void api<HealthProfile>('/me/health')
      .then((value) => {
        if (active) setHealth(value)
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

  return (
    <section className="live-profile-section">
      <div className="live-section-head">
        <h2>Profil & kesehatan</h2>
      </div>
      <div className="live-profile-grid">
        <div className="panel live-profile-left">
          <AvatarUpload
            currentAvatarUrl={actor.avatarUrl}
            fullName={actor.fullName}
            onAvatarChanged={(url) => {
              if (onAvatarChanged) onAvatarChanged(url)
            }}
            show={show}
          />
          <form className="live-form" onSubmit={(event) => void saveName(event)}>
            <span className="eyebrow">INFORMASI PENGGUNA</span>
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
        </div>
        <HealthCard
          health={health}
          setHealth={setHealth}
          timezone={timezone}
          show={show}
        />
      </div>
    </section>
  )
}
