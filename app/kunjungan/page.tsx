import Link from 'next/link'
import { AppShell } from '@/components/app-shell'
import { createKunjungan } from '@/lib/actions/core'
import { SUPABASE_URL } from '@/lib/branding'
import { createClient } from '@/lib/supabase/server'

type Params = { q?: string; status?: string }

function notulenPdfUrl(path?: string | null) {
  if (!path) return null
  return `${SUPABASE_URL}/storage/v1/object/public/kunjungan-notulensi/${encodeURI(path)}`
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

  return <AppShell active="/kunjungan" title="Kunjungan OPD">
    <div className="notice notice-info">Notulensi dapat disimpan sebagai tautan Google Docs, file PDF langsung, atau keduanya sekaligus. Upload PDF dibatasi maksimal 10 MB.</div>
    <section className="module-grid">
      <form action={createKunjungan} className="panel form-card">
        <div className="section-heading"><p className="eyebrow">DATA BARU</p><h2>Catat Kunjungan OPD</h2></div>
        <label>Nama OPD<input name="opd" required /></label>
        <label>Tanggal<input name="tanggal" type="date" required /></label>
        <label>Pejabat<input name="pejabat" /></label>
        <label>Anggota Tim<input name="anggota" placeholder="Nama anggota/peserta" /></label>
        <label>Topik Pembahasan<textarea name="topik" required /></label>
        <label>Status<select name="status"><option>Terjadwal</option><option>Selesai</option><option>Ditunda</option></select></label>
        <label>Google Docs Notulensi<input name="link_notulen" type="url" placeholder="https://docs.google.com/document/..." /><small className="muted-line">Opsional. Tetap dapat dipakai bila notulensi dikerjakan di Google Docs.</small></label>
        <label>Upload Notulensi PDF<input name="notulen_pdf" type="file" accept="application/pdf,.pdf" /><small className="muted-line">Opsional. Hanya PDF, maksimum 10 MB.</small></label>
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
        <div className="table-scroll"><table className="data-table"><thead><tr><th>Tgl / ID</th><th>OPD & Pejabat</th><th>Topik</th><th>Status</th><th>Notulensi</th></tr></thead><tbody>
          {(rows ?? []).map((row) => {
            const pdfUrl = notulenPdfUrl(row.notulen_pdf_path)
            return <tr key={row.id}><td><b>{row.tanggal}</b><small>{row.legacy_id || row.kode}</small></td><td><b>{row.nama_opd}</b><small>{row.pejabat || '-'}</small></td><td>{row.topik}</td><td><span className="status-pill">{row.status}</span></td><td>
              {row.link_notulen ? <a className="table-link" href={row.link_notulen} target="_blank" rel="noreferrer">Google Docs</a> : null}
              {row.link_notulen && pdfUrl ? <span> · </span> : null}
              {pdfUrl ? <a className="table-link" href={pdfUrl} target="_blank" rel="noreferrer">PDF{row.notulen_pdf_name ? ` (${row.notulen_pdf_name})` : ''}</a> : null}
              {!row.link_notulen && !pdfUrl ? '-' : null}
            </td></tr>
          })}
          {(rows ?? []).length === 0 ? <tr><td colSpan={5} className="empty-cell">Tidak ada data kunjungan yang cocok.</td></tr> : null}
        </tbody></table></div>
      </section>
    </section>
  </AppShell>
}
