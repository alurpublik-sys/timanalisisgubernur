import Image from 'next/image'
import Link from 'next/link'
import { AppShell } from '@/components/app-shell'
import { ANWAR_HAFID_PHOTO } from '@/lib/branding'
import { createClient } from '@/lib/supabase/server'

const emptyOverview = {
  total_kunjungan: 0,
  total_isu: 0,
  total_policy_brief: 0,
  total_media: 0,
  total_agenda: 0,
  total_tim: 0,
  media_positif: 0,
  media_netral: 0,
  media_negatif: 0,
  isu_tinggi: 0,
  isu_sedang: 0,
  isu_rendah: 0,
}

export default async function DashboardPage() {
  const supabase = await createClient(null)
  const [{ data: overviewRow }, { data: recentAgenda }, { data: recentBerani }, { data: beraniPrograms }] = await Promise.all([
    supabase.from('dashboard_overview').select('*').single(),
    supabase
      .from('agenda')
      .select('kode,legacy_id,nama_agenda,tanggal,tipe,status')
      .order('tanggal', { ascending: false })
      .order('id', { ascending: false })
      .limit(5),
    supabase
      .from('berani_updates')
      .select('id,program_id,title,period_label,row_count,created_at')
      .order('created_at', { ascending: false })
      .limit(3),
    supabase.from('berani_programs').select('id,name,slug').eq('active', true),
  ])

  const overview = { ...emptyOverview, ...(overviewRow ?? {}) }
  const beraniMap = new Map((beraniPrograms ?? []).map((program) => [program.id, program]))
  const cards = [
    ['Kunjungan OPD', overview.total_kunjungan ?? 0, '/kunjungan', 'Relasi lapangan & notulensi'],
    ['Isu Strategis', overview.total_isu ?? 0, '/isu-strategis', 'Isu prioritas yang dipantau'],
    ['Policy Brief', overview.total_policy_brief ?? 0, '/policy-brief', 'Rekomendasi kebijakan'],
    ['Media Monitor', overview.total_media ?? 0, '/media-monitor', 'Berita & sentimen publik'],
    ['Agenda & Tugas', overview.total_agenda ?? 0, '/agenda', 'Koordinasi kerja strategis'],
    ['Tim Analisis', overview.total_tim ?? 0, '/tim-analisis', 'Kekuatan analisis AH Center'],
  ] as const

  return (
    <AppShell active="/dashboard" title="Dashboard Strategis">
      <section className="executive-hero">
        <div className="hero-copy">
          <p className="eyebrow hero-eyebrow">STRATEGIC INTELLIGENCE HUB</p>
          <h2>Satu pusat kerja untuk membaca situasi, merumuskan arah, dan menjaga tindak lanjut.</h2>
          <p>AH Center menyatukan kunjungan OPD, isu strategis, policy brief, media monitoring, agenda, data 9 BERANI, temuan OPD, dan kolaborasi Tim Analisis dalam satu dashboard yang ringkas.</p>
          <div className="hero-actions">
            <Link className="primary-button hero-primary" href="/berani" prefetch>Buka 9 BERANI</Link>
            <Link className="ghost-button" href="/temuan-opd" prefetch>Lihat Temuan OPD</Link>
          </div>
        </div>
        <div className="hero-portrait-stage" aria-label="Anwar Hafid">
          <div className="hero-orbit hero-orbit-one" />
          <div className="hero-orbit hero-orbit-two" />
          <Image
            src={ANWAR_HAFID_PHOTO}
            alt="Dr. H. Anwar Hafid, M.Si."
            width={560}
            height={560}
            sizes="(max-width: 760px) 72vw, (max-width: 1100px) 44vw, 34vw"
            quality={84}
            className="hero-portrait"
            priority
          />
          <div className="hero-nameplate"><strong>Dr. H. Anwar Hafid, M.Si.</strong><span>Gubernur Sulawesi Tengah</span></div>
        </div>
      </section>

      <section className="stats-grid strategic-stats">
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
        <article className="panel insight-card">
          <div className="panel-head"><div><p className="eyebrow">ISU STRATEGIS</p><h2>Komposisi Prioritas</h2></div><Link href="/isu-strategis" prefetch>Buka isu</Link></div>
          <div className="metric-list">
            <div><span>Prioritas Tinggi</span><b>{overview.isu_tinggi ?? 0}</b></div>
            <div><span>Prioritas Sedang</span><b>{overview.isu_sedang ?? 0}</b></div>
            <div><span>Prioritas Rendah</span><b>{overview.isu_rendah ?? 0}</b></div>
            <div><span>Total dipantau</span><b>{overview.total_isu ?? 0}</b></div>
          </div>
        </article>
      </section>

      <section className="panel knowledge-dashboard-panel">
        <div className="panel-head"><div><p className="eyebrow">9 BERANI</p><h2>Update Program Terbaru</h2></div><Link href="/berani" prefetch>Lihat semua</Link></div>
        <div className="knowledge-dashboard-grid">
          {(recentBerani ?? []).map((update) => {
            const program = beraniMap.get(update.program_id)
            return <Link href={program ? `/berani/${program.slug}?update=${update.id}` : '/berani'} className="knowledge-dashboard-item" key={update.id}>
              <span>{program?.name || '9 BERANI'}</span>
              <strong>{update.title}</strong>
              <small>{update.period_label || 'Update terbaru'} · {update.row_count} baris data</small>
            </Link>
          })}
          {(recentBerani ?? []).length === 0 ? <div className="empty">Belum ada update 9 BERANI.</div> : null}
        </div>
      </section>

      <section className="content-grid dashboard-bottom-grid">
        <article className="panel">
          <div className="panel-head"><div><p className="eyebrow">AKTIVITAS TERBARU</p><h2>Agenda & Tugas</h2></div><Link href="/agenda" prefetch>Lihat semua</Link></div>
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
          <p>Dashboard dirancang untuk bergerak cepat tanpa login umum. Data kunjungan, 9 BERANI, dan temuan OPD dapat dibaca bersama agar informasi penting tidak berhenti sebagai dokumen terpisah.</p>
          <Link className="secondary-button" href="/temuan-opd" prefetch>Buka Temuan OPD</Link>
        </article>
      </section>
    </AppShell>
  )
}
