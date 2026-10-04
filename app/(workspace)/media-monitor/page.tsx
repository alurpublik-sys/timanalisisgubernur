import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { getAuthContext } from '@/lib/auth'
import { FeatureNotes } from '@/components/feature-notes'
import { MediaAddDialog } from '@/components/media-add-dialog'
import { getOpdNames } from '@/lib/opd'
const PAGE_SIZE=20
const categories=['Pemerintahan','Ekonomi','Infrastruktur','Sosial','Pendidikan','Kesehatan','Pangan','Lingkungan','Politik','Lainnya']
function localDate(days=0){return new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Makassar',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(Date.now()-days*86400000))}
function normalized(v:string){return v.toLowerCase().replace(/[^a-z0-9]+/g,' ').trim()}
type Params={q?:string;sentimen?:string;category?:string;opd?:string;page?:string}

export default async function MediaPage({searchParams}:{searchParams:Promise<Params>}){
 const p=await searchParams,q=String(p.q||'').trim(),sentimen=String(p.sentimen||'').trim(),category=String(p.category||'').trim(),selectedOpd=String(p.opd||'').trim()
 const page=Math.max(1,Number(p.page)||1),from=(page-1)*PAGE_SIZE,to=from+PAGE_SIZE-1
 const [{user},supabase]=await Promise.all([getAuthContext(),createClient(null)]),adminMode=Boolean(user)
 let query=supabase.from('media_monitoring').select('*',{count:'exact'}).order('tanggal',{ascending:false}).order('id',{ascending:false})
 if(q)query=query.or(`judul_berita.ilike.%${q}%,nama_media.ilike.%${q}%,legacy_id.ilike.%${q}%,opd_name.ilike.%${q}%`)
 if(sentimen)query=query.eq('sentimen',sentimen);if(category)query=query.eq('issue_category',category);if(selectedOpd)query=query.eq('opd_name',selectedOpd)
 const [{data:rows,error,count},{data:intel,error:intelError},{data:programs},opdNames]=await Promise.all([
  query.range(from,to),
  supabase.from('media_monitoring').select('id,tanggal,sentimen,nama_media,judul_berita,link_berita,issue_category,opd_name,berani_program_id').gte('tanggal',localDate(30)).order('tanggal',{ascending:false}).order('id',{ascending:false}).limit(500),
  supabase.from('berani_programs').select('id,name').eq('active',true).order('sort_order'),
  getOpdNames(),
 ])
 if(error)throw new Error(error.message);if(intelError)throw new Error(intelError.message)
 const programNames=new Map((programs??[]).map((x)=>[x.id,x.name]))
 const recent=intel??[],seven=recent.filter((x)=>x.tanggal>=localDate(7)),negative=recent.filter((x)=>x.sentimen==='Negatif')
 const mediaCounts=new Map<string,number>(),catCounts=new Map<string,number>(),dup=new Map<string,number>()
 for(const r of recent){const m=r.nama_media?.trim()||'Media tidak dicantumkan';mediaCounts.set(m,(mediaCounts.get(m)??0)+1);catCounts.set(r.issue_category,(catCounts.get(r.issue_category)??0)+1);const k=r.link_berita?.trim().toLowerCase()||`${normalized(r.judul_berita)}|${r.tanggal}`;dup.set(k,(dup.get(k)??0)+1)}
 const topMedia=[...mediaCounts.entries()].sort((a,b)=>b[1]-a[1]).slice(0,4),topCats=[...catCounts.entries()].sort((a,b)=>b[1]-a[1]).slice(0,4),duplicateGroups=[...dup.values()].filter((n)=>n>1).length
 const total=count??0,totalPages=Math.max(1,Math.ceil(total/PAGE_SIZE)),safePage=Math.min(page,totalPages)
 const hrefFor=(n:number)=>{const s=new URLSearchParams();if(q)s.set('q',q);if(selectedOpd)s.set('opd',selectedOpd);if(sentimen)s.set('sentimen',sentimen);if(category)s.set('category',category);s.set('page',String(n));return `/media-monitor?${s}`}
 return <>
  <section className="media-intelligence-shell">
   <div className="media-intelligence-heading"><div><p className="eyebrow">MEDIA INTELLIGENCE</p><h2>Sinyal 30 hari terakhir</h2></div><span>Tren, isu, duplikasi, dan sumber yang perlu diperhatikan</span></div>
   <div className="media-intelligence-grid"><article className="intelligence-stat-card"><span>7 hari</span><strong>{seven.length}</strong><small>publikasi termonitor</small></article><article className={`intelligence-stat-card ${negative.length?'is-alert':'is-safe'}`}><span>Negatif 30 hari</span><strong>{negative.length}</strong><small>{negative.length?'perlu konteks/tindak lanjut':'tidak ada sinyal negatif'}</small></article><article className={`intelligence-stat-card ${duplicateGroups?'is-warn':'is-safe'}`}><span>Duplikasi</span><strong>{duplicateGroups}</strong><small>kelompok berita serupa</small></article><article className="intelligence-stat-card"><span>Top media</span><strong>{topMedia[0]?.[0]||'-'}</strong><small>{topMedia[0]?`${topMedia[0][1]} publikasi`:'belum ada data'}</small></article></div>
   <div className="media-signal-grid"><article className="panel"><div className="panel-head"><div><p className="eyebrow">NEGATIF TERBARU</p><h2>Perlu dilihat</h2></div><Link href="/media-monitor?sentimen=Negatif">Semua negatif</Link></div><div className="media-signal-list">{negative.slice(0,5).map((r)=><a className="media-signal-row" key={r.id} href={r.link_berita||'/media-monitor?sentimen=Negatif'} target={r.link_berita?'_blank':undefined} rel={r.link_berita?'noreferrer':undefined}><span className="signal-dot signal-negative"/><div><strong>{r.judul_berita}</strong><small>{r.nama_media||'Media'} · {r.tanggal} · {r.issue_category}</small></div><b>↗</b></a>)}{!negative.length?<p className="muted-line">Belum ada berita negatif pada 30 hari terakhir.</p>:null}</div></article><article className="panel"><div className="panel-head"><div><p className="eyebrow">PETA ISU</p><h2>Kategori dominan</h2></div></div><div className="media-category-bars">{topCats.map(([name,value])=><div key={name}><span>{name}</span><div><i style={{width:`${Math.max(8,Math.round(value/Math.max(1,recent.length)*100))}%`}}/></div><b>{value}</b></div>)}</div></article></div>
  </section>
  <section className="media-monitor-shell"><section className="panel table-panel premium-table-panel media-monitor-panel">
   <div className="section-heading table-heading-with-filter media-monitor-heading"><div className="media-monitor-title-row"><div><p className="eyebrow">MONITORING</p><h2>Media Terkini</h2><p className="muted-line">{total} berita ditemukan</p></div><div className="media-monitor-quick-actions">{adminMode?<MediaAddDialog today={localDate()} programs={programs??[]} opdNames={opdNames}/>:<Link className="media-add-icon is-locked" href={`/login?next=${encodeURIComponent('/media-monitor')}`}><span aria-hidden>⌁</span></Link>}</div></div>
   <form method="get" className="filter-form compact-filter media-intelligence-filter"><label>Cari<input name="q" defaultValue={q} placeholder="Judul, media, OPD, atau ID"/></label><label>OPD<select name="opd" defaultValue={selectedOpd}><option value="">Semua OPD</option>{opdNames.map((name)=><option key={name}>{name}</option>)}</select></label><label>Sentimen<select name="sentimen" defaultValue={sentimen}><option value="">Semua</option><option>Positif</option><option>Netral</option><option>Negatif</option></select></label><label>Kategori<select name="category" defaultValue={category}><option value="">Semua kategori</option>{categories.map((x)=><option key={x}>{x}</option>)}</select></label><button className="secondary-button" type="submit">Terapkan</button>{(q||selectedOpd||sentimen||category)?<Link className="secondary-button" href="/media-monitor">Reset</Link>:null}</form></div>
   <div className="table-scroll premium-table-scroll media-premium-scroll"><table className="data-table premium-table"><thead><tr><th>Tanggal / ID</th><th>Berita</th><th>Media</th><th>Isu / OPD</th><th>Sentimen</th><th>Link</th></tr></thead><tbody>{(rows??[]).map((r)=><tr key={r.id}><td><b>{r.tanggal}</b><small>{r.legacy_id||r.kode}</small></td><td><b>{r.judul_berita}</b>{r.berani_program_id?<small>{programNames.get(r.berani_program_id)||'9 BERANI'}</small>:null}</td><td>{r.nama_media||'-'}</td><td><b>{r.issue_category}</b><small>{r.opd_name||'Belum ditautkan ke OPD'}</small></td><td><span className="status-pill">{r.sentimen}</span></td><td>{r.link_berita?<a className="table-link" href={r.link_berita} target="_blank" rel="noreferrer">Buka</a>:'-'}</td></tr>)}{!(rows??[]).length?<tr><td colSpan={6} className="empty-cell">Tidak ada data media yang cocok.</td></tr>:null}</tbody></table></div>
   <div className="media-mobile-list">{(rows??[]).map((r)=><article className="media-mobile-card" key={r.id}><div className="media-mobile-card-head"><div><span>{r.legacy_id||r.kode}</span><h3>{r.judul_berita}</h3></div><span className={`media-sentiment sentiment-${r.sentimen.toLowerCase()}`}>{r.sentimen}</span></div><div className="media-mobile-meta"><span>{r.tanggal}</span><span>{r.nama_media||'Media belum dicantumkan'}</span></div><div className="media-mobile-tags"><span>{r.issue_category}</span>{r.opd_name?<span>{r.opd_name}</span>:null}</div>{r.link_berita?<a className="media-mobile-link" href={r.link_berita} target="_blank" rel="noreferrer">Buka berita <span>↗</span></a>:<span className="media-mobile-no-link">Link belum tersedia</span>}</article>)}</div>
   <div className="pagination-bar"><span>Halaman {safePage} dari {totalPages}</span><div className="pagination-actions">{safePage>1?<Link className="secondary-button" href={hrefFor(safePage-1)}>Sebelumnya</Link>:null}{safePage<totalPages?<Link className="secondary-button" href={hrefFor(safePage+1)}>Berikutnya</Link>:null}</div></div>
  </section></section>
  <FeatureNotes featureKey="media-monitor" returnPath="/media-monitor" adminMode={adminMode} title="Catatan Media Monitor" description="Catatan monitoring, follow-up isu media, atau pengingat tim."/>
 </>
}
