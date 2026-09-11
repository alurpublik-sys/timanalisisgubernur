import { AppShell } from '@/components/app-shell'
import { createMedia } from '@/lib/actions/core'
import { requireUser } from '@/lib/auth'

export default async function MediaPage() {
  const { supabase, user } = await requireUser()
  const { data: rows, error } = await supabase.from('media_monitoring').select('*').order('tanggal', { ascending: false })
  if (error) throw new Error(error.message)

  return <AppShell active="/media-monitor" title="Media Monitor" email={user.email}>
    <section className="module-grid">
      <form action={createMedia} className="panel form-card">
        <div className="section-heading"><p className="eyebrow">MONITORING MEDIA</p><h2>Tambah Berita</h2></div>
        <label>Judul Berita<input name="judul" required /></label>
        <label>Nama Media<input name="media" /></label>
        <label>Tanggal<input name="tanggal" type="date" required /></label>
        <label>Sentimen<select name="sentimen"><option>Positif</option><option>Netral</option><option>Negatif</option></select></label>
        <label>Link Berita<input name="link" type="url" /></label>
        <button className="primary-button" type="submit">Simpan Berita</button>
      </form>

      <section className="panel table-panel">
        <div className="section-heading"><p className="eyebrow">MONITORING</p><h2>Media Terkini</h2></div>
        <div className="table-scroll"><table className="data-table"><thead><tr><th>Tanggal / ID</th><th>Berita</th><th>Media</th><th>Sentimen</th><th>Link</th></tr></thead><tbody>
          {(rows ?? []).map((row) => <tr key={row.id}><td><b>{row.tanggal}</b><small>{row.kode}</small></td><td><b>{row.judul_berita}</b></td><td>{row.nama_media || '-'}</td><td><span className="status-pill">{row.sentimen || '-'}</span></td><td>{row.link_berita ? <a className="table-link" href={row.link_berita} target="_blank" rel="noreferrer">Buka</a> : '-'}</td></tr>)}
          {(rows ?? []).length === 0 ? <tr><td colSpan={5} className="empty-cell">Belum ada data media.</td></tr> : null}
        </tbody></table></div>
      </section>
    </section>
  </AppShell>
}
