import Link from 'next/link'
import { AppShell } from '@/components/app-shell'
import { requireUser } from '@/lib/auth'
import { getKinerjaData } from '@/lib/kinerja'

export default async function DashboardPage() {
  const { supabase, user } = await requireUser()
  const [{ count: totalKunjungan }, { count: totalIsu }, { count: totalPolicy }, { data: recentAgenda }, kinerja] = await Promise.all([
    supabase.from('kunjungan').select('*', { count: 'exact', head: true }),
    supabase.from('isu_strategis').select('*', { count: 'exact', head: true }),
    supabase.from('rekomendasi').select('*', { count: 'exact', head: true }),
    supabase.from('agenda').select('kode,nama_agenda,tanggal,tipe,status').order('tanggal', { ascending: false }).limit(5),
    getKinerjaData(),
  ])

  return <AppShell active="/dashboard" title="Dashboard Strategis" email={user.email}>
    <section className="stats-grid">
      <article className="stat-card"><span>Kunjungan OPD</span><strong>{totalKunjungan ?? 0}</strong><small>Database kunjungan & notulensi</small></article>
      <article className="stat-card"><span>Isu Strategis</span><strong>{totalIsu ?? 0}</strong><small>Isu yang sedang dipantau</small></article>
      <article className="stat-card"><span>Policy Brief</span><strong>{totalPolicy ?? 0}</strong><small>Rekomendasi kebijakan</small></article>
    </section>

    <section className="summary-grid" style={{ marginTop: 16 }}>
      <article className="panel summary-card"><p className="eyebrow">KINERJA · {kinerja.period}</p><strong>{kinerja.summary.totalAgenda}</strong><span className="muted">agenda tim bulan ini</span></article>
      <article className="panel summary-card"><p className="eyebrow">KEHADIRAN</p><strong>{kinerja.summary.attendanceRate}%</strong><span className="muted">rata-rata kehadiran wajib</span></article>
      <article className="panel summary-card"><p className="eyebrow">KONTRIBUSI</p><strong>{kinerja.summary.completedContributions}</strong><span className="muted">dari {kinerja.summary.totalContributions} kontribusi selesai</span></article>
      <article className="panel summary-card"><p className="eyebrow">DALAM PROSES</p><strong>{kinerja.summary.inProgressContributions}</strong><span className="muted">kontribusi belum selesai</span></article>
    </section>

    <section className="content-grid">
      <article className="panel">
        <div className="panel-head"><div><p className="eyebrow">AKTIVITAS TERBARU</p><h2>Agenda & Tugas</h2></div><Link href="/agenda">Lihat semua</Link></div>
        <div className="agenda-list">
          {(recentAgenda ?? []).length === 0 ? <div className="empty">Belum ada agenda.</div> : recentAgenda!.map((row) => <div className="agenda-row" key={row.kode}>
            <div><strong>{row.nama_agenda}</strong><span>{row.kode} · {row.tipe || 'Agenda'}</span></div>
            <div className="agenda-meta"><span>{row.tanggal}</span><b>{row.status}</b></div>
          </div>)}
        </div>
      </article>
      <article className="panel accent-panel">
        <p className="eyebrow">KINERJA TIM</p><h2>Evaluasi bulanan</h2>
        <p>Perhitungan agenda wajib, kehadiran, kontribusi, potongan, finalisasi, dan buka kembali evaluasi dipertahankan dari AH Center lama.</p>
        <p>Untuk bulan berjalan, rekomendasi honor tetap disembunyikan sampai periode benar-benar selesai.</p>
        <Link className="primary-button" href="/kinerja">Buka Kinerja & Honor</Link>
      </article>
    </section>
  </AppShell>
}
