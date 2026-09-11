import { AppShell } from '@/components/app-shell'
import { createIsu } from '@/lib/actions/core'
import { requireUser } from '@/lib/auth'

export default async function IsuPage() {
  const { supabase, user } = await requireUser()
  const { data: rows, error } = await supabase.from('isu_strategis').select('*').order('created_at', { ascending: false })
  if (error) throw new Error(error.message)

  return <AppShell active="/isu-strategis" title="Isu Strategis" email={user.email}>
    <section className="module-grid">
      <form action={createIsu} className="panel form-card">
        <div className="section-heading"><p className="eyebrow">MONITORING</p><h2>Tambah Isu Strategis</h2></div>
        <label>Nama Isu<input name="nama" required /></label>
        <label>OPD Terkait<input name="opd" /></label>
        <label>Prioritas<select name="prioritas"><option>Tinggi</option><option>Sedang</option><option>Rendah</option></select></label>
        <label>Status<select name="status"><option>Monitoring</option><option>Perlu Tindak Lanjut</option><option>Selesai</option></select></label>
        <label>Ringkasan<textarea name="ringkasan" /></label>
        <button className="primary-button" type="submit">Simpan Isu</button>
      </form>

      <section className="panel table-panel">
        <div className="section-heading"><p className="eyebrow">DATABASE UTAMA</p><h2>Daftar Isu</h2></div>
        <div className="table-scroll"><table className="data-table"><thead><tr><th>ID</th><th>Isu</th><th>OPD</th><th>Prioritas</th><th>Status</th></tr></thead><tbody>
          {(rows ?? []).map((row) => <tr key={row.id}><td><b>{row.kode}</b><small>{new Date(row.created_at).toLocaleDateString('id-ID')}</small></td><td><b>{row.nama_isu}</b><small>{row.ringkasan || ''}</small></td><td>{row.opd_terkait || '-'}</td><td><span className="status-pill">{row.prioritas || '-'}</span></td><td>{row.status_monitoring}</td></tr>)}
          {(rows ?? []).length === 0 ? <tr><td colSpan={5} className="empty-cell">Belum ada isu strategis.</td></tr> : null}
        </tbody></table></div>
      </section>
    </section>
  </AppShell>
}
