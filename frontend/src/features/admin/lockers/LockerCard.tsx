import { Calendar, LockKeyhole, RefreshCw, Wrench } from 'lucide-react'
import type { AdminLocker } from '../../../shared/api'
import { formatDate } from '../../../shared/format'

type Props = {
  locker: AdminLocker
  busy: boolean
  featureEnabled: boolean
  onAssign: (lockerId: string) => void
  onRelease: (lockerId: string, code: string) => void
  onToggleStatus: (lockerId: string, active: boolean) => void
}

export function LockerCard({
  locker,
  busy,
  featureEnabled,
  onAssign,
  onRelease,
  onToggleStatus,
}: Props) {
  const isMaintenance = !locker.active
  const isAssigned = Boolean(locker.customerId)
  const isAvailable = locker.active && !isAssigned

  const initials = locker.customerName
    ? locker.customerName
        .split(' ')
        .filter(Boolean)
        .map((n) => n[0])
        .join('')
        .slice(0, 2)
        .toUpperCase()
    : 'MB'

  const cardStatusClass = isMaintenance
    ? 'maintenance'
    : isAssigned
      ? 'assigned'
      : 'available'

  return (
    <article className={`panel admin-record admin-locker-card admin-locker-box ${cardStatusClass}`}>
      <div className="admin-locker-box-top">
        <div className="admin-locker-compartment-pill">
          <span className="admin-locker-compartment-label">LOKER</span>
          <strong className="admin-locker-code">{locker.code}</strong>
        </div>
        <div className="admin-locker-status-group">
          {isMaintenance && (
            <span className="admin-locker-status-tag maintenance">Perawatan</span>
          )}
          {isAssigned && (
            <span className="admin-locker-status-tag assigned">Terisi</span>
          )}
          {isAvailable && (
            <span className="admin-locker-status-tag available">Tersedia</span>
          )}
        </div>
      </div>

      <div className="admin-locker-box-center">
        {isMaintenance && (
          <div className="admin-locker-maintenance-state">
            <div className="admin-locker-maintenance-icon-wrap">
              <Wrench size={20} />
            </div>
            <div className="admin-locker-maintenance-text">
              <strong>Dalam Pemeliharaan</strong>
              <span>Kompartemen sedang diperbaiki atau kunci diganti.</span>
            </div>
          </div>
        )}

        {isAssigned && (
          <div className="admin-locker-occupant">
            <div className="admin-locker-occupant-profile">
              <div className="admin-locker-avatar">{initials}</div>
              <div className="admin-locker-occupant-info">
                <strong className="admin-locker-occupant-name">{locker.customerName}</strong>
                <span
                  className="admin-locker-occupant-email"
                  title={locker.customerEmail ?? undefined}
                >
                  {locker.customerEmail}
                </span>
              </div>
            </div>
            <div className="admin-locker-validity-pill">
              <Calendar size={12} style={{ flexShrink: 0 }} />
              <span>Paket s/d {formatDate(locker.membershipEndsOn!)}</span>
            </div>
          </div>
        )}

        {isAvailable && (
          <div className="admin-locker-vacant">
            <div className="admin-locker-vacant-icon-wrap">
              <LockKeyhole size={18} />
            </div>
            <div className="admin-locker-vacant-text">
              <strong>Siap Ditetapkan</strong>
              <span>Slot kosong untuk member</span>
            </div>
          </div>
        )}
      </div>

      <div className="admin-locker-box-action">
        {isMaintenance && (
          <button
            type="button"
            className="button button-outline admin-locker-action-btn reactivate"
            disabled={busy || !featureEnabled}
            onClick={() => onToggleStatus(locker.id, true)}
          >
            <RefreshCw size={14} /> Aktifkan Kembali Loker
          </button>
        )}

        {isAssigned && (
          <button
            type="button"
            className="button button-outline admin-locker-action-btn danger"
            disabled={busy}
            onClick={() => onRelease(locker.id, locker.code)}
          >
            Lepas Loker
          </button>
        )}

        {isAvailable && (
          <div className="admin-locker-available-actions">
            <button
              type="button"
              className="button button-outline admin-locker-action-btn primary"
              disabled={busy || !featureEnabled}
              onClick={() => onAssign(locker.id)}
            >
              Tetapkan Member
            </button>
            <button
              type="button"
              className="admin-locker-toggle-status-link"
              disabled={busy}
              onClick={() => onToggleStatus(locker.id, false)}
            >
              <Wrench size={12} /> Tandai Perawatan
            </button>
          </div>
        )}
      </div>
    </article>
  )
}
