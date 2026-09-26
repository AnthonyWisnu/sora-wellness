import { useEffect, useState } from 'react'
import { KeyRound, LockKeyhole, ShieldCheck } from 'lucide-react'
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
    <section
      className="panel studio-my-locker"
      style={{
        marginTop: '24px',
        background: '#fff',
        border: '1.5px solid var(--line)',
        borderRadius: '14px',
        padding: '24px',
        boxShadow: '0 2px 10px rgba(0, 0, 0, 0.03)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
        <span className="eyebrow" style={{ display: 'flex', gap: '8px', alignItems: 'center', margin: 0 }}>
          <LockKeyhole size={15} style={{ color: 'var(--green)' }} /> LOKER ANDA
        </span>
        {locker.code && (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px',
              fontSize: '11px',
              fontWeight: 700,
              padding: '3px 10px',
              borderRadius: '999px',
              background: '#dcfce7',
              color: '#15803d',
            }}
          >
            <ShieldCheck size={13} /> Aktif Terdaftar
          </span>
        )}
      </div>

      <div style={{ display: 'flex', alignItems: 'baseline', gap: '12px', margin: '8px 0 10px' }}>
        <h2 style={{ fontSize: '36px', fontWeight: 800, margin: 0, color: 'var(--ink)' }}>
          {locker.code ?? 'Belum ditetapkan'}
        </h2>
        {locker.code && (
          <span style={{ fontSize: '13px', color: 'var(--muted)', fontWeight: 600 }}>
            Nomor Loker Pribadi
          </span>
        )}
      </div>

      <p style={{ margin: '0 0 16px', fontSize: '13px', color: 'var(--muted)', lineHeight: 1.5 }}>
        {locker.code
          ? `Berlaku hingga akhir paket pada ${formatDate(locker.membershipEndsOn!)}. Perpanjangan paket memerlukan penetapan ulang oleh admin.`
          : 'Hubungi admin studio jika Anda memerlukan loker.'}
      </p>

      {locker.code && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            padding: '12px 14px',
            background: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: '8px',
            fontSize: '12px',
            color: 'var(--ink)',
          }}
        >
          <KeyRound size={16} style={{ color: 'var(--green)', flexShrink: 0 }} />
          <span>
            Kunci loker fisik atau kartu akses dapat diambil di meja resepsionis sebelum kelas dimulai.
          </span>
        </div>
      )}
    </section>
  )
}
