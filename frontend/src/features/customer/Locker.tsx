import { useEffect, useState } from 'react'
import { LockKeyhole } from 'lucide-react'
import { api, type LockerMine } from '../../shared/api'
import { formatDate } from '../../shared/format'
import { errorMessage } from '../../shared/errors'
import '../admin/StudioAssets.css'
type Notice = { show: (message: string) => void }

export function CustomerLockerPanel({ show }: Notice) {
  const [locker, setLocker] = useState<LockerMine | null>(null)
  useEffect(() => {
    void api<LockerMine>('/me/locker')
      .then(setLocker)
      .catch((error) => show(errorMessage(error)))
  }, [show])
  if (!locker?.enabled) return null
  return (
    <section className="panel studio-my-locker">
      <span className="eyebrow">
        <LockKeyhole size={15} /> LOKER ANDA
      </span>
      <h2>{locker.code ?? 'Belum ditetapkan'}</h2>
      <p>
        {locker.code
          ? `Berlaku hingga akhir paket pada ${formatDate(locker.membershipEndsOn!)}. Perpanjangan paket memerlukan penetapan ulang oleh admin.`
          : 'Hubungi admin studio jika Anda memerlukan loker.'}
      </p>
    </section>
  )
}
