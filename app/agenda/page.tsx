import Link from 'next/link'
import { AppShell } from '@/components/app-shell'
import { createAgenda } from '@/lib/actions/core'
import { createClient } from '@/lib/supabase/server'

type Params = { q?: string; tipe?: string; status?: string }

export default async function AgendaPage({ searchParams }: { searchParams: Promise<Params> }) {
  const params = await searchParams
  const q = String(params.q || '').trim()
  const tipe = String(params.tipe || '').trim()
  const status = String(params.status || '').trim()
  const supabase = await createClient(null)

  let query = supabase.from('agenda').select('*').order('tanggal', { ascending: false }).order('id', { ascending: false })
  if (q) query = query.or(`nama_agenda.ilike.%${q}%,pic.ilike.%${q}%,legacy_id.ilike.%${q}%`)
  if (tipe) query = query.eq('tipe', tipe)
  if (status) query = query.eq('status', status)
  const { data: rows, error } = await query
  if (error) throw new Error(error.message)

  return <AppShell active="/agenda" title="Agenda & Tugas">
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
        <div className="section-heading table-heading-with-filter">
          <div><p className="eyebrow">AGENDA</p><h2>Daftar Agenda & Tugas</h2><p className="muted-line">{(rows ?? []).length} agenda ditampilkan</p></div>
          <form method="get" className="filter-form compact-filter">
            <label>Cari<input name="q" defaultValue={q} placeholder="Agenda, PIC, atau ID lama" /></label>
            <label>Tipe<select name="tipe" defaultValue={tipe}><option value="">Semua</option><option>Rapat</option><option>Kunjungan</option><option>Tugas</option><option>Koordinasi</option></select></label>
            <label>Status<select name="status" defaultValue={status}><option value="">Semua</option><option>Terjadwal</option><option>Proses</option><option>Selesai</option><option>Ditunda</option></select></label>
            <button className="secondary-button" type="submit">Terapkan</button>
            {(q || tipe || status) ? <Link className="secondary-button" href="/agenda">Reset</Link> : null}
          </form>
        </div>
        <div className="table-scroll"><table className="data-table"><thead><tr><th>Tanggal / ID</th><th>Agenda</th><th>Tipe</th><th>PIC</th><th>Status</th></tr></thead><tbody>
          {(rows ?? []).map((row) => <tr key={row.id}><td><b>{row.tanggal}</b><small>{row.legacy_id || row.kode}</small></td><td><b>{row.nama_agenda}</b></td><td>{row.tipe || '-'}</td><td>{row.pic || '-'}</td><td><span className="status-pill">{row.status}</span></td></tr>)}
          {(rows ?? []).length === 0 ? <tr><td colSpan={5} className="empty-cell">Tidak ada agenda yang cocok.</td></tr> : null}
        </tbody></table></div>
      </section>
    </section>
  </AppShell>
}
