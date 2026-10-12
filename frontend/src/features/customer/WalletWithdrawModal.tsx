import { useState, type FormEvent } from 'react'
import { ArrowUpRight, Building2, Smartphone, X } from 'lucide-react'
import { api } from '../../shared/api'
import { money } from '../../shared/format'
import { errorMessage } from '../../shared/errors'

type Props = {
  open: boolean
  balance: number
  onClose: () => void
  onSuccess: () => void
  show: (text: string) => void
}

const banks = [
  { code: 'BCA', name: 'Bank Central Asia (BCA)' },
  { code: 'MANDIRI', name: 'Bank Mandiri' },
  { code: 'BRI', name: 'Bank Rakyat Indonesia (BRI)' },
  { code: 'BNI', name: 'Bank Negara Indonesia (BNI)' },
  { code: 'BSI', name: 'Bank Syariah Indonesia (BSI)' },
  { code: 'CIMB', name: 'CIMB Niaga' },
  { code: 'PERMATA', name: 'Bank Permata' },
]

const ewallets = [
  { code: 'GOPAY', name: 'GoPay' },
  { code: 'OVO', name: 'OVO' },
  { code: 'DANA', name: 'DANA' },
  { code: 'SHOPEEPAY', name: 'ShopeePay' },
]

export function WalletWithdrawModal({ open, balance, onClose, onSuccess, show }: Props) {
  const [destinationType, setDestinationType] = useState<'bank' | 'ewallet'>('bank')
  const [providerCode, setProviderCode] = useState('BCA')
  const [accountNumber, setAccountNumber] = useState('')
  const [accountName, setAccountName] = useState('')
  const [amountIdr, setAmountIdr] = useState<number>(Math.min(balance, 50000))
  const [busy, setBusy] = useState(false)

  if (!open) return null

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (amountIdr < 10000) {
      show('Nominal penarikan minimal Rp 10.000.')
      return
    }
    if (amountIdr > balance) {
      show('Nominal melebihi saldo dompet Anda.')
      return
    }

    setBusy(true)
    try {
      await api('/me/wallet/withdraw', {
        method: 'POST',
        body: {
          amountIdr,
          destinationType,
          providerCode,
          accountNumber: accountNumber.trim(),
          accountName: accountName.trim(),
        },
      })
      show('Pengajuan penarikan dana berhasil dikirim ke bagian keuangan studio.')
      onSuccess()
      onClose()
    } catch (error) {
      show(errorMessage(error))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="sora-ticket-overlay" role="dialog" aria-modal="true" onClick={onClose}>
      <div className="panel sora-ticket-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '480px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div>
            <span className="eyebrow">PENARIKAN DANA</span>
            <h3 style={{ margin: 0 }}>Tarik Saldo ke Rekening / E-Wallet</h3>
          </div>
          <button type="button" className="button button-text" onClick={onClose} style={{ padding: '6px' }}>
            <X size={18} />
          </button>
        </div>

        <form onSubmit={(e) => void handleSubmit(e)} className="live-form">
          <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
            <button
              type="button"
              className={`button ${destinationType === 'bank' ? 'button-primary' : 'button-outline'}`}
              style={{ flex: 1, padding: '8px 12px', fontSize: '13px' }}
              onClick={() => {
                setDestinationType('bank')
                setProviderCode('BCA')
              }}
            >
              <Building2 size={15} /> Transfer Bank
            </button>
            <button
              type="button"
              className={`button ${destinationType === 'ewallet' ? 'button-primary' : 'button-outline'}`}
              style={{ flex: 1, padding: '8px 12px', fontSize: '13px' }}
              onClick={() => {
                setDestinationType('ewallet')
                setProviderCode('GOPAY')
              }}
            >
              <Smartphone size={15} /> E-Wallet
            </button>
          </div>

          <label>
            {destinationType === 'bank' ? 'Pilih Bank Tujuan' : 'Pilih E-Wallet Tujuan'}
            <select
              value={providerCode}
              onChange={(e) => setProviderCode(e.target.value)}
              required
            >
              {(destinationType === 'bank' ? banks : ewallets).map((p) => (
                <option value={p.code} key={p.code}>
                  {p.name}
                </option>
              ))}
            </select>
          </label>

          <label>
            {destinationType === 'bank' ? 'Nomor Rekening' : 'Nomor Handphone Terdaftar'}
            <input
              required
              minLength={4}
              maxLength={40}
              placeholder={destinationType === 'bank' ? 'Contoh: 8820192831' : 'Contoh: 081234567890'}
              value={accountNumber}
              onChange={(e) => setAccountNumber(e.target.value)}
            />
          </label>

          <label>
            Nama Lengkap Pemilik Rekening / Akun
            <input
              required
              minLength={2}
              maxLength={100}
              placeholder="Wajib sesuai buku tabungan atau akun e-wallet"
              value={accountName}
              onChange={(e) => setAccountName(e.target.value)}
            />
          </label>

          <label>
            Nominal Penarikan (Tersedia: {money(balance)})
            <input
              type="number"
              required
              min={10000}
              max={balance}
              step={5000}
              value={amountIdr || ''}
              onChange={(e) => setAmountIdr(Number(e.target.value))}
            />
          </label>

          <div style={{ background: '#f8fafc', padding: '10px 14px', borderRadius: '8px', fontSize: '12px', color: '#64748b' }}>
            <p style={{ margin: '0 0 4px', fontWeight: 600, color: '#334155' }}>Syarat & Ketentuan Penarikan:</p>
            <ul style={{ margin: 0, paddingLeft: '16px', lineHeight: 1.5 }}>
              <li>Minimal penarikan Rp 10.000.</li>
              <li>Diproses manual oleh staf keuangan dalam 1x24 jam kerja studio.</li>
              <li>Saldo dompet akan ditahan sementara hingga transfer diverifikasi.</li>
            </ul>
          </div>

          <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
            <button type="button" className="button button-outline" onClick={onClose} disabled={busy} style={{ flex: 1 }}>
              Batal
            </button>
            <button type="submit" className="button button-primary" disabled={busy || balance < 10000} style={{ flex: 1 }}>
              <ArrowUpRight size={15} /> Ajukan Penarikan
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
