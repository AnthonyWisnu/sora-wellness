import { LockKeyhole, ShieldCheck, User, Wrench } from 'lucide-react'
import type { AdminLocker } from '../../../shared/api'

type Props = {
  lockers: AdminLocker[]
}

export function LockerKpiBanner({ lockers }: Props) {
  const totalCount = lockers.length
  const availableCount = lockers.filter((l) => l.active && !l.customerId).length
  const assignedCount = lockers.filter((l) => Boolean(l.customerId)).length
  const maintenanceCount = lockers.filter((l) => !l.active).length
  const occupancyPercent = totalCount > 0 ? Math.round((assignedCount / totalCount) * 100) : 0

  return (
    <div className="admin-locker-kpi-banner">
      <div className="admin-locker-kpi-card">
        <div className="admin-locker-kpi-icon-wrap blue">
          <LockKeyhole size={18} />
        </div>
        <div className="admin-locker-kpi-info">
          <span>Total Kapasitas</span>
          <strong>{totalCount} Loker</strong>
          <small>Kompartemen studio</small>
        </div>
      </div>

      <div className="admin-locker-kpi-card">
        <div className="admin-locker-kpi-icon-wrap green">
          <ShieldCheck size={18} />
        </div>
        <div className="admin-locker-kpi-info">
          <span>Loker Tersedia</span>
          <strong style={{ color: '#15803d' }}>{availableCount} Loker</strong>
          <small>Siap digunakan</small>
        </div>
      </div>

      <div className="admin-locker-kpi-card">
        <div className="admin-locker-kpi-icon-wrap amber">
          <User size={18} />
        </div>
        <div className="admin-locker-kpi-info">
          <span>Sedang Terisi</span>
          <strong style={{ color: '#0369a1' }}>{assignedCount} Loker</strong>
          <small>Aktif bersama member</small>
        </div>
      </div>

      <div className="admin-locker-kpi-card">
        <div className="admin-locker-kpi-icon-wrap amber">
          <Wrench size={18} />
        </div>
        <div className="admin-locker-kpi-info">
          <span>Perawatan</span>
          <strong style={{ color: '#d97706' }}>{maintenanceCount} Loker</strong>
          <small>Sedang pemeliharaan</small>
        </div>
      </div>

      <div className="admin-locker-kpi-card occupancy">
        <div className="admin-locker-occupancy-head">
          <span>Okupansi Studio</span>
          <strong>{occupancyPercent}%</strong>
        </div>
        <div className="admin-locker-progress-track">
          <div
            className="admin-locker-progress-bar"
            style={{ width: `${occupancyPercent}%` }}
          />
        </div>
        <span className="admin-locker-occupancy-sub">
          {assignedCount} dari {totalCount} unit terisi
        </span>
      </div>
    </div>
  )
}
