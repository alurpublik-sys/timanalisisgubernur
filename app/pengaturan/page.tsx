import { redirect } from 'next/navigation'
import { AppShell } from '@/components/app-shell'
import { requireUser } from '@/lib/auth'
import {
  addAccessProfile, addMasterAgenda, addMasterContribution, addTeamMember,
  updateAccessProfile, updateKinerjaSetting, updateMasterAgenda,
  updateMasterContribution, updateTeamMember,
} from '@/lib/actions/settings'

export default async function PengaturanPage() {
  const { supabase, profile } = await requireUser()
  if (profile.role !== 'admin') redirect('/dashboard')

  const [profilesRes, teamRes, agendaRes, contributionRes, settingsRes] = await Promise.all([
    supabase.from('profiles').select('*').order('created_at'),
    supabase.from('tim_analisis').select('*').order('id'),
    supabase.from('master_agenda').select('*').order('id'),
    supabase.from('master_kontribusi').select('*').order('id'),
    supabase.from('pengaturan_kinerja').select('*').order('kunci'),
  ])
  for (const result of [profilesRes, teamRes, agendaRes, contributionRes, settingsRes]) if (result.error) throw new Error(result.error.message)

  return <AppShell active="/pengaturan" title="Pengaturan & Master Data">
    <div className="notice notice-info">Halaman ini menggantikan Google Sheets sebagai pusat master data AH Center. Hanya admin yang dapat mengubah akses user, anggota tim, bobot agenda, jenis kontribusi, dan parameter honor.</div>

    <section className="settings-section">
      <div className="section-heading"><p className="eyebrow">AKSES APLIKASI</p><h2>User, Role & Status</h2></div>
      <div className="settings-grid">
        <form action={addAccessProfile} className="panel form-card compact-form">
          <h3>Aktifkan User Auth</h3>
          <label>User ID<input name="user_id" placeholder="UUID dari Supabase Auth" required /></label>
          <label>Email<input name="email" type="email" /></label>
          <label>Nama<input name="full_name" /></label>
          <label>Role<select name="role" defaultValue="viewer"><option value="viewer">Viewer</option><option value="editor">Editor</option><option value="admin">Admin</option></select></label>
          <input type="hidden" name="active" value="true" />
          <button className="primary-button">Aktifkan Akses</button>
        </form>
        {(profilesRes.data || []).map((row) => <form action={updateAccessProfile} className="panel form-card compact-form" key={row.user_id}>
          <input type="hidden" name="user_id" value={row.user_id} /><p className="eyebrow">{row.user_id}</p>
          <label>Email<input name="email" type="email" defaultValue={row.email || ''} /></label>
          <label>Nama<input name="full_name" defaultValue={row.full_name || ''} /></label>
          <label>Role<select name="role" defaultValue={row.role}><option value="viewer">Viewer</option><option value="editor">Editor</option><option value="admin">Admin</option></select></label>
          <label>Status<select name="active" defaultValue={row.active ? 'true' : 'false'}><option value="true">Aktif</option><option value="false">Nonaktif</option></select></label>
          <button className="secondary-button">Simpan Akses</button>
        </form>)}
      </div>
    </section>

    <section className="settings-section">
      <div className="section-heading"><p className="eyebrow">TIM ANALISIS</p><h2>Anggota & Peran</h2></div>
      <div className="settings-grid">
        <form action={addTeamMember} className="panel form-card compact-form">
          <h3>Tambah Anggota</h3>
          <label>Nama<input name="nama" required /></label><label>Peran<input name="peran" /></label>
          <label>Link Foto<input name="link_foto" type="url" /></label><label>Link CV<input name="link_cv" type="url" /></label>
          <button className="primary-button">Tambah</button>
        </form>
        {(teamRes.data || []).map((row) => <form action={updateTeamMember} className="panel form-card compact-form" key={row.id}>
          <input type="hidden" name="id" value={row.id} /><p className="eyebrow">{row.kode}</p>
          <label>Nama<input name="nama" defaultValue={row.nama} required /></label><label>Peran<input name="peran" defaultValue={row.peran || ''} /></label>
          <label>Link Foto<input name="link_foto" type="url" defaultValue={row.link_foto || ''} /></label><label>Link CV<input name="link_cv" type="url" defaultValue={row.link_cv || ''} /></label>
          <label>Status<select name="active" defaultValue={row.active ? 'true' : 'false'}><option value="true">Aktif</option><option value="false">Nonaktif</option></select></label>
          <button className="secondary-button">Simpan Perubahan</button>
        </form>)}
      </div>
    </section>

    <section className="settings-section">
      <div className="section-heading"><p className="eyebrow">MASTER AGENDA</p><h2>Jenis Agenda & Bobot</h2></div>
      <div className="settings-grid">
        <form action={addMasterAgenda} className="panel form-card compact-form"><h3>Tambah Jenis Agenda</h3>
          <label>Nama<input name="nama_agenda" required /></label><label>Bobot<input name="bobot" type="number" step="0.01" defaultValue="1" required /></label>
          <label>Kewajiban<select name="kewajiban"><option>Semua Tim</option><option>Peserta Dipilih</option></select></label>
          <label>Pengecualian<input name="pengecualian" placeholder="Nama/kode, pisahkan koma" /></label><input type="hidden" name="status" value="Aktif" />
          <button className="primary-button">Tambah Agenda</button>
        </form>
        {(agendaRes.data || []).map((row) => <form action={updateMasterAgenda} className="panel form-card compact-form" key={row.id}>
          <input type="hidden" name="id" value={row.id} />
          <label>Nama<input name="nama_agenda" defaultValue={row.nama_agenda} required /></label><label>Bobot<input name="bobot" type="number" step="0.01" defaultValue={row.bobot} required /></label>
          <label>Kewajiban<select name="kewajiban" defaultValue={row.kewajiban}><option>Semua Tim</option><option>Peserta Dipilih</option></select></label>
          <label>Pengecualian<input name="pengecualian" defaultValue={row.pengecualian || ''} /></label><label>Status<select name="status" defaultValue={row.status}><option>Aktif</option><option>Nonaktif</option></select></label>
          <button className="secondary-button">Simpan Agenda</button>
        </form>)}
      </div>
    </section>

    <section className="settings-section">
      <div className="section-heading"><p className="eyebrow">MASTER KONTRIBUSI</p><h2>Jenis Output & Poin</h2></div>
      <div className="settings-grid">
        <form action={addMasterContribution} className="panel form-card compact-form"><h3>Tambah Kontribusi</h3>
          <label>Nama<input name="nama_kontribusi" required /></label><label>Bobot / Poin<input name="bobot" type="number" step="0.01" defaultValue="1" required /></label>
          <label>Khusus Tim<input name="khusus_tim" placeholder="Kosong = semua anggota" /></label><input type="hidden" name="status" value="Aktif" />
          <button className="primary-button">Tambah Kontribusi</button>
        </form>
        {(contributionRes.data || []).map((row) => <form action={updateMasterContribution} className="panel form-card compact-form" key={row.id}>
          <input type="hidden" name="id" value={row.id} />
          <label>Nama<input name="nama_kontribusi" defaultValue={row.nama_kontribusi} required /></label><label>Bobot / Poin<input name="bobot" type="number" step="0.01" defaultValue={row.bobot} required /></label>
          <label>Khusus Tim<input name="khusus_tim" defaultValue={row.khusus_tim || ''} /></label><label>Status<select name="status" defaultValue={row.status}><option>Aktif</option><option>Nonaktif</option></select></label>
          <button className="secondary-button">Simpan Kontribusi</button>
        </form>)}
      </div>
    </section>

    <section className="settings-section">
      <div className="section-heading"><p className="eyebrow">PARAMETER KINERJA</p><h2>Honor, Potongan & Faktor Kehadiran</h2></div>
      <div className="settings-grid">
        {(settingsRes.data || []).map((row) => <form action={updateKinerjaSetting} className="panel form-card compact-form" key={row.kunci}>
          <input type="hidden" name="kunci" value={row.kunci} /><p className="eyebrow">{row.kunci}</p>
          <label>Nilai<input name="nilai" type="number" step="0.01" defaultValue={row.nilai} required /></label>
          <label>Keterangan<textarea name="keterangan" defaultValue={row.keterangan || ''} /></label>
          <button className="secondary-button">Simpan Parameter</button>
        </form>)}
      </div>
    </section>
  </AppShell>
}
