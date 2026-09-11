import Link from 'next/link'
import { AppShell } from '@/components/app-shell'
import { createIsu } from '@/lib/actions/core'
import { requireUser } from '@/lib/auth'

type Params = { q?: string; prioritas?: string; status?: string }

export default async function IsuPage({ searchParams }: { searchParams: Promise<Params> }) {
  const params = await searchParams
  const q = String(params.q || '').trim()
  const prioritas = String(params.prioritas || '').trim()
  const status = String(params.status || '').trim()
  const { supabase, user, profile } = await requireUser()
  const canEdit = profile.role === 'admin' || profile.role === 'editor'

  let query = supabase.from('isu_strategis').select('*').order('created_at', { ascending: false })
  if (q) query = query.or(`nama_isu.ilike.%${q}%,opd_terkait.ilike.%${q}%,ringkasan.ilike.%${q}%,legacy_id.ilike.%${q}%`)
  if (prioritas) query = query.eq('prioritas', prioritas)
  if (status) query = query.eq('status_monitoring', status)
  const { data: rows, error } = await query
  if (error) throw new Error(error.message)

  return <AppShell active="/isu-strategis" title="Isu Strategis" email={user.email}>
    {!canEdit ? <div className="notice notice-info">Mode viewer aktif. Data isu dapat dibaca dan difilter, tetapi penambahan isu hanya tersedia untuk editor dan admin.</div> : null}
    <section className={`module-grid${canEdit ? '' : ' single-module'}`}>
      {canEdit ? <form action={createIsu} className="panel form-card">
        <div className="section-heading"><p className="eyebrow">MONITORING</p><h2>Tambah Isu Strategis</h2></div>
        <label>Nama Isu<input name="nama" required /></label>
        <label>OPD Terkait<input name="opd" /></label>
        <label>Prioritas<select name="prioritas"><option>Tinggi</option><option>Sedang</option><option>Rendah</option></select></label>
        <label>Status<select name="status"><option>Aktif</option><option>Monitoring</option><option>Perlu Tindak Lanjut</option><option>Selesai</option></select></label>
        <label>Ringkasan<textarea name="ringkasan" /></label>
        <button className="primary-button" type="submit">Simpan Isu</button>
      </form> : null}

      <section className="panel table-panel">
        <div className="section-heading table-heading-with-filter">
          <div><p className="eyebrow">DATABASE UTAMA</p><h2>Daftar Isu</h2><p className="muted-line">{(rows ?? []).length} isu ditampilkan</p></div>
          <form method="get" className="filter-form compact-filter">
            <label>Cari<input name="q" defaultValue={q} placeholder="Isu, OPD, ringkasan, atau ID lama" /></label>
            <label>Prioritas<select name="prioritas" defaultValue={prioritas}><option value="">Semua</option><option>Tinggi</option><option>Sedang</option><option>Rendah</option></select></label>
            <label>Status<select name="status" defaultValue={status}><option value="">Semua</option><option>Aktif</option><option>Monitoring</option><option>Perlu Tindak Lanjut</option><option>Selesai</option></select></label>
            <button className="secondary-button" type="submit">Terapkan</button>
            {(q || prioritas || status) ? <Link className="secondary-button" href="/isu-strategis">Reset</Link> : null}
          </form>
        </div>
        <div className="table-scroll"><table className="data-table"><thead><tr><th>ID</th><th>Isu</th><th>OPD</th><th>Prioritas</th><th>Status</th></tr></thead><tbody>
          {(rows ?? []).map((row) => <tr key={row.id}><td><b>{row.legacy_id || row.kode}</b><small>{new Date(row.created_at).toLocaleDateString('id-ID')}</small></td><td><b>{row.nama_isu}</b><small>{row.ringkasan ? `${row.ringkasan.slice(0, 240)}${row.ringkasan.length > 240 ? '…' : ''}` : ''}</small></td><td>{row.opd_terkait || '-'}</td><td><span className="status-pill">{row.prioritas || '-'}</span></td><td>{row.status_monitoring}</td></tr>)}
          {(rows ?? []).length === 0 ? <tr><td colSpan={5} className="empty-cell">Tidak ada isu strategis yang cocok.</td></tr> : null}
        </tbody></table></div>
      </section>
    </section>
  </AppShell>
}
