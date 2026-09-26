import Image from 'next/image'
import Link from 'next/link'
import { AppShell } from '@/components/app-shell'
import { DashboardCursor } from '@/components/dashboard-cursor'
import { getAuthContext } from '@/lib/auth'
import { APP_NAME, APP_TAGLINE, GOVERNOR_PHOTO, VICE_GOVERNOR_PHOTO } from '@/lib/branding'
import { createClient } from '@/lib/supabase/server'

const emptyOverview = {
  total_kunjungan: 0,
  total_media: 0,
  total_tim: 0,
  media_positif: 0,
  media_netral: 0,
  media_negatif: 0,
}

function dateLabel(value: string) {
  return new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium', timeZone: 'Asia/Makassar' }).format(new Date(`${value}T00:00:00+08:00`))
}

export default async function DashboardPage() {
  const auth = await getAuthContext()
  const supabase = auth.supabase ?? await createClient(null)
  const user = auth.user
  const [
    { data: overviewRow },
    { data: recentBerani },
    { data: beraniPrograms },
    { count: findingCount },
    { count: referenceCount },
    { data: recentVisits },
    { data: recentReferences },
  ] = await Promise.all([
    supabase.from('dashboard_overview').select('*').single(),
    supabase.from('berani_updates').select('id,program_id,title,period_label,row_count,created_at').order('created_at', { ascending: false }).limit(3),
    supabase.from('berani_programs').select('id,name,slug').eq('active', true),
    supabase.from('opd_findings').select('*', { count: 'exact', head: true }),
    supabase.from('content_references').select('*', { count: 'exact', head: true }),
    supabase.from('kunjungan').select('id,nama_opd,tanggal,topik,tanggal_estimasi').order('tanggal', { ascending: false }).order('id', { ascending: false }).limit(5),
    supabase.from('content_references').select('id,opd_name,title,status,updated_at').order('updated_at', { ascending: false }).limit(4),
  ])

  const overview = { ...emptyOverview, ...(overviewRow ?? {}) }
  const beraniMap = new Map((beraniPrograms ?? []).map((program) => [program.id, program]))
  const cards = [
    ['Kunjungan OPD', overview.total_kunjungan ?? 0, '/kunjungan', 'Audiensi, notulensi & dokumen'],
    ['Media Monitor', overview.total_media ?? 0, '/media-monitor', 'Berita & sentimen publik'],
    ['9 BERANI', beraniPrograms?.length ?? 0, '/berani', 'Pusat data program unggulan'],
    ['Temuan OPD', findingCount ?? 0, '/temuan-opd', 'Temuan menarik lintas OPD'],
    ['Referensi Konten', referenceCount ?? 0, '/referensi-konten', 'Bahan informasi berbasis sumber'],
    ['Tim Analisis', overview.total_tim ?? 0, '/tim-analisis', 'Direktori tim independen'],
  ] as const

  return (
    <AppShell active="/dashboard" title="Dashboard Strategis" adminMode={Boolean(user)}>
      <DashboardCursor />
      <div className="dashboard-cursor-zone">
      <section className="executive-hero dual-leader-hero">
        <div className="hero-copy">
          <p className="eyebrow hero-eyebrow">INDEPENDENT STRATEGIC ANALYSIS</p>
          <h2>{APP_NAME}</h2>
          <p>{APP_TAGLINE}. Satu ruang kerja untuk kunjungan OPD, media monitoring, data 9 BERANI, temuan lapangan, dan referensi informasi yang siap dipakai.</p>
          <div className="hero-actions">
            <Link className="primary-button hero-primary" href="/berani" prefetch>Buka 9 BERANI</Link>
            <Link className="ghost-button" href="/referensi-konten" prefetch>Referensi Konten</Link>
          </div>
        </div>
        <div className="hero-leaders" aria-label="Pimpinan Provinsi Sulawesi Tengah">
          <div className="leader-portrait leader-governor">
            <Image src={GOVERNOR_PHOTO} alt="Gubernur Sulawesi Tengah" fill sizes="(max-width: 900px) 45vw, 24vw" className="leader-image" unoptimized priority />
            <div className="leader-label"><strong>Dr. H. Anwar Hafid, M.Si.</strong><span>Gubernur Sulawesi Tengah</span></div>
          </div>
          <div className="leader-portrait leader-vice">
            <Image src={VICE_GOVERNOR_PHOTO} alt="Wakil Gubernur Sulawesi Tengah" fill sizes="(max-width: 900px) 45vw, 24vw" className="leader-image" unoptimized priority />
            <div className="leader-label"><strong>dr. Reny A. Lamadjido, Sp.PK., M.Kes</strong><span>Wakil Gubernur Sulawesi Tengah</span></div>
          </div>
        </div>
      </section>

      <section className="stats-grid strategic-stats strategic-stats-six">
        {cards.map(([label, total, href, note]) => (
          <Link href={href} prefetch className="stat-card stat-link" key={href}>
            <span>{label}</span><strong>{total}</strong><small>{note}</small><i aria-hidden>↗</i>
          </Link>
        ))}
      </section>

      <section className="dashboard-insights">
        <article className="panel insight-card">
          <div className="panel-head"><div><p className="eyebrow">MEDIA MONITOR</p><h2>Peta Sentimen</h2></div><Link href="/media-monitor" prefetch>Buka media</Link></div>
          <div className="metric-list">
            <div><span>Positif</span><b>{overview.media_positif ?? 0}</b></div>
            <div><span>Netral</span><b>{overview.media_netral ?? 0}</b></div>
            <div><span>Negatif</span><b>{overview.media_negatif ?? 0}</b></div>
            <div><span>Total berita</span><b>{overview.total_media ?? 0}</b></div>
          </div>
        </article>

        <article className="panel insight-card dashboard-quick-links">
          <div className="panel-head"><div><p className="eyebrow">KNOWLEDGE FLOW</p><h2>Dari data menjadi informasi</h2></div></div>
          <div className="quick-link-grid">
            <Link href="/kunjungan"><strong>Kunjungan OPD</strong><span>Sumber lapangan & notulensi</span></Link>
            <Link href="/temuan-opd"><strong>Temuan OPD</strong><span>Hal penting untuk dicatat</span></Link>
            <Link href="/referensi-konten"><strong>Referensi Konten</strong><span>Informasi yang siap dipakai</span></Link>
            <Link href="/berani"><strong>9 BERANI</strong><span>Data program per update</span></Link>
          </div>
        </article>
      </section>

      <section className="panel knowledge-dashboard-panel">
        <div className="panel-head"><div><p className="eyebrow">9 BERANI</p><h2>Update Program Terbaru</h2></div><Link href="/berani" prefetch>Lihat semua</Link></div>
        <div className="knowledge-dashboard-grid">
          {(recentBerani ?? []).map((update) => {
            const program = beraniMap.get(update.program_id)
            return (
              <Link href={program ? `/berani/${program.slug}?update=${update.id}` : '/berani'} className="knowledge-dashboard-item" key={update.id}>
                <span>{program?.name || '9 BERANI'}</span>
                <strong>{update.title}</strong>
                <small>{update.period_label || 'Update terbaru'} · {update.row_count} data terolah</small>
              </Link>
            )
          })}
        </div>
      </section>

      <section className="content-grid dashboard-bottom-grid">
        <article className="panel">
          <div className="panel-head"><div><p className="eyebrow">KUNJUNGAN TERBARU</p><h2>Riwayat OPD</h2></div><Link href="/kunjungan" prefetch>Lihat semua</Link></div>
          <div className="agenda-list">
            {(recentVisits ?? []).map((row) => (
              <div className="agenda-row" key={row.id}>
                <div><strong>{row.nama_opd}</strong><span>{row.topik}</span></div>
                <div className="agenda-meta"><span>{dateLabel(row.tanggal)}{row.tanggal_estimasi ? ' · estimasi' : ''}</span><b>Selesai</b></div>
              </div>
            ))}
          </div>
        </article>
        <article className="panel">
          <div className="panel-head"><div><p className="eyebrow">REFERENSI KONTEN</p><h2>Pembaruan Informasi</h2></div><Link href="/referensi-konten" prefetch>Buka referensi</Link></div>
          <div className="agenda-list">
            {(recentReferences ?? []).map((row) => (
              <div className="agenda-row" key={row.id}>
                <div><strong>{row.title}</strong><span>{row.opd_name}</span></div>
                <div className="agenda-meta"><b>{row.status}</b></div>
              </div>
            ))}
          </div>
        </article>
      </section>
      </div>
    </AppShell>
  )
}
