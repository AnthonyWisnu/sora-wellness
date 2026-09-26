import { ArrowRight } from 'lucide-react'
import type { FormEvent } from 'react'

type LoginProps = {
  authMode: 'login' | 'register'
  setAuthMode: (mode: 'login' | 'register') => void
  busy: boolean
  authenticate: (event: FormEvent<HTMLFormElement>) => void
  go: (path: string) => void
}
export function LoginPage({ authMode, setAuthMode, busy, authenticate, go }: LoginProps) {
  return (
    <main className="login-page">
      <div
        className="login-visual"
        style={{
          backgroundImage:
            'linear-gradient(0deg,rgba(24,48,35,.55),rgba(24,48,35,.1)),url(/images/yoga-class.png)',
        }}
      />
      <div className="login-content">
        <button className="back-link" onClick={() => go('/')}>
          <ArrowRight size={16} /> Kembali ke beranda
        </button>
        <div className="eyebrow">AKUN STUDIO</div>
        <h1>{authMode === 'login' ? 'Selamat datang kembali.' : 'Mulai perjalanan Anda.'}</h1>
        <p>Gunakan email dan kata sandi untuk mengakses kelas.</p>
        <form className="live-form" onSubmit={(event) => void authenticate(event)}>
          {authMode === 'register' && (
            <label>
              Nama lengkap
              <input name="fullName" minLength={2} required autoComplete="name" />
            </label>
          )}
          <label>
            Email
            <input name="email" type="email" required autoComplete="email" />
          </label>
          <label>
            Kata sandi
            <input
              name="password"
              type="password"
              minLength={authMode === 'register' ? 12 : undefined}
              required
              autoComplete={authMode === 'login' ? 'current-password' : 'new-password'}
            />
          </label>
          <button className="button button-primary full-width" disabled={busy}>
            {busy ? 'Memproses...' : authMode === 'login' ? 'Masuk' : 'Daftar dan masuk'}{' '}
            <ArrowRight size={16} />
          </button>
        </form>
        <button
          className="live-switch"
          onClick={() => setAuthMode(authMode === 'login' ? 'register' : 'login')}
        >
          {authMode === 'login' ? 'Belum punya akun? Daftar di sini' : 'Sudah punya akun? Masuk'}
        </button>
        <p className="live-note">
          Lupa kata sandi? Datang ke studio untuk meminta reset kepada admin.
        </p>
      </div>
    </main>
  )
}
