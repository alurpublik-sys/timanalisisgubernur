import { AppShell } from '@/components/app-shell'
import { updateTimLinks } from '@/lib/actions/core'
import { requireUser } from '@/lib/auth'

export default async function TimPage() {
  const { supabase, user } = await requireUser()
  const { data: rows, error } = await supabase.from('tim_analisis').select('*').eq('active', true).order('id')
  if (error) throw new Error(error.message)

  return <AppShell active="/tim-analisis" title="Tim Analisis" email={user.email}>
    <section className="team-grid">
      {(rows ?? []).map((row) => <article className="panel team-card" key={row.id}>
        <div className="avatar">{String(row.nama || '?').split(' ').slice(0, 2).map((v: string) => v[0]).join('').toUpperCase()}</div>
        <div className="team-main"><p className="eyebrow">{row.kode}</p><h2>{row.nama}</h2><p className="muted-line">{row.peran || '-'}</p></div>
        <form action={updateTimLinks} className="mini-form">
          <input type="hidden" name="id" value={row.id} />
          <label>Link Foto<input name="link_foto" type="url" defaultValue={row.link_foto || ''} /></label>
          <label>Link CV<input name="link_cv" type="url" defaultValue={row.link_cv || ''} /></label>
          <button type="submit" className="secondary-button">Perbarui Link</button>
        </form>
      </article>)}
    </section>
  </AppShell>
}
