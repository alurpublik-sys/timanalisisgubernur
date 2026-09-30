import Link from 'next/link'
import { AppShell } from '@/components/app-shell'
import { getAuthContext } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'

type Params = { q?: string; format?: string; period?: string }

function formatLabel(kind: string) {
  if (kind === 'pdf') return 'PDF'
  if (kind === 'word') return 'WORD'
  if (kind === 'folder') return 'MULTI-DOKUMEN'
  return kind.toUpperCase()
}

export default async function RenstraOpdPage({ searchParams }: { searchParams: Promise<Params> }) {
  const params = await searchParams
  const q = String(params.q || '').trim().toLowerCase()
  const format = String(params.format || '').trim()
  const period = String(params.period || '').trim()
  const [{ user }, supabase] = await Promise.all([getAuthContext(), createClient(null)])

  const { data, error } = await supabase
    .from('renstra_opd')
    .select('*')
    .eq('active', true)
    .order('sort_order')
    .order('opd_name')

  if (error) throw new Error(error.message)

  const all = data ?? []
  const periods = [...new Set(all.map((item) => item.period_label).filter((value): value is string => Boolean(value)))].sort()
  const filtered = all.filter((item) => {
    const haystack = [item.opd_name, item.short_name, item.source_title, ...item.aliases].join(' ').toLowerCase()
    if (q && !haystack.includes(q)) return false
    if (format && item.source_kind !== format) return false
    if (period && item.period_label !== period) return false
    return true
  })

  const totalDocuments = all.reduce((sum, item) => sum + item.document_count, 0)
  const pdfCount = all.filter((item) => item.source_kind === 'pdf').length
  const wordCount = all.filter((item) => item.source_kind === 'word' || item.source_kind === 'folder').length

  return (
    <AppShell active="/renstra-opd" title="Renstra OPD" adminMode={Boolean(user)}>
      <section className="renstra-hero panel">
        <div>
          <p className="eyebrow">PUSTAKA PERENCANAAN OPD</p>
          <h2>Dokumen Renstra dalam satu ruang kerja.</h2>
          <p>Telusuri Renstra setiap OPD, buka sumber asli, dan hubungkan dokumen perencanaan dengan kunjungan serta referensi kerja Tim Analisis.</p>
        </div>
        <div className="renstra-hero-stats">
          <div><strong>{all.length}</strong><span>OPD</span></div>
          <div><strong>{totalDocuments}</strong><span>Dokumen</span></div>
          <div><strong>{pdfCount}</strong><span>PDF utama</span></div>
          <div><strong>{wordCount}</strong><span>Word / multi-bab</span></div>
        </div>
      </section>

      <section className="panel renstra-filter-panel">
        <form method="get" className="renstra-filter-form">
          <label className="renstra-search-field">
            <span>Cari OPD / dokumen</span>
            <input name="q" defaultValue={params.q || ''} placeholder="Contoh: BAPPEDA, kesehatan, pendidikan..." />
          </label>
          <label>
            <span>Format</span>
            <select name="format" defaultValue={format}>
              <option value="">Semua format</option>
              <option value="pdf">PDF</option>
              <option value="word">Word</option>
              <option value="folder">Multi-dokumen</option>
            </select>
          </label>
          <label>
            <span>Periode</span>
            <select name="period" defaultValue={period}>
              <option value="">Semua periode</option>
              {periods.map((value) => <option value={value} key={value}>{value}</option>)}
            </select>
          </label>
          <button className="secondary-button" type="submit">Terapkan</button>
          {(q || format || period) ? <Link href="/renstra-opd" className="ghost-button dark">Reset</Link> : null}
        </form>
      </section>

      <section className="renstra-result-head">
        <div><strong>{filtered.length}</strong><span> OPD ditampilkan</span></div>
        <small>ZIP arsip tidak dimasukkan ke katalog.</small>
      </section>

      <section className="renstra-grid">
        {filtered.map((item) => (
          <article className="panel renstra-card" key={item.id}>
            <div className="renstra-card-head">
              <span className="renstra-short">{item.short_name}</span>
              <span className={`renstra-format format-${item.source_kind}`}>{formatLabel(item.source_kind)}</span>
            </div>
            <div className="renstra-card-body">
              <h2>{item.opd_name}</h2>
              <p>{item.source_title}</p>
            </div>
            <div className="renstra-card-meta">
              <span>{item.period_label || 'Periode belum diverifikasi'}</span>
              <span>{item.document_count} dokumen</span>
            </div>
            <div className="renstra-card-actions">
              <Link href={`/renstra-opd/${item.slug}`} className="primary-button">Buka Renstra</Link>
              <a href={item.source_url} target="_blank" rel="noreferrer" className="ghost-button dark">Sumber ↗</a>
            </div>
          </article>
        ))}

        {filtered.length === 0 ? (
          <section className="panel renstra-empty">
            <p className="eyebrow">TIDAK DITEMUKAN</p>
            <h2>Tidak ada Renstra yang cocok dengan filter.</h2>
            <Link href="/renstra-opd" className="secondary-button">Lihat semua</Link>
          </section>
        ) : null}
      </section>
    </AppShell>
  )
}
