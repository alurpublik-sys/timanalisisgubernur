import Link from 'next/link'
import { AppShell } from '@/components/app-shell'
import { createKunjungan } from '@/lib/actions/core'
import { addKunjunganDocument, deleteKunjunganDocument } from '@/lib/actions/knowledge'
import { SUPABASE_URL } from '@/lib/branding'
import { createClient } from '@/lib/supabase/server'

type Params = { q?: string; status?: string }

function notulenPdfUrl(path?: string | null) {
  if (!path) return null
  return `${SUPABASE_URL}/storage/v1/object/public/kunjungan-notulensi/${encodeURI(path)}`
}

function displayDate(value: string) {
  return new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium', timeZone: 'Asia/Makassar' }).format(new Date(`${value}T00:00:00+08:00`))
}

export default async function KunjunganPage({ searchParams }: { searchParams: Promise<Params> }) {
  const params = await searchParams
  const q = String(params.q || '').trim()
  const status = String(params.status || '').trim()
  const supabase = await createClient(null)

  let query = supabase.from('kunjungan').select('*').order('tanggal', { ascending: false }).order('id', { ascending: false })
  if (q) query = query.or(`nama_opd.ilike.%${q}%,pejabat.ilike.%${q}%,topik.ilike.%${q}%,legacy_id.ilike.%${q}%`)
  if (status) query = query.eq('status', status)
  const { data: rows, error } = await query
  if (error) throw new Error(error.message)

  const { data: documents, error: documentError } = await supabase.from('kunjungan_documents').select('*').order('created_at', { ascending: false })
  if (documentError) throw new Error(documentError.message)

  const documentsByVisit = new Map<number, NonNullable<typeof documents>>()
  for (const document of documents ?? []) {
    const items = documentsByVisit.get(document.kunjungan_id) ?? []
    items.push(document)
    documentsByVisit.set(document.kunjungan_id, items)
  }

  return <AppShell active="/kunjungan" title="Kunjungan OPD">
    <div className="notice notice-info">Seluruh notulensi yang diberikan telah dimasukkan ke daftar kunjungan. Tanggal yang tidak tersedia atau diminta ditampilkan sebagai agenda September diberi label <b>estimasi</b>; bila dokumen mencantumkan tanggal berbeda, tanggal sumber tetap dicatat.</div>

    <section className="module-grid">
      <form action={createKunjungan} className="panel form-card">
        <div className="section-heading"><p className="eyebrow">DATA BARU</p><h2>Catat Kunjungan OPD</h2></div>
        <label>Nama OPD<input name="opd" required /></label>
        <label>Tanggal<input name="tanggal" type="date" required /></label>
        <label>Pejabat<input name="pejabat" /></label>
        <label>Anggota Tim<input name="anggota" placeholder="Nama anggota/peserta" /></label>
        <label>Topik Pembahasan<textarea name="topik" required /></label>
        <label>Status<select name="status"><option>Terjadwal</option><option>Selesai</option><option>Ditunda</option></select></label>
        <label>Google Docs Notulensi<input name="link_notulen" type="url" placeholder="https://docs.google.com/document/..." /></label>
        <label>Upload PDF Awal<input name="notulen_pdf" type="file" accept="application/pdf,.pdf" /><small className="muted-line">Opsional. PDF tambahan dapat ditambahkan lagi dari riwayat kunjungan.</small></label>
        <button className="primary-button" type="submit">Simpan Kunjungan</button>
      </form>

      <section className="panel table-panel">
        <div className="section-heading table-heading-with-filter">
          <div><p className="eyebrow">DATABASE UTAMA</p><h2>Riwayat Kunjungan</h2><p className="muted-line">{(rows ?? []).length} data ditampilkan</p></div>
          <form method="get" className="filter-form compact-filter">
            <label>Cari<input name="q" defaultValue={q} placeholder="OPD, pejabat, topik, atau ID lama" /></label>
            <label>Status<select name="status" defaultValue={status}><option value="">Semua</option><option>Terjadwal</option><option>Selesai</option><option>Ditunda</option></select></label>
            <button className="secondary-button" type="submit">Terapkan</button>
            {(q || status) ? <Link className="secondary-button" href="/kunjungan">Reset</Link> : null}
          </form>
        </div>

        <div className="table-scroll"><table className="data-table kunjungan-table"><thead><tr><th>Tgl / ID</th><th>OPD & Pejabat</th><th>Topik</th><th>Status</th><th>Notulensi</th></tr></thead><tbody>
          {(rows ?? []).map((row) => {
            const legacyPdfUrl = notulenPdfUrl(row.notulen_pdf_path)
            const visitDocuments = documentsByVisit.get(row.id) ?? []
            return <tr key={row.id}>
              <td className="visit-date-cell">
                <b>{displayDate(row.tanggal)}</b>
                <small>{row.legacy_id || row.kode || `OPD-${String(row.id).padStart(3, '0')}`}</small>
                {row.tanggal_estimasi ? <span className="estimated-date-badge">Estimasi September</span> : null}
                {row.tanggal_sumber ? <em>{row.tanggal_sumber}</em> : null}
              </td>
              <td><b>{row.nama_opd}</b><small>{row.pejabat || '-'}</small></td>
              <td>{row.topik}</td>
              <td><span className="status-pill">{row.status}</span></td>
              <td className="notulensi-cell">
                <div className="notulensi-links">
                  {row.link_notulen ? <a className="table-link" href={row.link_notulen} target="_blank" rel="noreferrer">Google Docs</a> : null}
                  {legacyPdfUrl ? <a className="table-link" href={legacyPdfUrl} target="_blank" rel="noreferrer">PDF awal{row.notulen_pdf_name ? ` · ${row.notulen_pdf_name}` : ''}</a> : null}
                  {!legacyPdfUrl && row.notulen_pdf_name ? <span className="source-file-label">Sumber: {row.notulen_pdf_name}</span> : null}
                  {visitDocuments.map((document) => <div className="document-line" key={document.id}>
                    <a className="table-link" href={notulenPdfUrl(document.file_path) || '#'} target="_blank" rel="noreferrer">{document.title} · {document.file_name}</a>
                    <form action={deleteKunjunganDocument}><input type="hidden" name="id" value={document.id} /><button type="submit" className="inline-delete">hapus</button></form>
                  </div>)}
                </div>

                {row.notulen_text ? <details className="notulensi-preview">
                  <summary>Baca ringkasan notulensi</summary>
                  <p>{row.notulen_text}</p>
                </details> : null}

                <details className="notulensi-manager">
                  <summary>+ Tambah PDF</summary>
                  <form action={addKunjunganDocument} className="notulensi-add-form">
                    <input type="hidden" name="kunjungan_id" value={row.id} />
                    <input name="title" placeholder="Judul, mis. Bahan paparan" />
                    <input name="notulensi_pdf" type="file" accept="application/pdf,.pdf" required />
                    <button className="secondary-button" type="submit">Upload</button>
                  </form>
                </details>
              </td>
            </tr>
          })}
          {(rows ?? []).length === 0 ? <tr><td colSpan={5} className="empty-cell">Tidak ada data kunjungan yang cocok.</td></tr> : null}
        </tbody></table></div>
      </section>
    </section>
  </AppShell>
}
