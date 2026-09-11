import { redirect } from 'next/navigation'
import { getAuthContext } from '@/lib/auth'
import { SignOutButton } from '@/components/signout-button'

export default async function AccessPendingPage() {
  const { user, profile } = await getAuthContext()
  if (!user) redirect('/login')
  if (profile?.active) redirect('/dashboard')

  return <main className="auth-page">
    <section className="auth-card">
      <p className="eyebrow">ANWAR HAFID STRATEGIC CENTER</p>
      <h1>Akses belum diaktifkan</h1>
      <p>Akun Auth berhasil masuk, tetapi belum memiliki profile AH Center yang aktif. Admin perlu mendaftarkan akun ini ke tabel profiles.</p>
      <div className="notice notice-info">
        <b>Email</b><br />{user.email || '-'}<br /><br />
        <b>User ID</b><br /><code>{user.id}</code>
      </div>
      <p className="muted">Role tersedia: viewer, editor, admin. Akun tanpa profile aktif tidak dapat membaca data internal.</p>
      <SignOutButton />
    </section>
  </main>
}
