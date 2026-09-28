import { useState, type FormEvent } from 'react'
import {
  AlertCircle,
  CheckCircle2,
  KeyRound,
  QrCode,
  ShieldCheck,
  UserCheck,
} from 'lucide-react'
import { api, type CheckInResult } from '../../shared/api'
import { localDateTime } from '../../shared/format'
import { errorMessage } from '../../shared/errors'
import '../dashboard/Panels.css'

interface RecentCheckIn extends CheckInResult {
  timestamp: Date
}

export function AdminAttendancePanel({
  timezone,
  show,
}: {
  timezone: string
  show: (text: string) => void
}) {
  const [busy, setBusy] = useState(false)
  const [scanInput, setScanInput] = useState('')
  const [scanResult, setScanResult] = useState<CheckInResult | null>(null)
  const [scanError, setScanError] = useState<string | null>(null)
  const [recentList, setRecentList] = useState<RecentCheckIn[]>([])

  async function handleQuickCheckIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    let raw = scanInput.trim()
    if (!raw) return
    setScanError(null)
    setScanResult(null)

    // Handle JSON payload from QR scanner
    if (raw.startsWith('{') && raw.endsWith('}')) {
      try {
        const parsed = JSON.parse(raw) as { bookingId?: string }
        if (parsed.bookingId) raw = parsed.bookingId
      } catch {
        // keep as is
      }
    }

    // Handle order ID prefix
    if (raw.toUpperCase().startsWith('CLS-')) {
      raw = raw.slice(4)
    }

    setBusy(true)
    try {
      const res = await api<CheckInResult>('/admin/sessions/check-in', {
        method: 'POST',
        body: { bookingId: raw },
      })
      setScanResult(res)
      setScanInput('')
      setRecentList((prev) => [
        { ...res, timestamp: new Date() },
        ...prev.filter((item) => item.bookingId !== res.bookingId).slice(0, 9),
      ])
      show(
        res.alreadyCheckedIn
          ? `Perhatian: Tiket ${res.customerName} sudah diverifikasi sebelumnya.`
          : `Sukses: ${res.customerName} berhasil check-in kelas ${res.classTitle}!`,
      )
    } catch (err) {
      setScanError(errorMessage(err))
      show(errorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="live-admin-attendance" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* 1. Terminal Scanner Masuk Lobi */}
      <div className="panel live-form" style={{ borderLeft: '4px solid #17392e' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
          <QrCode size={22} style={{ color: '#17392e' }} />
          <h2 style={{ margin: 0, fontSize: '1.25rem' }}>Verifikasi Masuk & Lobi Studio (Scan QR E-Ticket)</h2>
        </div>
        <p style={{ margin: '0 0 16px', fontSize: '0.88rem', color: '#666', lineHeight: 1.5 }}>
          Arahkan scanner ke QR Code e-ticket peserta di meja resepsionis (atau ketik ID Booking). Sistem memverifikasi keabsahan tiket, mencatat waktu tiba di lobi studio, dan mengonfirmasi nomor loker fisik aktif pelanggan.
        </p>

        <form onSubmit={handleQuickCheckIn} style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
          <input
            style={{
              flex: '1',
              minWidth: '280px',
              padding: '12px 16px',
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              fontSize: '0.92rem',
              outline: 'none',
            }}
            placeholder="Scan atau paste kode QR / ID Booking / Order ID (misal: b210d394...)"
            value={scanInput}
            onChange={(e) => setScanInput(e.target.value)}
            disabled={busy}
            autoFocus
          />
          <button
            className="button button-primary"
            type="submit"
            disabled={busy || !scanInput.trim()}
            style={{ whiteSpace: 'nowrap', padding: '12px 20px', fontWeight: 600 }}
          >
            {busy ? 'Memverifikasi...' : 'Verifikasi & Masuk'}
          </button>
        </form>

        {/* Hasil Scan Sukses / Peringatan */}
        {scanResult && (
          <div
            style={{
              marginTop: '16px',
              padding: '18px',
              borderRadius: '10px',
              background: scanResult.alreadyCheckedIn ? '#fffbeb' : '#f0fdf4',
              border: scanResult.alreadyCheckedIn ? '1px solid #fde68a' : '1px solid #bbf7d0',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '14px',
            }}
          >
            {scanResult.alreadyCheckedIn ? (
              <AlertCircle size={24} style={{ color: '#d97706', marginTop: '2px', flexShrink: 0 }} />
            ) : (
              <CheckCircle2 size={24} style={{ color: '#16a34a', marginTop: '2px', flexShrink: 0 }} />
            )}
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', flexWrap: 'wrap' }}>
                <strong
                  style={{
                    color: scanResult.alreadyCheckedIn ? '#92400e' : '#166534',
                    fontSize: '1.05rem',
                  }}
                >
                  {scanResult.alreadyCheckedIn
                    ? 'Tiket Sudah Pernah Diverifikasi Sebelumnya'
                    : 'Verifikasi Masuk Berhasil · Tamu Tiba di Studio'}
                </strong>
                <span className={`tag ${scanResult.alreadyCheckedIn ? 'tag-gold' : 'tag-green'}`}>
                  {scanResult.alreadyCheckedIn ? 'Tamu Sudah Masuk' : 'Check-in Lobi Sukses'}
                </span>
              </div>
              <div style={{ fontSize: '0.9rem', color: '#374151', marginTop: '8px', lineHeight: 1.6 }}>
                <div>
                  Nama Murid: <strong>{scanResult.customerName}</strong>
                </div>
                <div>
                  Kelas: <strong>{scanResult.classTitle}</strong> · Jadwal: {localDateTime(scanResult.startsAt, timezone)}
                </div>
                <div style={{ marginTop: '10px', display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                  {scanResult.lockerCode ? (
                    <span
                      style={{
                        padding: '6px 12px',
                        background: '#e0f2fe',
                        border: '1px solid #bae6fd',
                        borderRadius: '6px',
                        color: '#0369a1',
                        fontSize: '0.85rem',
                        fontWeight: 700,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                      }}
                    >
                      <KeyRound size={15} /> Loker Pribadi: {scanResult.lockerCode}
                    </span>
                  ) : (
                    <span style={{ fontSize: '0.85rem', color: '#64748b' }}>
                      (Tidak ada loker khusus terdaftar)
                    </span>
                  )}
                  <small style={{ color: '#6b7280' }}>ID Booking: {scanResult.bookingId}</small>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Error Feedback */}
        {scanError && (
          <div
            style={{
              marginTop: '14px',
              padding: '12px 16px',
              borderRadius: '8px',
              background: '#fef2f2',
              border: '1px solid #fecaca',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              color: '#991b1b',
              fontSize: '0.88rem',
            }}
          >
            <AlertCircle size={20} style={{ color: '#dc2626', flexShrink: 0 }} />
            <span>{scanError}</span>
          </div>
        )}
      </div>

      {/* 2. Riwayat Verifikasi Terkini di Sesi Ini */}
      {recentList.length > 0 && (
        <div className="panel" style={{ borderLeft: '4px solid #0284c7' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
            <UserCheck size={20} style={{ color: '#0284c7' }} />
            <h3 style={{ margin: 0, fontSize: '1.1rem' }}>Tamu yang Baru Saja Diverifikasi di Lobi</h3>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {recentList.map((item) => (
              <div
                key={item.bookingId}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '10px 14px',
                  borderRadius: '6px',
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  gap: '12px',
                  flexWrap: 'wrap',
                }}
              >
                <div>
                  <strong>{item.customerName}</strong>
                  <span style={{ color: '#64748b', fontSize: '0.85rem', marginLeft: '8px' }}>
                    {item.classTitle}
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  {item.lockerCode && (
                    <span
                      style={{
                        padding: '2px 8px',
                        background: '#e0f2fe',
                        borderRadius: '4px',
                        color: '#0369a1',
                        fontSize: '0.8rem',
                        fontWeight: 600,
                      }}
                    >
                      {item.lockerCode}
                    </span>
                  )}
                  <small style={{ color: '#94a3b8' }}>
                    {new Intl.DateTimeFormat('id-ID', {
                      timeZone: timezone,
                      hour: '2-digit',
                      minute: '2-digit',
                      second: '2-digit',
                    }).format(item.timestamp)}
                  </small>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 3. Panduan SOP Meja Depan Resepsionis */}
      <div className="panel" style={{ background: '#fcfbf8', border: '1px solid #e7e5e4' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
          <ShieldCheck size={20} style={{ color: '#17392e' }} />
          <h3 style={{ margin: 0, fontSize: '1rem', color: '#17392e' }}>
            Prosedur Standar Operasional Meja Depan (Front Desk SOP)
          </h3>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '14px', fontSize: '0.86rem', color: '#444' }}>
          <div style={{ padding: '12px', background: '#fff', borderRadius: '8px', border: '1px solid #eee' }}>
            <strong style={{ display: 'block', color: '#17392e', marginBottom: '4px' }}>
              1. Validasi E-Ticket QR
            </strong>
            Pindai kode QR atau masukkan ID Booking peserta saat tiba di lobi studio untuk memvalidasi tiket masuk.
          </div>
          <div style={{ padding: '12px', background: '#fff', borderRadius: '8px', border: '1px solid #eee' }}>
            <strong style={{ display: 'block', color: '#17392e', marginBottom: '4px' }}>
              2. Konfirmasi & Pengarahan Loker
            </strong>
            Sistem secara otomatis menampilkan nomor loker fisik aktif member. Arahkan murid ke kompartemen loker dan ruang ganti.
          </div>
          <div style={{ padding: '12px', background: '#fff', borderRadius: '8px', border: '1px solid #eee' }}>
            <strong style={{ display: 'block', color: '#17392e', marginBottom: '4px' }}>
              3. Presensi Matras Kelas (Wewenang Coach)
            </strong>
            Presensi kehadiran fisik di atas matras latihan dilakukan secara eksklusif oleh Pelatih di dalam ruang kelas melalui Coach Dashboard.
          </div>
        </div>
      </div>
    </section>
  )
}
