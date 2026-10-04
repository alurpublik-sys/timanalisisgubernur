import Image from 'next/image'
import Link from 'next/link'
import { getAuthContext } from '@/lib/auth'
import { APP_NAME, APP_TAGLINE, GOVERNOR_PHOTO, VICE_GOVERNOR_PHOTO } from '@/lib/branding'
import { createClient } from '@/lib/supabase/server'

type DashboardProgram={id:number;name:string;slug:string;summary:string|null;sort_order:number}
type DashboardPayload={
  overview:Record<string,number|null>
  renstra_count:number
  reference_count:number
  pending_references:number
  programs:DashboardProgram[]
  updated_program_ids:number[]
  recent_berani:Array<{id:number;program_id:number;title:string;period_label:string|null;row_count:number;created_at:string}>
  recent_visits:Array<{id:number;nama_opd:string;tanggal:string;topik:string;tanggal_estimasi:boolean;status:string}>
  recent_references:Array<{id:number;opd_name:string;title:string;status:string;updated_at:string}>
  negative_media:Array<{id:number;judul_berita:string;nama_media:string|null;tanggal:string;link_berita:string|null;issue_category:string}>
}
const emptyOverview={total_kunjungan:0,total_media:0,total_tim:0,media_positif:0,media_netral:0,media_negatif:0}
function dateLabel(value:string){return new Intl.DateTimeFormat('id-ID',{dateStyle:'medium',timeZone:'Asia/Makassar'}).format(new Date(`${value}T00:00:00+08:00`))}
function tone(value:number){return value>0?'attention':'safe'}

export default async function DashboardPage(){
  const auth=await getAuthContext()
  const supabase=auth.supabase??await createClient(null)
  const user=auth.user
  const findingPromise=user
    ? supabase.from('opd_findings').select('id,opd_name,title,category,finding_date').in('category',['Perlu Perhatian','Tindak Lanjut']).order('finding_date',{ascending:false}).order('id',{ascending:false}).limit(6)
    : Promise.resolve({data:[] as Array<{id:number;opd_name:string;title:string;category:string;finding_date:string}>})
  const findingCountPromise=user
    ? supabase.from('opd_findings').select('*',{count:'exact',head:true})
    : Promise.resolve({count:null as number|null})

  const [{data:payloadRaw,error:payloadError},findingResult,findingCountResult]=await Promise.all([
    supabase.rpc('dashboard_public_payload'),
    findingPromise,
    findingCountPromise,
  ])
  if(payloadError) throw new Error(payloadError.message)
  const payload=(payloadRaw??{}) as unknown as DashboardPayload
  const overview={...emptyOverview,...(payload.overview??{})}
  const programs=payload.programs
  const recentBerani=payload.recent_berani??[]
  const recentVisits=payload.recent_visits??[]
  const recentReferences=payload.recent_references??[]
  const negativeMedia=payload.negative_media??[]
  const referenceCount=payload.reference_count??0
  const renstraCount=payload.renstra_count??0
  const pendingReferences=payload.pending_references??0
  const findingCount=findingCountResult.count
  const updatePrograms=(payload.updated_program_ids??[]).map((program_id)=>({program_id}))

  const programMap=new Map((programs??[]).map((p)=>[p.id,p]))
  const updatedIds=new Set((updatePrograms??[]).map((u)=>u.program_id))
  const missingPrograms=(programs??[]).filter((p)=>!updatedIds.has(p.id))
  const attentionFindings=findingResult.data??[]
  const cards=[
    ['Kunjungan OPD',overview.total_kunjungan??0,'/kunjungan','Audiensi, notulensi & dokumen'],
    ['Renstra OPD',renstraCount??0,'/renstra-opd','Dokumen perencanaan perangkat daerah'],
    ['Media Monitor',overview.total_media??0,'/media-monitor','Berita & sentimen publik'],
    ['9 BERANI',programs.length,'/berani','Pusat data program unggulan'],
    ['Temuan OPD',user?(findingCount??0):'PIN','/temuan-opd',user?'Temuan menarik lintas OPD':'Akses dilindungi PIN'],
    ['Referensi Konten',referenceCount??0,'/referensi-konten','Bahan informasi berbasis sumber'],
    ['Tim Analisis',overview.total_tim??0,'/tim-analisis','Direktori tim independen'],
  ] as const
  const priorities=[
    {label:'Media negatif',value:overview.media_negatif??0,note:'Perlu dipantau untuk respons dan konteks.',href:'/media-monitor?sentimen=Negatif',state:tone(overview.media_negatif??0)},
    {label:'Program belum update',value:missingPrograms.length,note:missingPrograms.length?missingPrograms.map((p)=>p.name.replace('BERANI ','')).join(', '):'Semua program memiliki update.',href:'/berani',state:tone(missingPrograms.length)},
    {label:'Referensi perlu cek',value:pendingReferences??0,note:'Draft atau sumber yang masih perlu diverifikasi.',href:'/referensi-konten',state:tone(pendingReferences??0)},
    {label:'Temuan tindak lanjut',value:user?attentionFindings.length:'PIN',note:user?'Catatan terbaru yang perlu perhatian/tindak lanjut.':'Buka dengan PIN admin saat dibutuhkan.',href:'/temuan-opd',state:user?tone(attentionFindings.length):'locked'},
  ]

  return <>
    <div className="dashboard-cursor-zone">
      <section className="executive-hero dual-leader-hero">
        <div className="hero-copy"><p className="eyebrow hero-eyebrow">INDEPENDENT STRATEGIC ANALYSIS</p><h2>{APP_NAME}</h2><p>{APP_TAGLINE}. Satu ruang kerja untuk kunjungan OPD, media monitoring, data 9 BERANI, temuan lapangan, dan referensi informasi yang siap dipakai.</p><div className="hero-actions"><Link className="primary-button hero-primary" href="/berani">Buka 9 BERANI</Link><Link className="ghost-button" href="/referensi-konten">Referensi Konten</Link></div></div>
        <div className="hero-leaders" aria-label="Pimpinan Provinsi Sulawesi Tengah">
          <div className="leader-portrait leader-governor"><Image src={GOVERNOR_PHOTO} alt="Gubernur Sulawesi Tengah" fill sizes="(max-width: 900px) 45vw, 24vw" className="leader-image" unoptimized priority /><div className="leader-label"><strong>Dr. H. Anwar Hafid, M.Si.</strong><span>Gubernur Sulawesi Tengah</span></div></div>
          <div className="leader-portrait leader-vice"><Image src={VICE_GOVERNOR_PHOTO} alt="Wakil Gubernur Sulawesi Tengah" fill sizes="(max-width: 900px) 45vw, 24vw" className="leader-image" unoptimized priority /><div className="leader-label"><strong>dr. Reny A. Lamadjido, Sp.PK., M.Kes</strong><span>Wakil Gubernur Sulawesi Tengah</span></div></div>
        </div>
      </section>

      <section className="stats-grid strategic-stats strategic-stats-six">{cards.map(([label,total,href,note])=><Link href={href}  className="stat-card stat-link" key={href}><span>{label}</span><strong>{total}</strong><small>{note}</small><i aria-hidden>↗</i></Link>)}</section>

      <section className="command-center-shell">
        <div className="command-center-heading"><div><p className="eyebrow">COMMAND CENTER</p><h2>Prioritas yang perlu dilihat sekarang</h2></div><span>Ringkasan otomatis dari data aktif</span></div>
        <div className="command-center-grid">
          <div className="command-priority-grid">{priorities.map((item)=><Link href={item.href} className={`command-priority-card is-${item.state}`} key={item.label}><div><span>{item.label}</span><strong>{item.value}</strong></div><p>{item.note}</p><small>{item.state==='safe'?'Aman':item.state==='locked'?'Terkunci':'Perlu perhatian'} <b>→</b></small></Link>)}</div>
          <article className="panel command-signal-panel">
            <div className="panel-head"><div><p className="eyebrow">ISU PERLU PERHATIAN</p><h2>Sinyal terbaru</h2></div><Link href="/media-monitor">Buka monitoring</Link></div>
            <div className="command-signal-list">
              {(negativeMedia).map((m)=><a href={m.link_berita||'/media-monitor?sentimen=Negatif'} target={m.link_berita?'_blank':undefined} rel={m.link_berita?'noreferrer':undefined} className="command-signal-row" key={m.id}><span className="signal-dot signal-negative"/><div><strong>{m.judul_berita}</strong><small>{m.nama_media||'Media'} · {dateLabel(m.tanggal)} · {m.issue_category}</small></div><b>↗</b></a>)}
              {user?attentionFindings.slice(0,3).map((f)=><Link href="/temuan-opd" className="command-signal-row" key={`f-${f.id}`}><span className="signal-dot signal-finding"/><div><strong>{f.title}</strong><small>{f.opd_name} · {f.category}</small></div><b>→</b></Link>):null}
              {!negativeMedia.length&&!attentionFindings.length?<p className="muted-line">Belum ada sinyal prioritas dari data terbaru.</p>:null}
            </div>
          </article>
        </div>
      </section>

      <section className="dashboard-insights">
        <article className="panel insight-card"><div className="panel-head"><div><p className="eyebrow">MEDIA MONITOR</p><h2>Peta Sentimen</h2></div><Link href="/media-monitor">Buka media</Link></div><div className="metric-list"><div><span>Positif</span><b>{overview.media_positif??0}</b></div><div><span>Netral</span><b>{overview.media_netral??0}</b></div><div><span>Negatif</span><b>{overview.media_negatif??0}</b></div><div><span>Total berita</span><b>{overview.total_media??0}</b></div></div></article>
        <article className="panel insight-card dashboard-quick-links"><div className="panel-head"><div><p className="eyebrow">KNOWLEDGE FLOW</p><h2>Dari data menjadi informasi</h2></div></div><div className="quick-link-grid"><Link href="/kunjungan"><strong>Kunjungan OPD</strong><span>Sumber lapangan & notulensi</span></Link><Link href="/renstra-opd"><strong>Renstra OPD</strong><span>Dokumen perencanaan & target OPD</span></Link><Link href="/temuan-opd"><strong>Temuan OPD</strong><span>Hal penting untuk dicatat</span></Link><Link href="/referensi-konten"><strong>Referensi Konten</strong><span>Informasi yang siap dipakai</span></Link><Link href="/berani"><strong>9 BERANI</strong><span>Data program per update</span></Link></div></article>
      </section>

      <section className="panel knowledge-dashboard-panel"><div className="panel-head"><div><p className="eyebrow">9 BERANI</p><h2>Update Program Terbaru</h2></div><Link href="/berani">Lihat semua</Link></div><div className="knowledge-dashboard-grid">
        {(recentBerani).map((u)=>{const p=programMap.get(u.program_id);return <Link href={p?`/berani/${p.slug}?update=${u.id}`:'/berani'} className="knowledge-dashboard-item" key={u.id}><span>{p?.name||'9 BERANI'}</span><strong>{u.title}</strong><small>{u.period_label||'Update terbaru'} · {u.row_count} data terolah</small></Link>})}
        {missingPrograms.length?<div className="knowledge-dashboard-item coverage-warning"><span>CAKUPAN DATA</span><strong>{missingPrograms.length} program menunggu sumber resmi</strong><small>Baseline ruang lingkup tersedia; angka tidak akan diisi tanpa sumber terverifikasi.</small></div>:null}
      </div></section>

      <section className="content-grid dashboard-bottom-grid">
        <article className="panel"><div className="panel-head"><div><p className="eyebrow">KUNJUNGAN TERBARU</p><h2>Riwayat OPD</h2></div><Link href="/kunjungan">Lihat semua</Link></div><div className="agenda-list">{(recentVisits).map((r)=><div className="agenda-row" key={r.id}><div><strong>{r.nama_opd}</strong><span>{r.topik}</span></div><div className="agenda-meta"><span>{dateLabel(r.tanggal)}{r.tanggal_estimasi?' · estimasi':''}</span><b>{r.status}</b></div></div>)}</div></article>
        <article className="panel"><div className="panel-head"><div><p className="eyebrow">REFERENSI KONTEN</p><h2>Pembaruan Informasi</h2></div><Link href="/referensi-konten">Buka referensi</Link></div><div className="agenda-list">{(recentReferences).map((r)=><div className="agenda-row" key={r.id}><div><strong>{r.title}</strong><span>{r.opd_name}</span></div><div className="agenda-meta"><b>{r.status}</b></div></div>)}</div></article>
      </section>
    </div>
  </>
}
