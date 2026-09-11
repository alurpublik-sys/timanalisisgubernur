import { AppShell } from '@/components/app-shell'
import { createKunjungan } from '@/lib/actions/core'
import { requireUser } from '@/lib/auth'

export default async function KunjunganPage() {
  const { supabase, user } = await requireUser()
  const { data: rows, error } = await supabase.from('kunjungan').select('*').order('created_at', { ascending: false })
  if (error) throw new Error(error.message)

  return <AppShell active="/kunjungan" title="Kunjungan OPD" email={user.email}>
    <section className="module-grid">
      <form action={createKunjungan} className="panel form-card">
        <div className="section-heading"><p className="eyebrow">DATA BARU</p><h2>Catat Kunjungan OPD</h2></div>
        <label>Nama OPD<input name="opd" required /></label>
        <label>Tanggal<input name="tanggal" type="date" required /></label>
        <label>Pejabat<input name="pejabat" /></label>
        <label>Anggota Tim<input name="anggota" placeholder="Nama anggota/peserta" /></label>
        <label>Topik Pembahasan<textarea name="topik" required /></label>
        <label>Status<select name="status"><option>Terjadwal</option><option>Selesai</option><option>Ditunda</option></select></label>
        <label>Link Notulen<input name="link_notulen" type="url" /></label>
        <button className="primary-button" type="submit">Simpan Kunjungan</button>
      </form>

      <section className="panel table-panel">
        <div className="section-heading"><p className="eyebrow">DATABASE UTAMA</p><h2>Riwayat Kunjungan</h2></div>
        <div className="table-scroll"><table className="data-table"><thead><tr><th>Tgl / ID</th><th>OPD & Pejabat</th><th>Topik</th><th>Status</th><th>Dokumen</th></tr></thead><tbody>
          {(rows ?? []).map((row) => <tr key={row.id}><td><b>{row.tanggal}</b><small>{row.kode}</small></td><td><b>{row.nama_opd}</b><small>{row.pejabat || '-'}</small></td><td>{row.topik}</td><td><span className="status-pill">{row.status}</span></td><td>{row.link_notulen ? <a className="table-link" href={row.link_notulen} target="_blank" rel="noreferrer">Buka</a> : '-'}</td></tr>)}
          {(rows ?? []).length === 0 ? <tr><td colSpan={5} className="empty-cell">Belum ada data kunjungan.</td></tr> : null}
        </tbody></table></div>
      </section>
    </section>
  </AppShell>
}
