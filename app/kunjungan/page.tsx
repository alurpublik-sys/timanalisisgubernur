import Link from 'next/link'
import { AppShell } from '@/components/app-shell'
import { createKunjungan } from '@/lib/actions/core'
import { createClient } from '@/lib/supabase/server'

type Params = { q?: string; status?: string }

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
    <div className="notice notice-info">Notulensi tetap dapat memakai Google Docs. AH Center menyimpan tautannya sebagai referensi sumber utama.</div>
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
          {(rows ?? []).map((row) => <tr key={row.id}><td><b>{row.tanggal}</b><small>{row.legacy_id || row.kode}</small></td><td><b>{row.nama_opd}</b><small>{row.pejabat || '-'}</small></td><td>{row.topik}</td><td><span className="status-pill">{row.status}</span></td><td>{row.link_notulen ? <a className="table-link" href={row.link_notulen} target="_blank" rel="noreferrer">Buka Google Docs</a> : '-'}</td></tr>)}
          {(rows ?? []).length === 0 ? <tr><td colSpan={5} className="empty-cell">Tidak ada data kunjungan yang cocok.</td></tr> : null}
        </tbody></table></div>
      </section>
    </section>
  </AppShell>
}
