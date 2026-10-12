import { useState, type FormEvent } from 'react'
import { Calendar, Check, Search, UserCheck } from 'lucide-react'
import type { EligibleMember } from '../../../shared/api'
import { formatDate } from '../../../shared/format'
import { AdminDialog } from '../AdminDialog'

type Props = {
  open: boolean
  lockerCode: string
  members: EligibleMember[]
  busy: boolean
  onClose: () => void
  onAssign: (customerId: string) => Promise<void>
  onSearch: (q: string) => void
}

export function LockerAssignDialog({
  open,
  lockerCode,
  members,
  busy,
  onClose,
  onAssign,
  onSearch,
}: Props) {
  const [search, setSearch] = useState('')
  const [selectedCustomerId, setSelectedCustomerId] = useState('')

  function handleSearchChange(val: string) {
    setSearch(val)
    onSearch(val)
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!selectedCustomerId) return
    await onAssign(selectedCustomerId)
    setSelectedCustomerId('')
    setSearch('')
  }

  return (
    <AdminDialog
      open={open}
      title={`Tetapkan Loker ${lockerCode}`}
      description="Pilih member dengan paket aktif untuk menggunakan kompartemen ini."
      onClose={() => {
        setSelectedCustomerId('')
        setSearch('')
        onClose()
      }}
    >
      <form className="live-form admin-dialog-form" onSubmit={(e) => void handleSubmit(e)}>
        <div className="admin-locker-search-box" style={{ width: '100%', marginBottom: '12px' }}>
          <Search size={14} style={{ color: 'var(--muted)', flexShrink: 0 }} />
          <input
            type="text"
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder="Ketik nama atau email member..."
          />
        </div>

        <div className="admin-locker-member-selection-list">
          {members.length > 0 ? (
            members.map((member) => {
              const isSelected = selectedCustomerId === member.id
              const initials = member.fullName
                .split(' ')
                .filter(Boolean)
                .map((n) => n[0])
                .join('')
                .slice(0, 2)
                .toUpperCase()

              return (
                <div
                  key={member.id}
                  className={`admin-locker-member-card ${isSelected ? 'selected' : ''}`}
                  onClick={() => setSelectedCustomerId(member.id)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault()
                      setSelectedCustomerId(member.id)
                    }
                  }}
                >
                  <div className="admin-locker-member-avatar">{initials}</div>
                  <div className="admin-locker-member-details">
                    <strong className="admin-locker-member-name">{member.fullName}</strong>
                    <span className="admin-locker-member-email">{member.email}</span>
                    <span className="admin-locker-member-package">
                      <Calendar size={11} /> Paket aktif s/d {formatDate(member.membershipEndsOn)}
                    </span>
                  </div>
                  <div className="admin-locker-member-radio">
                    {isSelected ? <Check size={14} /> : null}
                  </div>
                </div>
              )
            })
          ) : (
            <div className="admin-locker-empty-members">
              <UserCheck size={28} style={{ color: 'var(--muted)', opacity: 0.5 }} />
              <p>
                {search
                  ? 'Tidak ada member yang cocok dengan pencarian.'
                  : 'Semua member aktif sudah memiliki loker.'}
              </p>
            </div>
          )}
        </div>

        <div className="admin-form-actions" style={{ marginTop: '16px' }}>
          <button
            className="button button-primary"
            disabled={busy || !selectedCustomerId}
          >
            <Check size={15} /> Tetapkan ke Loker {lockerCode}
          </button>
          <button
            type="button"
            className="button button-text"
            onClick={() => {
              setSelectedCustomerId('')
              setSearch('')
              onClose()
            }}
          >
            Batal
          </button>
        </div>
      </form>
    </AdminDialog>
  )
}
