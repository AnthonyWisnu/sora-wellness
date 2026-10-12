import { useEffect, useState } from 'react'
import { Plus, Trash2, UserPlus } from 'lucide-react'
import type { ActivityInput } from './event-types'
import { referenceData, type Coach } from '../management-common'
import type { AdminClassType } from '../../../shared/api'

type Props = {
  activities: ActivityInput[]
  onChange: (items: ActivityInput[]) => void
  show: (msg: string) => void
}

export function EventActivitiesInput({ activities, onChange, show }: Props) {
  const [classTypes, setClassTypes] = useState<AdminClassType[]>([])
  const [coaches, setCoaches] = useState<Coach[]>([])

  useEffect(() => {
    void referenceData()
      .then(([types, people]) => {
        setClassTypes(types)
        setCoaches(people)
      })
      .catch(() => undefined)
  }, [])

  function addActivity() {
    if (activities.length >= 6) {
      show('Maksimal 6 sub-kegiatan dalam satu event.')
      return
    }
    const defaultClass = classTypes[0]
    const defaultCoach = coaches[0]
    onChange([
      ...activities,
      {
        title: defaultClass?.title ?? 'Sesi Komunitas Terbuka',
        category: defaultClass?.category ?? 'Komunitas',
        classTypeId: defaultClass?.id,
        coachId: defaultCoach?.id,
        coachName: defaultCoach?.fullName ?? 'Instruktur Studio',
        isGuestCoach: false,
        guestCoachName: '',
        startTime: '07:00',
        endTime: '08:30',
        capacity: 25,
        priceIdr: 0,
      },
    ])
  }

  function removeActivity(index: number) {
    if (activities.length <= 1) {
      show('Minimal wajib ada 1 kegiatan dalam event.')
      return
    }
    onChange(activities.filter((_, i) => i !== index))
  }

  function updateRow(idx: number, patch: Partial<ActivityInput>) {
    const next = [...activities]
    next[idx] = { ...next[idx], ...patch }
    onChange(next)
  }

  function handleClassSelect(idx: number, classTypeId: string) {
    if (classTypeId === 'custom') {
      updateRow(idx, { classTypeId: undefined, title: 'Sesi Spesial Tematik', category: 'Komunitas' })
      return
    }
    const selected = classTypes.find((c) => c.id === classTypeId)
    if (selected) {
      updateRow(idx, {
        classTypeId: selected.id,
        title: selected.title,
        category: selected.category,
      })
    }
  }

  function handleCoachSelect(idx: number, coachVal: string) {
    if (coachVal === 'guest') {
      updateRow(idx, { isGuestCoach: true, coachId: undefined, coachName: 'Instruktur Tamu' })
      return
    }
    const selected = coaches.find((c) => c.id === coachVal)
    if (selected) {
      updateRow(idx, {
        isGuestCoach: false,
        coachId: selected.id,
        coachName: selected.fullName,
        guestCoachName: '',
      })
    }
  }

  return (
    <div className="event-activities-form-block">
      <div className="activities-header-bar">
        <span className="eyebrow">SUB-KEGIATAN & KELAS (MAKS. 6 JENIS)</span>
        <button type="button" className="button button-outline" onClick={addActivity}>
          <Plus size={13} /> Tambah Kegiatan
        </button>
      </div>

      <div className="activities-list-container">
        {activities.map((act, idx) => (
          <div key={idx} className="activity-card-row panel">
            <div className="activity-inputs-grid">
              <label>
                Katalog Jenis Kelas
                <select
                  value={act.classTypeId ?? 'custom'}
                  onChange={(e) => handleClassSelect(idx, e.target.value)}
                >
                  <option value="custom">Sesi Khusus Tematik (Kustom)</option>
                  {classTypes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.title} ({c.category})
                    </option>
                  ))}
                </select>
              </label>

              {!act.classTypeId && (
                <label>
                  Judul Sesi Kustom
                  <input
                    placeholder="Nama kegiatan"
                    value={act.title}
                    onChange={(e) => updateRow(idx, { title: e.target.value })}
                    required
                  />
                </label>
              )}

              <label>
                Instruktur Pengajar
                <select
                  value={act.isGuestCoach ? 'guest' : (act.coachId ?? '')}
                  onChange={(e) => handleCoachSelect(idx, e.target.value)}
                >
                  {coaches.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.fullName} (Pelatih Studio)
                    </option>
                  ))}
                  <option value="guest">Instruktur Tamu Eksternal</option>
                </select>
              </label>

              {act.isGuestCoach && (
                <label>
                  Nama Instruktur Tamu
                  <div className="input-with-icon">
                    <UserPlus size={14} className="input-icon-lead" />
                    <input
                      placeholder="Nama instruktur tamu"
                      value={act.guestCoachName ?? ''}
                      onChange={(e) =>
                        updateRow(idx, {
                          guestCoachName: e.target.value,
                          coachName: e.target.value || 'Instruktur Tamu',
                        })
                      }
                      required
                    />
                  </div>
                </label>
              )}

              <div className="time-split-row">
                <label>
                  Jam Mulai
                  <input
                    type="time"
                    value={act.startTime}
                    onChange={(e) => updateRow(idx, { startTime: e.target.value })}
                    required
                  />
                </label>
                <label>
                  Jam Selesai
                  <input
                    type="time"
                    value={act.endTime}
                    onChange={(e) => updateRow(idx, { endTime: e.target.value })}
                    required
                  />
                </label>
              </div>

              <label>
                Kapasitas Matras
                <input
                  type="number"
                  min={1}
                  max={500}
                  value={act.capacity}
                  onChange={(e) => updateRow(idx, { capacity: Number(e.target.value) })}
                  required
                />
              </label>
            </div>

            <div className="activity-row-actions">
              <button
                type="button"
                className="icon-button live-danger"
                onClick={() => removeActivity(idx)}
                aria-label="Hapus kegiatan"
                title="Hapus kegiatan"
              >
                <Trash2 size={16} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
