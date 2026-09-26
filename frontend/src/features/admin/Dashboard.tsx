import {
  useCallback,
  useEffect,
  useState,
  type Dispatch,
  type FormEvent,
  type SetStateAction,
} from 'react'
import {
  api,
  type AdminSession,
  type Packages,
  type PaymentSettings,
  type Policy,
  type Studio,
  type SiteDocument,
} from '../../shared/api'
import type { AdminTab } from './admin-types'
import { AdminSummary } from './AdminSummary'
import { AdminPaymentSettings, AdminPolicy } from './AdminSettings'
import { AdminAttendancePanel } from './Attendance'
import { AdminAccountsPanel } from './Accounts'
import { AdminClassTypesPanel } from './ClassTypes'
import { AdminPackagesPanel } from './Packages'
import { AdminRulesPanel } from './Rules'
import { AdminSessionsPanel } from './Sessions'
import { AdminContentPanel } from './Content'
import { AdminLockersPanel } from './Lockers'
import './Management.css'
import { AdminFinancePanel } from './Finance'
import { useConfirm } from '../../shared/confirm-context'

type Props = {
  adminTab: AdminTab
  timezone: string
  show: (message: string) => void
  go?: (path: string) => void
  loadSessions: () => Promise<void>
  setPackages: Dispatch<SetStateAction<Packages | null>>
  setStudio: Dispatch<SetStateAction<Studio | null>>
  setSite: Dispatch<SetStateAction<SiteDocument | null>>
}
export type AdminDashboardSummary = {
  upcomingCount: number
  todayCount: number
  coachCount: number
  sessions: AdminSession[]
}
function message(error: unknown) {
  return error instanceof Error ? error.message : 'Terjadi kesalahan. Coba lagi.'
}

export function AdminDashboard({
  adminTab,
  timezone,
  show,
  go,
  loadSessions,
  setPackages,
  setStudio,
  setSite,
}: Props) {
  const confirm = useConfirm()
  const [busy, setBusy] = useState(false)
  const [policy, setPolicy] = useState<Policy | null>(null)
  const [summary, setSummary] = useState<AdminDashboardSummary | null>(null)
  const [paymentSettings, setPaymentSettings] = useState<PaymentSettings | null>(null)
  const [gatewayForm, setGatewayForm] = useState({ merchantId: '', clientKey: '', serverKey: '' })
  const loadAdmin = useCallback(async () => {
    const [nextPolicy, nextSummary, nextSettings] = await Promise.all([
      api<Policy>('/admin/policies'),
      api<AdminDashboardSummary>('/admin/dashboard-summary'),
      api<PaymentSettings>('/admin/payment-settings'),
    ])
    setPolicy(nextPolicy)
    setSummary(nextSummary)
    setPaymentSettings(nextSettings)
  }, [])
  useEffect(() => {
    void loadAdmin().catch((error) => show(message(error)))
  }, [loadAdmin, show])

  async function cancelStudioSession(id: string) {
    if (
      !(await confirm({
        title: 'Batalkan sesi kelas?',
        description:
          'Sesi akan dibatalkan dan hak seluruh peserta dikembalikan sesuai aturan studio.',
        confirmLabel: 'Batalkan sesi',
        tone: 'danger',
      }))
    )
      return
    setBusy(true)
    try {
      await api(`/admin/sessions/${id}/cancel`, { method: 'POST' })
      await Promise.all([loadAdmin(), loadSessions()])
      show('Sesi dibatalkan dan hak peserta diproses.')
    } catch (error) {
      show(message(error))
    } finally {
      setBusy(false)
    }
  }
  async function savePolicy(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!policy) return
    setBusy(true)
    try {
      setPolicy(await api<Policy>('/admin/policies', { method: 'PATCH', body: policy }))
      await loadSessions()
      show('Aturan studio tersimpan di backend.')
    } catch (error) {
      show(message(error))
    } finally {
      setBusy(false)
    }
  }
  async function saveGateway(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setBusy(true)
    try {
      await api('/admin/payment-settings', { method: 'PUT', body: gatewayForm })
      setGatewayForm({ merchantId: '', clientKey: '', serverKey: '' })
      setPaymentSettings(await api<PaymentSettings>('/admin/payment-settings'))
      show('Kredensial Sandbox tersimpan di backend.')
    } catch (error) {
      show(message(error))
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <AdminSummary
        adminTab={adminTab}
        summary={summary}
        timezone={timezone}
        busy={busy}
        go={go}
        cancelStudioSession={cancelStudioSession}
      />
      <AdminPolicy
        adminTab={adminTab}
        policy={policy}
        setPolicy={setPolicy}
        busy={busy}
        savePolicy={savePolicy}
      />
      <AdminPaymentSettings
        adminTab={adminTab}
        paymentSettings={paymentSettings}
        gatewayForm={gatewayForm}
        setGatewayForm={setGatewayForm}
        busy={busy}
        setBusy={setBusy}
        saveGateway={saveGateway}
        show={show}
      />
      {adminTab === 'attendance' && <AdminAttendancePanel timezone={timezone} show={show} />}
      {adminTab === 'manage' && (
        <AdminSessionsPanel
          timezone={timezone}
          show={show}
          onChanged={() => {
            void loadAdmin()
            void loadSessions()
          }}
        />
      )}
      {adminTab === 'classes' && (
        <AdminClassTypesPanel
          show={show}
          onChanged={() => {
            void loadSessions()
          }}
        />
      )}
      {adminTab === 'packages' && (
        <AdminPackagesPanel
          show={show}
          onChanged={() => {
            void Promise.all([api<Packages>('/public/packages'), api<SiteDocument>('/public/site')])
              .then(([nextPackages, nextSite]) => {
                setPackages(nextPackages)
                setSite(nextSite)
              })
              .catch((error) => show(message(error)))
          }}
        />
      )}
      {adminTab === 'rules' && (
        <AdminRulesPanel
          timezone={timezone}
          show={show}
          onChanged={() => {
            void loadAdmin()
            void loadSessions()
          }}
        />
      )}
      {adminTab === 'accounts' && <AdminAccountsPanel show={show} />}
      {adminTab === 'finance' && <AdminFinancePanel timezone={timezone} show={show} />}
      {adminTab === 'lockers' && <AdminLockersPanel show={show} />}
      {adminTab === 'content' && (
        <AdminContentPanel
          show={show}
          onChanged={() => {
            void Promise.all([api<Studio>('/public/studio'), api<SiteDocument>('/public/site')])
              .then(([nextStudio, nextSite]) => {
                setStudio(nextStudio)
                setSite(nextSite)
              })
              .catch((error) => show(message(error)))
          }}
        />
      )}
    </>
  )
}
