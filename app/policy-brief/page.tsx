import { AppShell } from '@/components/app-shell'
import { createPolicy } from '@/lib/actions/core'
import { requireUser } from '@/lib/auth'

export default async function PolicyPage() {
  const { supabase, user } = await requireUser()
  const { data: rows, error } = await supabase.from('rekomendasi').select('*').order('created_at', { ascending: false })
  if (error) throw new Error(error.message)

  return <AppShell active="/policy-brief" title="Policy Brief" email={user.email}>
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
        <div className="section-heading"><p className="eyebrow">DATABASE UTAMA</p><h2>Daftar Policy Brief</h2></div>
        <div className="table-scroll"><table className="data-table"><thead><tr><th>ID</th><th>Judul</th><th>OPD / PIC</th><th>Status</th><th>Dokumen</th></tr></thead><tbody>
          {(rows ?? []).map((row) => <tr key={row.id}><td><b>{row.kode}</b><small>{new Date(row.created_at).toLocaleDateString('id-ID')}</small></td><td><b>{row.judul}</b><small>{row.ringkasan || ''}</small></td><td>{row.opd_terkait || '-'}<small>{row.pic || '-'}</small></td><td><span className="status-pill">{row.status}</span></td><td>{row.link_doc ? <a className="table-link" href={row.link_doc} target="_blank" rel="noreferrer">Buka</a> : '-'}</td></tr>)}
          {(rows ?? []).length === 0 ? <tr><td colSpan={5} className="empty-cell">Belum ada policy brief.</td></tr> : null}
        </tbody></table></div>
      </section>
    </section>
  </AppShell>
}
