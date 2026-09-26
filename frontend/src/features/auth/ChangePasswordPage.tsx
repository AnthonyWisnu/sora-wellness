import type { FormEvent } from 'react'

type ChangePasswordProps = {
  busy: boolean
  changePassword: (event: FormEvent<HTMLFormElement>) => void
}
export function ChangePasswordPage({ busy, changePassword }: ChangePasswordProps) {
  return (
    <main className="live-centered">
      <div className="panel">
        <div className="eyebrow">KEAMANAN AKUN</div>
        <h1>Ganti kata sandi sementara</h1>
        <p>
          Admin memberikan kata sandi sementara. Buat kata sandi baru sebelum membuka dashboard.
        </p>
        <form className="live-form" onSubmit={(event) => void changePassword(event)}>
          <label>
            Kata sandi sementara
            <input name="currentPassword" type="password" required />
          </label>
          <label>
            Kata sandi baru
            <input name="newPassword" type="password" minLength={12} required />
          </label>
          <button className="button button-primary" disabled={busy}>
            Simpan kata sandi
          </button>
        </form>
      </div>
    </main>
  )
}
