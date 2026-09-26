import { useEffect, useState, type Dispatch, type FormEvent, type SetStateAction } from 'react'
import { api, ApiError, type Actor } from '../../shared/api'

type Options = {
  go: (path: string) => void
  show: (message: string) => void
  setBusy: Dispatch<SetStateAction<boolean>>
  resetCustomer: () => void
}
function message(error: unknown) {
  return error instanceof Error ? error.message : 'Terjadi kesalahan. Coba lagi.'
}

export function useAuth({ go, show, setBusy, resetCustomer }: Options) {
  const [actor, setActor] = useState<Actor | null>(null)
  const [authReady, setAuthReady] = useState(false)
  const [mustChangePassword, setMustChangePassword] = useState(false)
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login')

  useEffect(() => {
    let active = true
    void api<Actor>('/me')
      .then((value) => {
        if (active) setActor(value)
      })
      .catch((error) => {
        if (active && error instanceof ApiError && error.status !== 401) show(message(error))
      })
      .finally(() => {
        if (active) setAuthReady(true)
      })
    return () => {
      active = false
    }
  }, [show])

  async function authenticate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setBusy(true)
    const form = new FormData(event.currentTarget)
    const email = String(form.get('email') ?? '')
    const password = String(form.get('password') ?? '')
    try {
      if (authMode === 'register')
        await api('/auth/register', {
          method: 'POST',
          body: { email, password, fullName: String(form.get('fullName') ?? '') },
        })
      else {
        const result = await api<{
          id: string
          role: Actor['role']
          passwordChangeRequired: boolean
        }>('/auth/login', { method: 'POST', body: { email, password } })
        if (result.passwordChangeRequired) {
          setActor({
            id: result.id,
            email,
            fullName: email,
            role: result.role,
            passwordChangeRequired: true,
          })
          setMustChangePassword(true)
          go('/ganti-sandi')
          return
        }
      }
      const profile = await api<Actor>('/me')
      setActor(profile)
      go('/dashboard')
      show(
        authMode === 'register'
          ? 'Akun dibuat. Anda dapat langsung memesan kelas.'
          : 'Berhasil masuk.',
      )
    } catch (error) {
      show(message(error))
    } finally {
      setBusy(false)
    }
  }

  async function changePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setBusy(true)
    const form = new FormData(event.currentTarget)
    try {
      await api('/auth/change-password', {
        method: 'POST',
        body: {
          currentPassword: String(form.get('currentPassword')),
          newPassword: String(form.get('newPassword')),
        },
      })
      setMustChangePassword(false)
      setActor(await api<Actor>('/me'))
      go('/dashboard')
      show('Kata sandi baru tersimpan.')
    } catch (error) {
      show(message(error))
    } finally {
      setBusy(false)
    }
  }

  async function logout() {
    try {
      await api('/auth/logout', { method: 'POST' })
    } catch (error) {
      show(message(error))
      return
    }
    setActor(null)
    resetCustomer()
    go('/')
    show('Anda telah keluar.')
  }

  return {
    actor,
    setActor,
    authReady,
    mustChangePassword,
    authMode,
    setAuthMode,
    authenticate,
    changePassword,
    logout,
  }
}
