import Image from 'next/image'
import Link from 'next/link'
import { AppShell } from '@/components/app-shell'
import { ANWAR_HAFID_PHOTO } from '@/lib/branding'
import { createClient } from '@/lib/supabase/server'

export default async function DashboardPage() {
  const supabase = await createClient(null)
  const [
    { count: totalKunjungan }, { count: totalIsu }, { count: totalPolicy }, { count: totalMedia },
    { count: totalAgenda }, { count: totalTim }, { data: recentAgenda }, { data: mediaRows }, { data: issueRows },
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
  ])

  const media = mediaRows || []
  const sentiment = {
    positif: media.filter((row) => String(row.sentimen || '').toLowerCase() === 'positif').length,
    netral: media.filter((row) => String(row.sentimen || '').toLowerCase() === 'netral').length,
    negatif: media.filter((row) => String(row.sentimen || '').toLowerCase() === 'negatif').length,
  }
  const issues = issueRows || []
  const priorities = {
    tinggi: issues.filter((row) => String(row.prioritas || '').toLowerCase() === 'tinggi').length,
    sedang: issues.filter((row) => String(row.prioritas || '').toLowerCase() === 'sedang').length,
    rendah: issues.filter((row) => String(row.prioritas || '').toLowerCase() === 'rendah').length,
  }

  const cards = [
    ['Kunjungan OPD', totalKunjungan ?? 0, '/kunjungan', 'Relasi lapangan & notulensi'],
    ['Isu Strategis', totalIsu ?? 0, '/isu-strategis', 'Isu prioritas yang dipantau'],
    ['Policy Brief', totalPolicy ?? 0, '/policy-brief', 'Rekomendasi kebijakan'],
    ['Media Monitor', totalMedia ?? 0, '/media-monitor', 'Berita & sentimen publik'],
    ['Agenda & Tugas', totalAgenda ?? 0, '/agenda', 'Koordinasi kerja strategis'],
    ['Tim Analisis', totalTim ?? 0, '/tim-analisis', 'Kekuatan analisis AH Center'],
  ] as const

  return (
    <AppShell active="/dashboard" title="Dashboard Strategis">
      <section className="executive-hero">
        <div className="hero-copy">
          <p className="eyebrow hero-eyebrow">STRATEGIC INTELLIGENCE HUB</p>
          <h2>Satu pusat kerja untuk membaca situasi, merumuskan arah, dan menjaga tindak lanjut.</h2>
          <p>AH Center menyatukan kunjungan OPD, isu strategis, policy brief, media monitoring, agenda, dan kolaborasi Tim Analisis dalam satu dashboard yang ringkas.</p>
          <div className="hero-actions">
            <Link className="primary-button hero-primary" href="/isu-strategis">Lihat Isu Strategis</Link>
            <Link className="ghost-button" href="/policy-brief">Buka Policy Brief</Link>
          </div>
        </div>
        <div className="hero-portrait-stage" aria-label="Anwar Hafid">
          <div className="hero-orbit hero-orbit-one" />
          <div className="hero-orbit hero-orbit-two" />
          <Image src={ANWAR_HAFID_PHOTO} alt="Dr. H. Anwar Hafid, M.Si." width={560} height={560} className="hero-portrait" priority unoptimized />
          <div className="hero-nameplate"><strong>Dr. H. Anwar Hafid, M.Si.</strong><span>Gubernur Sulawesi Tengah</span></div>
        </div>
      </section>

      <section className="stats-grid strategic-stats">
        {cards.map(([label, total, href, note]) => (
          <Link href={href} className="stat-card stat-link" key={href}>
            <span>{label}</span><strong>{total}</strong><small>{note}</small><i aria-hidden>↗</i>
          </Link>
        ))}
      </section>

      <section className="dashboard-insights">
        <article className="panel insight-card">
          <div className="panel-head"><div><p className="eyebrow">MEDIA MONITOR</p><h2>Peta Sentimen</h2></div><Link href="/media-monitor">Buka media</Link></div>
          <div className="metric-list">
            <div><span>Positif</span><b>{sentiment.positif}</b></div>
            <div><span>Netral</span><b>{sentiment.netral}</b></div>
            <div><span>Negatif</span><b>{sentiment.negatif}</b></div>
            <div><span>Total berita</span><b>{media.length}</b></div>
          </div>
        </article>
        <article className="panel insight-card">
          <div className="panel-head"><div><p className="eyebrow">ISU STRATEGIS</p><h2>Komposisi Prioritas</h2></div><Link href="/isu-strategis">Buka isu</Link></div>
          <div className="metric-list">
            <div><span>Prioritas Tinggi</span><b>{priorities.tinggi}</b></div>
            <div><span>Prioritas Sedang</span><b>{priorities.sedang}</b></div>
            <div><span>Prioritas Rendah</span><b>{priorities.rendah}</b></div>
            <div><span>Total dipantau</span><b>{issues.length}</b></div>
          </div>
        </article>
      </section>

      <section className="content-grid dashboard-bottom-grid">
        <article className="panel">
          <div className="panel-head"><div><p className="eyebrow">AKTIVITAS TERBARU</p><h2>Agenda & Tugas</h2></div><Link href="/agenda">Lihat semua</Link></div>
          <div className="agenda-list">
            {(recentAgenda ?? []).length === 0 ? <div className="empty">Belum ada agenda.</div> : recentAgenda!.map((row) => (
              <div className="agenda-row" key={row.kode || row.legacy_id}>
                <div><strong>{row.nama_agenda}</strong><span>{row.legacy_id || row.kode} · {row.tipe || 'Agenda'}</span></div>
                <div className="agenda-meta"><span>{row.tanggal}</span><b>{row.status}</b></div>
              </div>
            ))}
          </div>
        </article>
        <article className="panel command-card">
          <p className="eyebrow">AH CENTER</p>
          <h2>Fokus pada data yang mendorong keputusan.</h2>
          <p>Dashboard kini dibuat tanpa login umum. Pengaturan sistem dan pengelolaan aset Tim Analisis tetap dikunci dengan PIN administrator.</p>
          <Link className="secondary-button" href="/tim-analisis">Kenali Tim Analisis</Link>
        </article>
      </section>
    </AppShell>
  )
}
