import type { Dispatch, FormEvent, SetStateAction } from 'react'
import { Check } from 'lucide-react'
import { api, type PaymentSettings, type Policy } from '../../shared/api'
import type { AdminTab, GatewayForm } from './admin-types'

type PolicyProps = {
  adminTab: AdminTab
  policy: Policy | null
  setPolicy: Dispatch<SetStateAction<Policy | null>>
  busy: boolean
  savePolicy: (event: FormEvent<HTMLFormElement>) => void
}
export function AdminPolicy({ adminTab, policy, setPolicy, busy, savePolicy }: PolicyProps) {
  return (
    <>
      {adminTab === 'policy' && policy && (
        <form
          className="panel live-form live-admin-form"
          onSubmit={(event) => void savePolicy(event)}
        >
          <h2>Aturan booking dan jadwal</h2>
          <div className="live-form-grid">
            <label>
              Jadwal pengunjung (hari)
              <input
                type="number"
                min={1}
                max={90}
                value={policy.guestScheduleDays}
                onChange={(event) =>
                  setPolicy({ ...policy, guestScheduleDays: Number(event.target.value) })
                }
              />
            </label>
            <label>
              Jadwal member (hari)
              <input
                type="number"
                min={1}
                max={180}
                value={policy.memberScheduleDays}
                onChange={(event) =>
                  setPolicy({ ...policy, memberScheduleDays: Number(event.target.value) })
                }
              />
            </label>
            <label>
              Batas booking (menit)
              <input
                type="number"
                min={0}
                max={10080}
                value={policy.bookingCutoffMinutes}
                onChange={(event) =>
                  setPolicy({ ...policy, bookingCutoffMinutes: Number(event.target.value) })
                }
              />
            </label>
            <label>
              Batas pembatalan (menit)
              <input
                type="number"
                min={0}
                max={10080}
                value={policy.cancellationCutoffMinutes}
                onChange={(event) =>
                  setPolicy({ ...policy, cancellationCutoffMinutes: Number(event.target.value) })
                }
              />
            </label>
            <label>
              Jatah kelas per bulan
              <input
                type="number"
                min={0}
                max={100}
                value={policy.monthlyClassQuota}
                onChange={(event) =>
                  setPolicy({ ...policy, monthlyClassQuota: Number(event.target.value) })
                }
              />
            </label>
            <label>
              Tahan kursi (menit)
              <input
                type="number"
                min={1}
                max={60}
                value={policy.seatHoldMinutes}
                onChange={(event) =>
                  setPolicy({ ...policy, seatHoldMinutes: Number(event.target.value) })
                }
              />
            </label>
          </div>
          <label className="live-checkbox">
            <input
              type="checkbox"
              checked={policy.lockerEnabled}
              onChange={(event) => setPolicy({ ...policy, lockerEnabled: event.target.checked })}
            />{' '}
            Fitur loker aktif
          </label>
          <button className="button button-primary" disabled={busy}>
            Simpan aturan <Check size={16} />
          </button>
        </form>
      )}
    </>
  )
}

type PaymentProps = {
  adminTab: AdminTab
  paymentSettings: PaymentSettings | null
  gatewayForm: GatewayForm
  setGatewayForm: Dispatch<SetStateAction<GatewayForm>>
  busy: boolean
  setBusy: Dispatch<SetStateAction<boolean>>
  saveGateway: (event: FormEvent<HTMLFormElement>) => void
  show: (message: string) => void
}
function message(error: unknown) {
  return error instanceof Error ? error.message : 'Terjadi kesalahan. Coba lagi.'
}
export function AdminPaymentSettings({
  adminTab,
  paymentSettings,
  gatewayForm,
  setGatewayForm,
  busy,
  setBusy,
  saveGateway,
  show,
}: PaymentProps) {
  return (
    <>
      {adminTab === 'payment' && (
        <div className="live-admin-grid">
          <div className="panel">
            <span className="eyebrow">MIDTRANS SANDBOX</span>
            <h2>{paymentSettings?.configured ? 'Terhubung' : 'Belum dikonfigurasi'}</h2>
            <p>Merchant ID: {paymentSettings?.merchantId ?? '-'}</p>
            <p>Client Key: {paymentSettings?.clientKey ?? '-'}</p>
            <p>
              Server Key:{' '}
              {paymentSettings?.serverKeyConfigured ? 'Tersimpan aman di backend' : 'Belum ada'}
            </p>
            <button
              className="button button-outline"
              disabled={!paymentSettings?.configured || busy}
              onClick={() => {
                setBusy(true)
                void api<{ tokenReceived: boolean }>('/admin/payment-settings/test', {
                  method: 'POST',
                })
                  .then((value) =>
                    show(
                      value.tokenReceived ? 'Koneksi Sandbox berhasil.' : 'Token belum diterima.',
                    ),
                  )
                  .catch((error) => show(message(error)))
                  .finally(() => setBusy(false))
              }}
            >
              Uji koneksi
            </button>
          </div>
          <form className="panel live-form" onSubmit={(event) => void saveGateway(event)}>
            <h2>Perbarui kredensial</h2>
            <p>
              Masukkan ketiga nilai Sandbox. Server Key dikirim ke backend dan tidak ditampilkan
              kembali.
            </p>
            <label>
              Merchant ID
              <input
                required
                value={gatewayForm.merchantId}
                onChange={(event) =>
                  setGatewayForm({ ...gatewayForm, merchantId: event.target.value })
                }
              />
            </label>
            <label>
              Client Key
              <input
                required
                value={gatewayForm.clientKey}
                onChange={(event) =>
                  setGatewayForm({ ...gatewayForm, clientKey: event.target.value })
                }
              />
            </label>
            <label>
              Server Key
              <input
                required
                type="password"
                autoComplete="off"
                value={gatewayForm.serverKey}
                onChange={(event) =>
                  setGatewayForm({ ...gatewayForm, serverKey: event.target.value })
                }
              />
            </label>
            <button className="button button-primary" disabled={busy}>
              Simpan di backend
            </button>
          </form>
        </div>
      )}
    </>
  )
}
