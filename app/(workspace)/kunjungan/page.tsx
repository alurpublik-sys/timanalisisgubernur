import Link from 'next/link'
import { getAuthContext } from '@/lib/auth'
import { SUPABASE_URL } from '@/lib/branding'
import { createClient } from '@/lib/supabase/server'
import { getLegacyNotulensiOriginal } from '@/lib/legacy-notulensi-originals'
import { FeatureNotes } from '@/components/feature-notes'

type Params = { q?: string; status?: string }

function notulenUrl(path?: string | null) {
  if (!path) return null
  if (/^https?:\/\//i.test(path)) return path
  if (path.startsWith('/')) return path
  return `${SUPABASE_URL}/storage/v1/object/public/kunjungan-notulensi/${encodeURI(path)}`
}

function displayDate(value: string) {
  return new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium', timeZone: 'Asia/Makassar' }).format(new Date(`${value}T00:00:00+08:00`))
}

function visitCode(row: { id: number; kode: string | null; legacy_id: string | null }) {
  return row.legacy_id || row.kode || `OPD-${String(row.id).padStart(3, '0')}`
}

export default async function KunjunganPage({ searchParams }: { searchParams: Promise<Params> }) {
  const params = await searchParams
  const q = String(params.q || '').trim()
  const status = String(params.status || '').trim()
  const [{ user }, supabase] = await Promise.all([getAuthContext(), createClient(null)])

  let query = supabase.from('kunjungan').select('*').order('tanggal', { ascending: false }).order('id', { ascending: false })
  if (q) query = query.or(`nama_opd.ilike.%${q}%,pejabat.ilike.%${q}%,topik.ilike.%${q}%,legacy_id.ilike.%${q}%`)
  if (status) query = query.eq('status', status)

  const [
    { data: rows, error },
    { data: documents, error: documentError },
  ] = await Promise.all([
    query,
    supabase
      .from('kunjungan_documents')
      .select('id,kunjungan_id,title,file_path,file_name,created_at')
      .order('created_at', { ascending: false }),
  ])
  if (error) throw new Error(error.message)
  if (documentError) throw new Error(documentError.message)

  const documentsByVisit = new Map<number, NonNullable<typeof documents>>()
  for (const document of documents ?? []) {
    const items = documentsByVisit.get(document.kunjungan_id) ?? []
    items.push(document)
    documentsByVisit.set(document.kunjungan_id, items)
  }

  return <>
    <section className="premium-page-intro">
      <div>
        <p className="eyebrow">RIWAYAT LAPANGAN</p>
        <h2>Notulensi OPD dalam satu tampilan yang ringkas.</h2>
        <p>Setiap kunjungan dapat dibuka untuk membaca ringkasan serta mengakses Google Docs atau PDF yang tersedia. Penambahan kunjungan dipindahkan ke Pengaturan agar halaman ini fokus untuk membaca data.</p>
      </div>
      <div className="premium-count"><strong>{rows?.length ?? 0}</strong><span>kunjungan tampil</span></div>
    </section>

    <section className="panel premium-filter-panel">
      <form method="get" className="premium-filter-form">
        <label><span>Cari</span><input name="q" defaultValue={q} placeholder="OPD, pejabat, topik, atau ID" /></label>
        <label><span>Status</span><select name="status" defaultValue={status}><option value="">Semua status</option><option>Terjadwal</option><option>Selesai</option><option>Ditunda</option></select></label>
        <button className="secondary-button" type="submit">Terapkan</button>
        {(q || status) ? <Link className="ghost-button dark" href="/kunjungan">Reset</Link> : null}
      </form>
    </section>

    <section className="panel premium-table-panel">
      <div className="premium-table-heading">
        <div><p className="eyebrow">DATABASE KUNJUNGAN</p><h2>Daftar Kunjungan OPD</h2></div>
        <span>Desktop & landscape</span>
      </div>

      <div className="premium-table-scroll visit-premium-scroll">
        <table className="data-table premium-table visit-premium-table">
          <thead><tr><th>Waktu</th><th>OPD / Pejabat</th><th>Topik Pembahasan</th><th>Status</th><th>Notulensi</th><th /></tr></thead>
          <tbody>
            {(rows ?? []).map((row) => {
              const pdf = notulenUrl(row.notulen_pdf_path)
              const legacyOriginal = getLegacyNotulensiOriginal(row.id)
              const hasPrimaryPdf = Boolean(pdf || legacyOriginal)
              const visitDocs = documentsByVisit.get(row.id) ?? []
              return <tr key={row.id}>
                <td className="visit-date-cell">
                  <b>{displayDate(row.tanggal)}</b>
                  <small>{visitCode(row)}</small>
                  {row.tanggal_estimasi ? <span className="estimated-date-badge">Estimasi</span> : null}
                  {row.tanggal_sumber ? <em>{row.tanggal_sumber}</em> : null}
                </td>
                <td className="visit-opd-cell"><strong>{row.nama_opd}</strong><span>{row.pejabat || 'Pejabat belum dicantumkan'}</span></td>
                <td className="visit-topic-cell">{row.topik}</td>
                <td><span className="status-pill">{row.status}</span></td>
                <td>
                  <div className="note-chip-row">
                    {row.link_notulen ? <a className="note-chip note-gdocs" href={row.link_notulen} target="_blank" rel="noreferrer"><span>G</span> Google Docs</a> : null}
                    {hasPrimaryPdf ? <a className="note-chip note-pdf" href={`/kunjungan/${row.id}/notulensi?v=20260928-original`} target="_blank" rel="noreferrer"><span>PDF</span> {row.notulen_pdf_name || legacyOriginal?.fileName || 'Notulensi'}</a> : null}
                    {visitDocs.map((document) => <a className="note-chip note-pdf" key={document.id} href={notulenUrl(document.file_path) || '#'} target="_blank" rel="noreferrer"><span>PDF</span> {document.title || document.file_name}</a>)}
                    
                    {!row.link_notulen && !hasPrimaryPdf && !visitDocs.length ? <span className="muted-line">Belum ada lampiran</span> : null}
                  </div>
                </td>
                <td><Link className="row-open-button" href={`/kunjungan/${row.id}`} aria-label={`Buka kunjungan ${row.nama_opd}`}>→</Link></td>
              </tr>
            })}
            {(rows ?? []).length === 0 ? <tr><td colSpan={6} className="empty-cell">Tidak ada data kunjungan yang cocok.</td></tr> : null}
          </tbody>
        </table>
      </div>

      <div className="visit-mobile-list">
        {(rows ?? []).map((row) => {
          const pdf = notulenUrl(row.notulen_pdf_path)
          const legacyOriginal = getLegacyNotulensiOriginal(row.id)
          const hasPrimaryPdf = Boolean(pdf || legacyOriginal)
          const visitDocs = documentsByVisit.get(row.id) ?? []
          return <article className="visit-mobile-card" key={row.id}>
            <div className="visit-mobile-head">
              <div><span>{visitCode(row)}</span><h3>{row.nama_opd}</h3></div>
              <span className="status-pill">{row.status}</span>
            </div>
            <p className="visit-mobile-date">{displayDate(row.tanggal)}{row.tanggal_estimasi ? ' · estimasi' : ''}</p>
            <p className="visit-mobile-topic">{row.topik}</p>
            <div className="note-chip-row">
              {row.link_notulen ? <a className="note-chip note-gdocs" href={row.link_notulen} target="_blank" rel="noreferrer"><span>G</span> Google Docs</a> : null}
              {hasPrimaryPdf ? <a className="note-chip note-pdf" href={`/kunjungan/${row.id}/notulensi?v=20260928-original`} target="_blank" rel="noreferrer"><span>PDF</span> Notulensi</a> : null}
              {visitDocs.map((document) => <a className="note-chip note-pdf" key={document.id} href={notulenUrl(document.file_path) || '#'} target="_blank" rel="noreferrer"><span>PDF</span> {document.title || 'Lampiran'}</a>)}
              
            </div>
            <Link className="visit-detail-link" href={`/kunjungan/${row.id}`}>Buka detail & ringkasan <span>→</span></Link>
          </article>
        })}
      </div>
    </section>
    <FeatureNotes featureKey="kunjungan" returnPath="/kunjungan" adminMode={Boolean(user)} title="Catatan Kunjungan OPD" description="Catatan umum, tindak lanjut, dan pengingat untuk modul Kunjungan OPD." />
  </>
}
