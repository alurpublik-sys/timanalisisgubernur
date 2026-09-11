import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

const menu = [
  ['Dashboard', '/dashboard'],
  ['Kunjungan OPD', '/kunjungan'],
  ['Isu Strategis', '/isu-strategis'],
  ['Policy Brief', '/policy-brief'],
  ['Media Monitor', '/media-monitor'],
  ['Agenda & Tugas', '/agenda'],
  ['Tim Analisis', '/tim-analisis'],
  ['Kinerja & Honor', '/kinerja'],
]

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [{ count: totalKunjungan }, { count: totalIsu }, { count: totalPolicy }, { data: recentAgenda }] = await Promise.all([
    supabase.from('kunjungan').select('*', { count: 'exact', head: true }),
    supabase.from('isu_strategis').select('*', { count: 'exact', head: true }),
    supabase.from('rekomendasi').select('*', { count: 'exact', head: true }),
    supabase.from('agenda').select('kode,nama_agenda,tanggal,tipe,status').order('tanggal', { ascending: false }).limit(5),
  ])

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand"><div className="brand-mark">AH</div><div><strong>Strategic</strong><span>Center</span></div></div>
        <nav>{menu.map(([label, href], i) => <Link key={href} href={href} className={i === 0 ? 'active' : ''}>{label}</Link>)}</nav>
      </aside>
      <main className="main-content">
        <header className="topbar"><div><p className="eyebrow">ANWAR HAFID STRATEGIC CENTER</p><h1>Dashboard Strategis</h1></div><div className="user-chip">{user.email}</div></header>

        <section className="stats-grid">
          <article className="stat-card"><span>Kunjungan OPD</span><strong>{totalKunjungan ?? 0}</strong><small>Database kunjungan & notulensi</small></article>
          <article className="stat-card"><span>Isu Strategis</span><strong>{totalIsu ?? 0}</strong><small>Isu yang sedang dipantau</small></article>
          <article className="stat-card"><span>Policy Brief</span><strong>{totalPolicy ?? 0}</strong><small>Rekomendasi kebijakan</small></article>
        </section>

        <section className="content-grid">
          <article className="panel">
            <div className="panel-head"><div><p className="eyebrow">AKTIVITAS TERBARU</p><h2>Agenda & Tugas</h2></div><Link href="/agenda">Lihat semua</Link></div>
            <div className="agenda-list">
              {(recentAgenda ?? []).length === 0 ? <div className="empty">Belum ada agenda.</div> : recentAgenda!.map((row) => (
                <div className="agenda-row" key={row.kode}>
                  <div><strong>{row.nama_agenda}</strong><span>{row.kode} · {row.tipe || 'Agenda'}</span></div>
                  <div className="agenda-meta"><span>{row.tanggal}</span><b>{row.status}</b></div>
                </div>
              ))}
            </div>
          </article>
          <article className="panel accent-panel">
            <p className="eyebrow">KINERJA TIM</p><h2>Evaluasi bulanan</h2><p>Modul ini mempertahankan perhitungan agenda wajib, kehadiran, kontribusi, potongan, finalisasi, dan buka kembali evaluasi dari aplikasi lama.</p><Link className="primary-button" href="/kinerja">Buka Kinerja & Honor</Link>
          </article>
        </section>
      </main>
    </div>
  )
}
