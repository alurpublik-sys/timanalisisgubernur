import Link from 'next/link'
import { AppShell } from '@/components/app-shell'
import { createPolicy } from '@/lib/actions/core'
import { createClient } from '@/lib/supabase/server'

type Params = { q?: string; status?: string }

export default async function PolicyPage({ searchParams }: { searchParams: Promise<Params> }) {
  const params = await searchParams
  const q = String(params.q || '').trim()
  const status = String(params.status || '').trim()
  const supabase = await createClient(null)

  let query = supabase.from('rekomendasi').select('*').order('created_at', { ascending: false })
  if (q) query = query.or(`judul.ilike.%${q}%,opd_terkait.ilike.%${q}%,pic.ilike.%${q}%,ringkasan.ilike.%${q}%,legacy_id.ilike.%${q}%`)
  if (status) query = query.eq('status', status)
  const { data: rows, error } = await query
  if (error) throw new Error(error.message)

  return <AppShell active="/policy-brief" title="Policy Brief">
    <section className="module-grid">
      <form action={createPolicy} className="panel form-card">
        <div className="section-heading"><p className="eyebrow">REKOMENDASI</p><h2>Tambah Policy Brief</h2></div>
        <label>Judul<input name="judul" required /></label>
        <label>OPD Terkait<input name="opd" /></label>
        <label>PIC<input name="pic" /></label>
        <label>Status<select name="status"><option>Draft</option><option>Review</option><option>Final</option></select></label>
        <label>Ringkasan<textarea name="ringkasan" /></label>
        <label>Link Dokumen<input name="link" type="url" /></label>
        <button className="primary-button" type="submit">Simpan Policy Brief</button>
      </form>

      <section className="panel table-panel">
        <div className="section-heading table-heading-with-filter">
          <div><p className="eyebrow">DATABASE UTAMA</p><h2>Daftar Policy Brief</h2><p className="muted-line">{(rows ?? []).length} dokumen ditampilkan</p></div>
          <form method="get" className="filter-form compact-filter">
            <label>Cari<input name="q" defaultValue={q} placeholder="Judul, OPD, PIC, atau ID lama" /></label>
            <label>Status<select name="status" defaultValue={status}><option value="">Semua</option><option>Draft</option><option>Review</option><option>Final</option></select></label>
            <button className="secondary-button" type="submit">Terapkan</button>
            {(q || status) ? <Link className="secondary-button" href="/policy-brief">Reset</Link> : null}
          </form>
        </div>
        <div className="table-scroll"><table className="data-table"><thead><tr><th>ID</th><th>Judul</th><th>OPD / PIC</th><th>Status</th><th>Dokumen</th></tr></thead><tbody>
          {(rows ?? []).map((row) => <tr key={row.id}><td><b>{row.legacy_id || row.kode}</b><small>{new Date(row.created_at).toLocaleDateString('id-ID')}</small></td><td><b>{row.judul}</b><small>{row.ringkasan ? `${row.ringkasan.slice(0, 220)}${row.ringkasan.length > 220 ? '…' : ''}` : ''}</small></td><td>{row.opd_terkait || '-'}<small>{row.pic || '-'}</small></td><td><span className="status-pill">{row.status}</span></td><td>{row.link_doc ? <a className="table-link" href={row.link_doc} target="_blank" rel="noreferrer">Buka</a> : '-'}</td></tr>)}
          {(rows ?? []).length === 0 ? <tr><td colSpan={5} className="empty-cell">Belum ada policy brief yang cocok.</td></tr> : null}
        </tbody></table></div>
      </section>
    </section>
  </AppShell>
}
