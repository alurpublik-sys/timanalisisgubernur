import { AppShell } from '@/components/app-shell'
import { finalizeKinerjaPeriod, reopenKinerjaPeriod, saveAbsensiAgenda, saveKontribusiKerja } from '@/lib/actions/kinerja'
import { requireUser } from '@/lib/auth'
import { getKinerjaData, normalizePeriod } from '@/lib/kinerja'

const rupiah = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 })

export default async function KinerjaPage({ searchParams }: { searchParams: Promise<{ period?: string }> }) {
  const params = await searchParams
  const period = normalizePeriod(params.period)
  const [{ user, profile }, data] = await Promise.all([requireUser(), getKinerjaData(period)])
  const locked = data.finalization.isFinalized
  const isAdmin = profile.role === 'admin'
  const canEdit = profile.role === 'admin' || profile.role === 'editor'

  return <AppShell active="/kinerja" title="Kinerja & Aktivitas Tim" email={user.email}>
    <section className="panel" style={{ marginBottom: 16 }}>
      <div className="panel-head">
        <div><p className="eyebrow">PERIODE EVALUASI</p><h2>{period}</h2></div>
        <form method="get" className="filter-form"><label>Pilih Bulan<input type="month" name="period" defaultValue={period} /></label><button className="secondary-button" type="submit">Tampilkan</button></form>
      </div>
      {data.finalization.isFinalized ? <div className="notice notice-success">Periode ini sudah <b>FINAL</b>. Rekomendasi honor menggunakan snapshot yang dikunci pada {data.finalization.finalizedAt || '-'}. Data absensi dan kontribusi tidak dapat diubah sampai evaluasi dibuka kembali.</div> : data.finalization.canFinalize ? <div className="notice notice-info">Periode sudah berakhir. Evaluasi honor sudah dapat dilihat{isAdmin ? ' dan dapat difinalisasi sebagai snapshot resmi.' : '. Finalisasi hanya dapat dilakukan admin.'}</div> : data.finalization.periodState === 'future' ? <div className="notice notice-warn">Periode mendatang belum dapat dievaluasi atau difinalisasi.</div> : <div className="notice notice-warn">Bulan berjalan: rekomendasi potongan dan honor <b>disembunyikan</b>. Evaluasi baru terbuka setelah bulan benar-benar selesai.</div>}
      {!canEdit ? <div className="notice notice-info">Akun Anda memiliki akses <b>viewer</b>. Data dapat dilihat, tetapi perubahan absensi, kontribusi, dan finalisasi dinonaktifkan.</div> : null}
      <div className="kinerja-actions">
        {isAdmin && data.finalization.canFinalize ? <form action={finalizeKinerjaPeriod}><input type="hidden" name="period" value={period} /><button className="primary-button" type="submit">Finalisasi Evaluasi {period}</button></form> : null}
        {isAdmin && data.finalization.isFinalized ? <form action={reopenKinerjaPeriod} className="filter-form"><input type="hidden" name="period" value={period} /><label>Catatan Buka Ulang<input name="note" placeholder="Alasan koreksi (opsional)" /></label><button className="secondary-button" type="submit">Buka Evaluasi</button></form> : null}
      </div>
    </section>

    <section className="summary-grid">
      <article className="panel summary-card"><p className="eyebrow">AGENDA</p><strong>{data.summary.totalAgenda}</strong><span className="muted">agenda periode ini</span></article>
      <article className="panel summary-card"><p className="eyebrow">KEHADIRAN</p><strong>{data.summary.attendanceRate}%</strong><span className="muted">rata-rata tim</span></article>
      <article className="panel summary-card"><p className="eyebrow">KONTRIBUSI</p><strong>{data.summary.completedContributions}/{data.summary.totalContributions}</strong><span className="muted">output selesai</span></article>
      <article className="panel summary-card"><p className="eyebrow">HONOR</p><strong>{data.summary.totalRecommendedHonor === null ? 'Terkunci' : rupiah.format(data.summary.totalRecommendedHonor)}</strong><span className="muted">total direkomendasikan</span></article>
    </section>

    <section className="panel table-panel" style={{ marginBottom: 16 }}>
      <div className="section-heading"><p className="eyebrow">EVALUASI TIM</p><h2>Rekomendasi Honorarium</h2></div>
      <div className="table-scroll"><table className="data-table" style={{ minWidth: 980 }}><thead><tr><th>Anggota</th><th>Kehadiran Wajib</th><th>Kunjungan OPD</th><th>Rapat Internal</th><th>Kontribusi</th><th>Basis Evaluasi</th><th>Rekom. Potongan</th><th>Honor Direkomendasikan</th></tr></thead><tbody>
        {data.evaluations.map((item: any) => <tr key={item.dbId || item.ID_TIM}>
          <td><b>{item.NAMA}</b><small>{item.PERAN || '-'} · {item.ID_TIM}</small></td>
          <td><b>{item.attendanceRate === null ? '-' : `${item.attendanceRate}%`}</b><small>H {item.hadir} · I {item.izin} · TH {item.tidakHadir}</small></td>
          <td>{item.opdExcluded ? <span className="status-pill">Dikecualikan</span> : <><b>{item.opdRate === null ? '-' : `${item.opdRate}%`}</b><small>{item.opdHadir}/{item.opdRequired} hadir</small></>}</td>
          <td><b>{item.rapatRate === null ? '-' : `${item.rapatRate}%`}</b><small>{item.rapatHadir}/{item.rapatRequired} hadir</small></td>
          <td><b>{item.contributionPoints} poin</b><small>{item.completedContributions}/{item.totalContributions} selesai</small></td>
          <td><b>{item.honorBasis || 'Terkunci'}</b><small>{item.honorEvaluationRate === null ? '' : `${item.honorEvaluationRate}%`}</small></td>
          <td>{item.recommendedDeduction === null ? 'Terkunci' : rupiah.format(item.recommendedDeduction)}<small>{item.recommendationLabel || ''}</small></td>
          <td><b>{item.recommendedHonor === null ? 'Terkunci' : rupiah.format(item.recommendedHonor)}</b></td>
        </tr>)}
      </tbody></table></div>
    </section>

    {canEdit && !locked ? <section className="module-grid">
      <form action={saveAbsensiAgenda} className="panel form-card">
        <div className="section-heading"><p className="eyebrow">KEHADIRAN</p><h2>Catat Agenda</h2></div>
        <label>Tanggal<input type="date" name="tanggal" required /></label>
        <label>Jenis Agenda<select name="jenis_agenda" required><option value="">Pilih agenda</option>{data.agendaMasters.map((item: any) => <option key={item.id} value={item.nama_agenda}>{item.nama_agenda} · Bobot {item.bobot}</option>)}</select></label>
        <label>Nama / Detail Agenda<input name="detail_agenda" required /></label>
        <label>Lokasi<input name="lokasi" /></label>
        <div className="section-heading" style={{ marginTop: 8 }}><p className="eyebrow">STATUS ANGGOTA</p></div>
        {data.team.map((member: any) => <label key={member.id}>{member.nama}<select name={`member_${member.id}`} defaultValue=""><option value="">Tidak dipilih</option><option>Hadir</option><option>Izin</option><option>Tidak Hadir</option></select></label>)}
        <p className="muted">Untuk agenda “Semua Tim”, sistem akan menolak penyimpanan bila anggota wajib belum diberi status. Pengecualian Master Agenda tetap diterapkan di server.</p>
        <button className="primary-button" type="submit">Simpan Kehadiran</button>
      </form>

      <form action={saveKontribusiKerja} className="panel form-card">
        <div className="section-heading"><p className="eyebrow">OUTPUT KERJA</p><h2>Catat Kontribusi</h2></div>
        <label>Tanggal<input type="date" name="tanggal" required /></label>
        <label>Anggota<select name="tim_id" required><option value="">Pilih anggota</option>{data.team.map((member: any) => <option key={member.id} value={member.id}>{member.nama}</option>)}</select></label>
        <label>Jenis Kontribusi<select name="jenis_kontribusi" required><option value="">Pilih kontribusi</option>{data.contributionMasters.map((item: any) => <option key={item.id} value={item.nama_kontribusi}>{item.nama_kontribusi} · {item.bobot} poin</option>)}</select></label>
        <label>Keterangan<textarea name="keterangan" required /></label>
        <label>Status<select name="status"><option>Dalam Proses</option><option>Selesai</option></select></label>
        <label>Link Hasil<input type="url" name="link_hasil" /></label>
        <button className="primary-button" type="submit">Simpan Kontribusi</button>
      </form>
    </section> : null}

    <section className="history-stack">
      <section className="panel table-panel"><div className="section-heading"><p className="eyebrow">RIWAYAT</p><h2>Kehadiran Agenda</h2></div><div className="table-scroll"><table className="data-table"><thead><tr><th>Tanggal</th><th>Agenda</th><th>Anggota</th><th>Status</th><th>Bobot</th></tr></thead><tbody>
        {data.attendance.map((row: any) => <tr key={row.id}><td><b>{row.tanggal}</b><small>{row.agenda_event_id}</small></td><td><b>{row.jenis_agenda}</b><small>{row.detail_agenda}{row.lokasi ? ` · ${row.lokasi}` : ''}</small></td><td>{row.nama_anggota}</td><td><span className="status-pill">{row.status_kehadiran}</span></td><td>{row.bobot_agenda}</td></tr>)}
        {!data.attendance.length ? <tr><td colSpan={5} className="empty-cell">Belum ada data kehadiran periode ini.</td></tr> : null}
      </tbody></table></div></section>

      <section className="panel table-panel"><div className="section-heading"><p className="eyebrow">RIWAYAT</p><h2>Kontribusi Kerja</h2></div><div className="table-scroll"><table className="data-table"><thead><tr><th>Tanggal</th><th>Anggota</th><th>Kontribusi</th><th>Status</th><th>Poin</th></tr></thead><tbody>
        {data.contributions.map((row: any) => <tr key={row.id}><td><b>{row.tanggal}</b><small>{row.legacy_id || row.kode}</small></td><td>{row.nama_anggota}</td><td><b>{row.jenis_kontribusi}</b><small>{row.keterangan}</small></td><td><span className="status-pill">{row.status}</span></td><td>{row.bobot}</td></tr>)}
        {!data.contributions.length ? <tr><td colSpan={5} className="empty-cell">Belum ada kontribusi periode ini.</td></tr> : null}
      </tbody></table></div></section>
    </section>
  </AppShell>
}
