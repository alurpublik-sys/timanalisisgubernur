import Link from 'next/link'
import { AppShell } from '@/components/app-shell'
import { requireUser } from '@/lib/auth'
import { getKinerjaData } from '@/lib/kinerja'

export default async function DashboardPage() {
  const { supabase, user } = await requireUser()
  const [
    { count: totalKunjungan }, { count: totalIsu }, { count: totalPolicy }, { count: totalMedia },
    { count: totalAgenda }, { count: totalTim }, { data: recentAgenda }, { data: mediaRows },
    { data: issueRows }, kinerja,
  ] = await Promise.all([
    supabase.from('kunjungan').select('*', { count: 'exact', head: true }),
    supabase.from('isu_strategis').select('*', { count: 'exact', head: true }),
    supabase.from('rekomendasi').select('*', { count: 'exact', head: true }),
    supabase.from('media_monitoring').select('*', { count: 'exact', head: true }),
    supabase.from('agenda').select('*', { count: 'exact', head: true }),
    supabase.from('tim_analisis').select('*', { count: 'exact', head: true }).eq('active', true),
    supabase.from('agenda').select('kode,legacy_id,nama_agenda,tanggal,tipe,status').order('tanggal', { ascending: false }).order('id', { ascending: false }).limit(5),
    supabase.from('media_monitoring').select('sentimen'),
    supabase.from('isu_strategis').select('prioritas,status_monitoring'),
    getKinerjaData(),
  ])

  const media = mediaRows || []
  const sentiment = {
    positif: media.filter((row) => String(row.sentimen || '').toLowerCase() === 'positif').length,
    netral: media.filter((row) => String(row.sentimen || '').toLowerCase() === 'netral').length,
    negatif: media.filter((row) => String(row.sentimen || '').toLowerCase() === 'negatif').length,
    belum: media.filter((row) => !String(row.sentimen || '').trim()).length,
  }
  const issues = issueRows || []
  const priorities = {
    tinggi: issues.filter((row) => String(row.prioritas || '').toLowerCase() === 'tinggi').length,
    sedang: issues.filter((row) => String(row.prioritas || '').toLowerCase() === 'sedang').length,
    rendah: issues.filter((row) => String(row.prioritas || '').toLowerCase() === 'rendah').length,
  }

  return <AppShell active="/dashboard" title="Dashboard Strategis" email={user.email}>
    <section className="stats-grid strategic-stats">
      <Link href="/kunjungan" className="stat-card stat-link"><span>Kunjungan OPD</span><strong>{totalKunjungan ?? 0}</strong><small>Database kunjungan & notulensi</small></Link>
      <Link href="/isu-strategis" className="stat-card stat-link"><span>Isu Strategis</span><strong>{totalIsu ?? 0}</strong><small>Isu dalam database monitoring</small></Link>
      <Link href="/policy-brief" className="stat-card stat-link"><span>Policy Brief</span><strong>{totalPolicy ?? 0}</strong><small>Rekomendasi kebijakan</small></Link>
      <Link href="/media-monitor" className="stat-card stat-link"><span>Media Monitor</span><strong>{totalMedia ?? 0}</strong><small>Berita dan pemantauan sentimen</small></Link>
      <Link href="/agenda" className="stat-card stat-link"><span>Agenda & Tugas</span><strong>{totalAgenda ?? 0}</strong><small>Agenda operasional tercatat</small></Link>
      <Link href="/tim-analisis" className="stat-card stat-link"><span>Tim Analisis</span><strong>{totalTim ?? 0}</strong><small>Anggota aktif</small></Link>
    </section>

    <section className="summary-grid" style={{ marginTop: 16 }}>
      <article className="panel summary-card"><p className="eyebrow">KINERJA · {kinerja.period}</p><strong>{kinerja.summary.totalAgenda}</strong><span className="muted">agenda tim bulan ini</span></article>
      <article className="panel summary-card"><p className="eyebrow">KEHADIRAN</p><strong>{kinerja.summary.attendanceRate}%</strong><span className="muted">rata-rata kehadiran wajib</span></article>
      <article className="panel summary-card"><p className="eyebrow">KONTRIBUSI</p><strong>{kinerja.summary.completedContributions}</strong><span className="muted">dari {kinerja.summary.totalContributions} kontribusi selesai</span></article>
      <article className="panel summary-card"><p className="eyebrow">DALAM PROSES</p><strong>{kinerja.summary.inProgressContributions}</strong><span className="muted">kontribusi belum selesai</span></article>
    </section>

    <section className="dashboard-insights">
      <article className="panel insight-card">
        <div className="panel-head"><div><p className="eyebrow">MEDIA MONITOR</p><h2>Sentimen Database</h2></div><Link href="/media-monitor">Buka media</Link></div>
        <div className="metric-list">
          <div><span>Positif</span><b>{sentiment.positif}</b></div>
          <div><span>Netral</span><b>{sentiment.netral}</b></div>
          <div><span>Negatif</span><b>{sentiment.negatif}</b></div>
          <div><span>Belum diklasifikasi</span><b>{sentiment.belum}</b></div>
        </div>
      </article>
      <article className="panel insight-card">
        <div className="panel-head"><div><p className="eyebrow">ISU STRATEGIS</p><h2>Prioritas Isu</h2></div><Link href="/isu-strategis">Buka isu</Link></div>
        <div className="metric-list">
          <div><span>Prioritas Tinggi</span><b>{priorities.tinggi}</b></div>
          <div><span>Prioritas Sedang</span><b>{priorities.sedang}</b></div>
          <div><span>Prioritas Rendah</span><b>{priorities.rendah}</b></div>
          <div><span>Total dipantau</span><b>{issues.length}</b></div>
        </div>
      </article>
    </section>

    <section className="content-grid">
      <article className="panel">
        <div className="panel-head"><div><p className="eyebrow">AKTIVITAS TERBARU</p><h2>Agenda & Tugas</h2></div><Link href="/agenda">Lihat semua</Link></div>
        <div className="agenda-list">
          {(recentAgenda ?? []).length === 0 ? <div className="empty">Belum ada agenda.</div> : recentAgenda!.map((row) => <div className="agenda-row" key={row.kode}>
            <div><strong>{row.nama_agenda}</strong><span>{row.legacy_id || row.kode} · {row.tipe || 'Agenda'}</span></div>
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
