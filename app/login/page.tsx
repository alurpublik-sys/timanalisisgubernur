'use client'

import { useActionState } from 'react'
import { loginWithPin, type LoginState } from '@/lib/actions/pin-auth'

const initialState: LoginState = { error: '' }

export default function LoginPage() {
  const [state, formAction, pending] = useActionState(loginWithPin, initialState)

  return (
    <main className="auth-page">
      <section className="auth-card">
        <p className="eyebrow">ANWAR HAFID STRATEGIC CENTER</p>
        <h1>Masuk Admin</h1>
        <p>Cukup masukkan PIN admin. Tidak ada username atau email.</p>
        <form className="auth-form" action={formAction}>
          <label>PIN Admin
            <input
              name="pin"
              type="password"
              inputMode="numeric"
              pattern="[0-9]{6}"
              maxLength={6}
              minLength={6}
              autoComplete="current-password"
              placeholder="••••••"
              required
              autoFocus
            />
          </label>
          {state.error ? <div className="error-text">{state.error}</div> : null}
          <button disabled={pending}>{pending ? 'Memeriksa...' : 'Masuk'}</button>
        </form>
        <p className="muted">Sesi admin diproteksi cookie HTTP-only dan validasi server-side.</p>
      </section>
    </main>
  )
}
