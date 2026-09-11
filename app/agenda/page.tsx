import { AppShell } from '@/components/app-shell'
import { createAgenda } from '@/lib/actions/core'
import { requireUser } from '@/lib/auth'

export default async function AgendaPage() {
  const { supabase, user } = await requireUser()
  const { data: rows, error } = await supabase.from('agenda').select('*').order('tanggal', { ascending: false })
  if (error) throw new Error(error.message)

  return <AppShell active="/agenda" title="Agenda & Tugas" email={user.email}>
    <section className="module-grid">
      <form action={createAgenda} className="panel form-card">
        <div className="section-heading"><p className="eyebrow">MONITORING</p><h2>Tambah Agenda / Tugas</h2></div>
        <label>Nama Agenda<input name="nama" required /></label>
        <label>Tanggal<input name="tanggal" type="date" required /></label>
        <label>Tipe<select name="tipe"><option>Rapat</option><option>Kunjungan</option><option>Tugas</option><option>Koordinasi</option></select></label>
        <label>Status<select name="status"><option>Terjadwal</option><option>Proses</option><option>Selesai</option><option>Ditunda</option></select></label>
        <label>PIC<input name="pic" /></label>
        <button className="primary-button" type="submit">Simpan Agenda</button>
      </form>

      <section className="panel table-panel">
        <div className="section-heading"><p className="eyebrow">AGENDA</p><h2>Daftar Agenda & Tugas</h2></div>
        <div className="table-scroll"><table className="data-table"><thead><tr><th>Tanggal / ID</th><th>Agenda</th><th>Tipe</th><th>PIC</th><th>Status</th></tr></thead><tbody>
          {(rows ?? []).map((row) => <tr key={row.id}><td><b>{row.tanggal}</b><small>{row.kode}</small></td><td><b>{row.nama_agenda}</b></td><td>{row.tipe || '-'}</td><td>{row.pic || '-'}</td><td><span className="status-pill">{row.status}</span></td></tr>)}
          {(rows ?? []).length === 0 ? <tr><td colSpan={5} className="empty-cell">Belum ada agenda.</td></tr> : null}
        </tbody></table></div>
      </section>
    </section>
  </AppShell>
}
