import { AppShell } from '@/components/app-shell'
import { updateTimLinks } from '@/lib/actions/core'
import { requireUser } from '@/lib/auth'

export default async function TimPage() {
  const { supabase, user, profile } = await requireUser()
  const { data: rows, error } = await supabase.from('tim_analisis').select('*').eq('active', true).order('id')
  if (error) throw new Error(error.message)
  const canEdit = profile.role === 'admin' || profile.role === 'editor'

  return <AppShell active="/tim-analisis" title="Tim Analisis" email={user.email}>
    {!canEdit ? <div className="notice notice-info">Mode viewer aktif. Profil tim dapat dilihat, tetapi perubahan link foto/CV hanya tersedia untuk editor dan admin.</div> : null}
    <section className="team-grid">
      {(rows ?? []).map((row) => <article className="panel team-card" key={row.id}>
        <div className="avatar">{String(row.nama || '?').split(' ').slice(0, 2).map((v: string) => v[0]).join('').toUpperCase()}</div>
        <div className="team-main">
          <p className="eyebrow">{row.legacy_id || row.kode}</p>
          <h2>{row.nama}</h2>
          <p className="muted-line">{row.peran || '-'}</p>
          <div className="team-links">
            {row.link_foto ? <a className="table-link" href={row.link_foto} target="_blank" rel="noreferrer">Foto</a> : <span className="muted">Foto belum ada</span>}
            {row.link_cv ? <a className="table-link" href={row.link_cv} target="_blank" rel="noreferrer">CV</a> : <span className="muted">CV belum ada</span>}
            <span className="status-pill">{row.user_id ? 'Terhubung Auth' : 'Belum terhubung Auth'}</span>
          </div>
        </div>
        {canEdit ? <form action={updateTimLinks} className="mini-form">
          <input type="hidden" name="id" value={row.id} />
          <label>Link Foto<input name="link_foto" type="url" defaultValue={row.link_foto || ''} /></label>
          <label>Link CV<input name="link_cv" type="url" defaultValue={row.link_cv || ''} /></label>
          <button type="submit" className="secondary-button">Perbarui Link</button>
        </form> : null}
      </article>)}
    </section>
  </AppShell>
}
