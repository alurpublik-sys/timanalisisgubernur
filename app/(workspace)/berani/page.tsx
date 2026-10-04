import Link from 'next/link'
import { getAuthContext } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { FeatureNotes } from '@/components/feature-notes'

function dateLabel(value?: string | null) {
  if (!value) return 'Belum ada update'
  return new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium', timeZone: 'Asia/Makassar' }).format(new Date(value))
}

export default async function BeraniPage() {
  const [{ user }, supabase] = await Promise.all([getAuthContext(), createClient(null)])
  const [{ data: programs, error: programError }, { data: updates, error: updateError }] = await Promise.all([
    supabase.from('berani_programs').select('*').eq('active', true).order('sort_order'),
    supabase.from('berani_updates').select('id,program_id,title,opd_name,period_label,row_count,created_at').order('created_at', { ascending: false }).limit(200),
  ])
  if (programError) throw new Error(programError.message)
  if (updateError) throw new Error(updateError.message)

  const latest = new Map<number, NonNullable<typeof updates>[number]>()
  const counts = new Map<number, number>()
  for (const update of updates ?? []) {
    counts.set(update.program_id, (counts.get(update.program_id) ?? 0) + 1)
    if (!latest.has(update.program_id)) latest.set(update.program_id, update)
  }

  const coveredPrograms=(programs??[]).filter((program)=>latest.has(program.id)).length

  return <>
    <section className="knowledge-hero panel">
      <div>
        <p className="eyebrow">PUSAT DATA PROGRAM</p>
        <h2>Pusat data 9 BERANI yang selalu mengikuti sumber terbaru.</h2>
        <p>Dokumen sumber tetap tersimpan sebagai arsip. PDF visual, spreadsheet, dokumen, presentasi, CSV, dan foto diproses menjadi indikator, tabel, dan grafik yang lebih mudah dibaca; pembaruan berikutnya digabung ke data aktif tanpa menghapus informasi lama yang masih relevan.</p>
      </div>
      <div className="knowledge-hero-stat"><strong>{coveredPrograms}/{(programs??[]).length}</strong><span>program dengan update</span></div>
    </section>

    <section className="berani-grid">
      {(programs ?? []).map((program, index) => {
        const update = latest.get(program.id)
        return <Link href={`/berani/${program.slug}`} prefetch className="berani-card" key={program.id}>
          <div className="berani-card-top"><span className="berani-number">{String(index + 1).padStart(2, '0')}</span><span className="berani-arrow">↗</span></div>
          <h2>{program.name}</h2>
          <p>{program.summary || 'Pusat pembaruan data program.'}</p>
          <div className="berani-latest">
            <span>{update?'Data aktif':'Baseline siap'}</span>
            <strong>{update?.title||'Menunggu sumber resmi terverifikasi'}</strong>
            {update?<small>{dateLabel(update.created_at)} · {update.row_count||0} baris data · {counts.get(program.id)??0} update</small>:<small>Ruang lingkup sudah ditata tanpa mengisi angka yang belum memiliki sumber.</small>}
            {program.slug==='berani-makmur'?<small className="berani-subprogram-note">Termasuk BERANI Tangkap Banyak</small>:null}
          </div>
        </Link>
      })}
    </section>
    <FeatureNotes featureKey="berani" returnPath="/berani" adminMode={Boolean(user)} title="Catatan 9 BERANI" description="Catatan umum lintas program 9 BERANI." />
  </>
}
