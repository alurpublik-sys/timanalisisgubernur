import Image from 'next/image'
import { AppShell } from '@/components/app-shell'
import { changeAdminPin } from '@/lib/actions/pin-auth'
import { addTeamMember, migrateLegacyTeamAssets, updateTeamMember } from '@/lib/actions/settings'
import { createKunjungan } from '@/lib/actions/core'
import { requireUser } from '@/lib/auth'
import { getTeamPhotoUrl } from '@/lib/branding'
import { FeatureNotes } from '@/components/feature-notes'
import { DirectUploadField } from '@/components/direct-upload-field'

export default async function PengaturanPage() {
  const { supabase } = await requireUser('/pengaturan')
  const { data: team, error } = await supabase.from('tim_analisis').select('*').order('sort_order').order('id')
  if (error) throw new Error(error.message)

  return <AppShell active="/pengaturan" title="Pengaturan" adminMode>
    <div className="notice notice-success">Mode edit administrator sedang aktif. PIN yang sama melindungi Pengaturan, Temuan OPD, penambahan/edit Referensi Konten, pengelolaan 9 BERANI, dan penambahan Kunjungan OPD.</div>

    <section className="settings-overview-grid">
      <article className="panel settings-highlight"><p className="eyebrow">KEAMANAN</p><h2>PIN Administrator</h2><p>Gunakan PIN khusus untuk mengelola profil tim, file, dan konfigurasi sensitif.</p></article>
      <article className="panel settings-highlight"><p className="eyebrow">TIM AKTIF</p><strong>{(team ?? []).filter((row) => row.active).length}</strong><p>anggota tampil pada direktori publik.</p></article>
      <article className="panel settings-highlight"><p className="eyebrow">STORAGE</p><h2>Supabase</h2><p>Foto dan CV dikelola melalui bucket <code>team-assets</code>.</p></article>
    </section>

    <section className="settings-section">
      <div className="section-heading"><p className="eyebrow">KEAMANAN</p><h2>PIN Pengaturan</h2></div>
      <div className="settings-grid settings-grid-two">
        <form action={changeAdminPin} className="panel form-card compact-form">
          <h3>Ganti PIN</h3><p className="muted-line">PIN terdiri dari 5 sampai 8 angka. Mengganti PIN akan mencabut seluruh sesi edit aktif.</p>
          <label>PIN Baru<input name="new_pin" type="password" inputMode="numeric" pattern="[0-9]{5,8}" minLength={5} maxLength={8} autoComplete="new-password" required /></label>
          <label>Konfirmasi PIN<input name="confirm_pin" type="password" inputMode="numeric" pattern="[0-9]{5,8}" minLength={5} maxLength={8} autoComplete="new-password" required /></label>
          <button className="primary-button" type="submit">Ganti PIN & Keluar</button>
        </form>
        <form action={migrateLegacyTeamAssets} className="panel migration-card">
          <p className="eyebrow">MIGRASI ASET</p><h3>Google Drive → Supabase Storage</h3>
          <p>Salin otomatis foto dan CV lama yang masih memakai tautan Google Drive ke storage tim.  File yang gagal diakses tetap mempertahankan tautan lama sebagai fallback.</p>
          <button className="secondary-button" type="submit">Migrasikan Aset Lama</button>
        </form>
      </div>
    </section>

    <section className="settings-section">
      <div className="section-heading"><p className="eyebrow">KUNJUNGAN OPD</p><h2>Tambah Kunjungan</h2><p className="muted-line">Form penambahan dipusatkan di Pengaturan agar halaman Kunjungan OPD tetap bersih dan fokus untuk membaca notulensi.</p></div>
      <form action={createKunjungan} className="panel form-card settings-visit-form">
        <div className="settings-form-grid">
          <label>Nama OPD<input name="opd" required placeholder="Nama OPD" /></label>
          <label>Tanggal<input name="tanggal" type="date" required /></label>
          <label>Pejabat / Narasumber<input name="pejabat" placeholder="Nama pejabat atau narasumber" /></label>
          <label>Anggota Tim<input name="anggota" placeholder="Nama anggota/peserta" /></label>
          <label className="settings-field-wide">Topik Pembahasan<textarea name="topik" required placeholder="Topik utama kunjungan" /></label>
          <label>Status<select name="status" defaultValue="Selesai"><option>Terjadwal</option><option>Selesai</option><option>Ditunda</option></select></label>
          <label>Google Docs Notulensi<input name="link_notulen" type="url" placeholder="https://docs.google.com/document/..." /></label>
          <div className="settings-field-wide"><DirectUploadField kind="kunjungan-pdf" name="notulen_uploads" label="PDF Notulensi" accept="application/pdf,.pdf" helpText="Opsional. File diunggah langsung ke Supabase agar PDF besar tidak mentok batas Vercel." /></div>
        </div>
        <button className="primary-button" type="submit">Simpan Kunjungan</button>
      </form>
    </section>

    <section className="settings-section">
      <div className="section-heading"><p className="eyebrow">TIM ANALISIS</p><h2>Profil, Foto & CV</h2></div>
      <div className="settings-grid">
        <form action={addTeamMember} className="panel form-card compact-form add-member-card">
          <p className="eyebrow">ANGGOTA BARU</p><h3>Tambah Tim Analisis</h3>
          <label>Nama<input name="nama" required /></label><label>Peran<input name="peran" /></label>
          <label>Bio singkat<textarea name="bio" placeholder="Keahlian, fokus analisis, atau pengalaman singkat" /></label>
          <DirectUploadField kind="team-photo" name="photo_uploads" label="Foto" accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp" helpText="Foto diunggah langsung ke Supabase." />
          <DirectUploadField kind="team-cv" name="cv_uploads" label="CV PDF" accept="application/pdf,.pdf" helpText="CV diunggah langsung ke Supabase." />
          <button className="primary-button">Tambah Anggota</button>
        </form>
        {(team ?? []).map((row) => { const photo=getTeamPhotoUrl(row); return <form action={updateTeamMember} className="panel form-card compact-form member-settings-card" key={row.id}>
          <input type="hidden" name="id" value={row.id} />
          <div className="member-editor-head"><div className="member-editor-photo">{photo ? <Image src={photo} alt={row.nama} fill sizes="96px" className="team-photo" unoptimized /> : <span>{row.nama.slice(0,1)}</span>}</div><div><p className="eyebrow">{row.legacy_id || row.kode}</p><h3>{row.nama}</h3><span>{row.photo_path?'Foto di Supabase':row.link_foto?'Foto masih legacy':'Belum ada foto'}</span></div></div>
          <label>Nama<input name="nama" defaultValue={row.nama} required /></label><label>Peran<input name="peran" defaultValue={row.peran || ''} /></label>
          <label>Bio singkat<textarea name="bio" defaultValue={row.bio || ''} /></label>
          <div className="settings-inline-fields"><label>Urutan<input name="sort_order" type="number" min="0" defaultValue={row.sort_order || row.id} /></label><label>Status<select name="active" defaultValue={row.active?'true':'false'}><option value="true">Aktif</option><option value="false">Nonaktif</option></select></label></div>
          <DirectUploadField kind="team-photo" name="photo_uploads" label="Ganti Foto" accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp" scope={String(row.id)} />
          <DirectUploadField kind="team-cv" name="cv_uploads" label="Ganti CV" accept="application/pdf,.pdf" scope={String(row.id)} />
          <div className="asset-row">{photo?<a href={photo} target="_blank" rel="noreferrer">Foto saat ini</a>:<span>Foto belum ada</span>}{(row.cv_url||row.link_cv)?<a href={row.cv_url||row.link_cv||'#'} target="_blank" rel="noreferrer">CV saat ini</a>:<span>CV belum ada</span>}</div>
          <button className="secondary-button">Simpan Profil</button>
        </form> })}
      </div>
    </section>
    <FeatureNotes featureKey="pengaturan" returnPath="/pengaturan" adminMode title="Catatan Pengaturan" description="Catatan internal administrator untuk konfigurasi dan tindak lanjut teknis." />
  </AppShell>
}
