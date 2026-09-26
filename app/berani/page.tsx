import Link from 'next/link'
import { AppShell } from '@/components/app-shell'
import { getAuthContext } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'

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

  return <AppShell active="/berani" title="9 BERANI" adminMode={Boolean(user)}>
    <section className="knowledge-hero panel">
      <div>
        <p className="eyebrow">PUSAT DATA PROGRAM</p>
        <h2>Update terbaru 9 BERANI dalam satu tempat.</h2>
        <p>Pilih program untuk melihat pembaruan, dokumen sumber, dan tabel data terbaru. Setiap program dapat menerima dokumen PDF, Excel, atau Word.</p>
      </div>
      <div className="knowledge-hero-stat"><strong>{(programs ?? []).length}</strong><span>program aktif</span></div>
    </section>

    <section className="berani-grid">
      {(programs ?? []).map((program, index) => {
        const update = latest.get(program.id)
        return <Link href={`/berani/${program.slug}`} prefetch className="berani-card" key={program.id}>
          <div className="berani-card-top"><span className="berani-number">{String(index + 1).padStart(2, '0')}</span><span className="berani-arrow">↗</span></div>
          <h2>{program.name}</h2>
          <p>{program.summary || 'Pusat pembaruan data program.'}</p>
          <div className="berani-latest">
            <span>{update ? 'Update terbaru' : 'Belum ada data'}</span>
            <strong>{update?.title || 'Tambahkan update pertama'}</strong>
            {update ? <small>{dateLabel(update.created_at)} · {update.row_count || 0} baris data · {counts.get(program.id) ?? 0} update</small> : null}
          </div>
        </Link>
      })}
    </section>
  </AppShell>
}
