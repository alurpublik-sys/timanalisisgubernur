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
      <p>Akun Supabase Auth sudah valid. Untuk keamanan, akun baru otomatis dibuat sebagai <b>viewer nonaktif</b> dan baru dapat membaca data AH Center setelah diaktifkan admin.</p>
      <div className="notice notice-info">
        <b>Email</b><br />{user.email || '-'}<br /><br />
        <b>User ID</b><br /><code>{user.id}</code>
      </div>
      <p className="muted">Berikan email atau User ID ini kepada admin AH Center. Admin dapat mengaktifkan akun dan memilih role viewer, editor, atau admin dari menu Pengaturan.</p>
      <SignOutButton />
    </section>
  </main>
}
