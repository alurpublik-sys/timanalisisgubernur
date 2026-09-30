import Link from 'next/link'
import { AppShell } from '@/components/app-shell'
import { createMedia } from '@/lib/actions/core'
import { createClient } from '@/lib/supabase/server'
import { getAuthContext } from '@/lib/auth'
import { FeatureNotes } from '@/components/feature-notes'
import { MediaAddDialog } from '@/components/media-add-dialog'

const PAGE_SIZE = 20

function todayMakassar() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Makassar',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date())
}
type Params = { q?: string; sentimen?: string; page?: string }

export default async function MediaPage({ searchParams }: { searchParams: Promise<Params> }) {
  const params = await searchParams
  const q = String(params.q || '').trim()
  const sentimen = String(params.sentimen || '').trim()
  const page = Math.max(1, Number(params.page) || 1)
  const from = (page - 1) * PAGE_SIZE
  const to = from + PAGE_SIZE - 1
  const [{ user }, supabase] = await Promise.all([getAuthContext(), createClient(null)])
  const adminMode = Boolean(user)

  let query = supabase.from('media_monitoring').select('*', { count: 'exact' }).order('tanggal', { ascending: false }).order('id', { ascending: false })
  if (q) query = query.or(`judul_berita.ilike.%${q}%,nama_media.ilike.%${q}%,legacy_id.ilike.%${q}%`)
  if (sentimen) query = query.eq('sentimen', sentimen)
  const { data: rows, error, count } = await query.range(from, to)
  if (error) throw new Error(error.message)

  const total = count ?? 0
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))
  const safePage = Math.min(page, totalPages)
  const hrefFor = (targetPage: number) => {
    const p = new URLSearchParams()
    if (q) p.set('q', q)
    if (sentimen) p.set('sentimen', sentimen)
    p.set('page', String(targetPage))
    return `/media-monitor?${p.toString()}`
  }

  return <AppShell active="/media-monitor" title="Media Monitor" adminMode={adminMode}>
    <section className="media-monitor-shell">
      <section className="panel table-panel premium-table-panel media-monitor-panel">
        <div className="section-heading table-heading-with-filter media-monitor-heading">
          <div className="media-monitor-title-row">
            <div><p className="eyebrow">MONITORING</p><h2>Media Terkini</h2><p className="muted-line">{total} berita ditemukan</p></div>
            <div className="media-monitor-quick-actions">
              {adminMode
                ? <MediaAddDialog today={todayMakassar()} />
                : <Link
                    className="media-add-icon is-locked"
                    href={`/login?next=${encodeURIComponent('/media-monitor')}`}
                    aria-label="Masuk dengan PIN untuk menambah berita"
                    title="Tambah berita dikunci PIN administrator"
                  ><span aria-hidden>⌁</span></Link>}
            </div>
          </div>

          <form method="get" className="filter-form compact-filter">
            <label>Cari<input name="q" defaultValue={q} placeholder="Judul, media, atau ID lama" /></label>
            <label>Sentimen<select name="sentimen" defaultValue={sentimen}><option value="">Semua</option><option>Positif</option><option>Netral</option><option>Negatif</option></select></label>
            <button className="secondary-button" type="submit">Terapkan</button>
            {(q || sentimen) ? <Link className="secondary-button" href="/media-monitor">Reset</Link> : null}
          </form>
        </div>

        <div className="table-scroll premium-table-scroll media-premium-scroll"><table className="data-table premium-table"><thead><tr><th>Tanggal / ID</th><th>Berita</th><th>Media</th><th>Sentimen</th><th>Link</th></tr></thead><tbody>
          {(rows ?? []).map((row) => <tr key={row.id}><td><b>{row.tanggal}</b><small>{row.legacy_id || row.kode}</small></td><td><b>{row.judul_berita}</b></td><td>{row.nama_media || '-'}</td><td><span className="status-pill">{row.sentimen || '-'}</span></td><td>{row.link_berita ? <a className="table-link" href={row.link_berita} target="_blank" rel="noreferrer">Buka</a> : '-'}</td></tr>)}
          {(rows ?? []).length === 0 ? <tr><td colSpan={5} className="empty-cell">Tidak ada data media yang cocok.</td></tr> : null}
        </tbody></table></div>

        <div className="media-mobile-list">
          {(rows ?? []).map((row) => <article className="media-mobile-card" key={row.id}>
            <div className="media-mobile-card-head">
              <div><span>{row.legacy_id || row.kode}</span><h3>{row.judul_berita}</h3></div>
              <span className={`media-sentiment sentiment-${String(row.sentimen || 'netral').toLowerCase()}`}>{row.sentimen || 'Netral'}</span>
            </div>
            <div className="media-mobile-meta">
              <span>{row.tanggal}</span>
              <span>{row.nama_media || 'Media belum dicantumkan'}</span>
            </div>
            {row.link_berita ? <a className="media-mobile-link" href={row.link_berita} target="_blank" rel="noreferrer">Buka berita <span>↗</span></a> : <span className="media-mobile-no-link">Link belum tersedia</span>}
          </article>)}
          {(rows ?? []).length === 0 ? <div className="empty-document-panel compact-empty"><p>Tidak ada data media yang cocok.</p></div> : null}
        </div>

        <div className="pagination-bar">
          <span>Halaman {safePage} dari {totalPages}</span>
          <div className="pagination-actions">
            {safePage > 1 ? <Link className="secondary-button" href={hrefFor(safePage - 1)}>Sebelumnya</Link> : null}
            {safePage < totalPages ? <Link className="secondary-button" href={hrefFor(safePage + 1)}>Berikutnya</Link> : null}
          </div>
        </div>
      </section>
    </section>
    <FeatureNotes featureKey="media-monitor" returnPath="/media-monitor" adminMode={adminMode} title="Catatan Media Monitor" description="Catatan monitoring, follow-up isu media, atau pengingat tim." />
  </AppShell>
}
