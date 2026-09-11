'use client'

import { FormEvent, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function submit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    setLoading(false)
    if (error) {
      setError(error.message)
      return
    }
    router.replace('/dashboard')
    router.refresh()
  }

  return (
    <main className="auth-page">
      <section className="auth-card">
        <p className="eyebrow">ANWAR HAFID STRATEGIC CENTER</p>
        <h1>Masuk AH Center</h1>
        <p>Gunakan akun internal yang terdaftar pada Supabase Auth.</p>
        <form className="auth-form" onSubmit={submit}>
          <label>Email<input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required /></label>
          <label>Password<input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required /></label>
          {error ? <div className="error-text">{error}</div> : null}
          <button disabled={loading}>{loading ? 'Memproses...' : 'Masuk'}</button>
        </form>
        <p className="muted">Akses data akan dibatasi oleh Supabase Auth + RLS.</p>
      </section>
    </main>
  )
}
