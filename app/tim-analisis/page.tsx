import Image from 'next/image'
import { AppShell } from '@/components/app-shell'
import { getTeamPhotoUrl } from '@/lib/branding'
import { createClient } from '@/lib/supabase/server'

function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase()
}

export default async function TimPage() {
  const supabase = await createClient(null)
  const { data: rows, error } = await supabase.from('tim_analisis').select('*').eq('active', true).order('sort_order').order('id')
  if (error) throw new Error(error.message)

  return <AppShell active="/tim-analisis" title="Tim Analisis">
    <section className="team-hero panel">
      <div><p className="eyebrow">PEOPLE BEHIND THE INSIGHT</p><h2>Tim multidisiplin untuk membaca masalah dari banyak sudut.</h2></div>
      <p>Profil anggota ditampilkan sebagai direktori profesional. Pengelolaan foto, CV, peran, dan data anggota dilakukan dari menu Pengaturan yang dilindungi PIN.</p>
    </section>

    <section className="team-showcase-grid">
      {(rows ?? []).map((row) => {
        const photo = getTeamPhotoUrl(row)
        return <article className="team-profile-card" key={row.id}>
          <div className="team-photo-frame">
            {photo ? <Image src={photo} alt={`Foto ${row.nama}`} fill sizes="(max-width: 760px) 100vw, (max-width: 1180px) 50vw, 33vw" className="team-photo" unoptimized /> : <div className="team-photo-fallback">{initials(row.nama)}</div>}
            <span className="team-code">{row.legacy_id || row.kode}</span>
          </div>
          <div className="team-profile-body">
            <p className="eyebrow">TIM ANALISIS</p>
            <h2>{row.nama}</h2>
            <p className="team-role">{row.peran || 'Analis AH Center'}</p>
            {row.bio ? <p className="team-bio">{row.bio}</p> : <p className="team-bio muted">Profil singkat akan ditambahkan dari Pengaturan.</p>}
            <div className="team-links">
              {photo ? <a className="secondary-button" href={photo} target="_blank" rel="noreferrer">Lihat Foto</a> : null}
              {(row.cv_url || row.link_cv) ? <a className="ghost-button dark" href={row.cv_url || row.link_cv || '#'} target="_blank" rel="noreferrer">Lihat CV</a> : <span className="asset-status">CV belum tersedia</span>}
            </div>
          </div>
        </article>
      })}
    </section>
  </AppShell>
}
