import { createClient } from '@/lib/supabase/server'
import { createFeatureNote, updateFeatureNote, deleteFeatureNote } from '@/lib/actions/notes'
import { PendingSubmitButton } from '@/components/pending-submit-button'
import { Suspense } from 'react'

function dateLabel(value: string) {
  return new Intl.DateTimeFormat('id-ID', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Asia/Makassar',
  }).format(new Date(value))
}

async function FeatureNotesContent({
  featureKey,
  entityKey = '__module__',
  returnPath,
  adminMode,
  title = 'Catatan',
  description = 'Catatan kerja untuk fitur ini.',
}: {
  featureKey: string
  entityKey?: string
  returnPath: string
  adminMode: boolean
  title?: string
  description?: string
}) {
  const supabase = await createClient(null)
  const { data: notes, error } = await supabase
    .from('feature_notes')
    .select('*')
    .eq('feature_key', featureKey)
    .eq('entity_key', entityKey)
    .order('updated_at', { ascending: false })
  if (error) throw new Error(error.message)

  return <section className="panel feature-notes-panel">
    <div className="feature-notes-head">
      <div>
        <p className="eyebrow">CATATAN</p>
        <h2>{title}</h2>
        <p>{description}</p>
      </div>
      <span>{notes?.length ?? 0} catatan</span>
    </div>

    {adminMode ? <details className="feature-note-compose">
      <summary><span>＋</span> Tambah catatan</summary>
      <form action={createFeatureNote} className="feature-note-form">
        <input type="hidden" name="feature_key" value={featureKey} />
        <input type="hidden" name="entity_key" value={entityKey} />
        <input type="hidden" name="return_path" value={returnPath} />
        <label>Judul <input name="title" placeholder="Opsional" /></label>
        <label>Catatan <textarea name="content" required placeholder="Tulis catatan, tindak lanjut, atau pengingat..." /></label>
        <PendingSubmitButton className="primary-button" pendingLabel="Menyimpan catatan…">Simpan Catatan</PendingSubmitButton>
      </form>
    </details> : null}

    <div className="feature-note-list">
      {(notes ?? []).map((note) => <article className="feature-note-card" key={note.id}>
        <div className="feature-note-card-head">
          <div>
            <strong>{note.title || 'Catatan'}</strong>
            <small>Diperbarui {dateLabel(note.updated_at)}</small>
          </div>
          {adminMode ? <div className="feature-note-tools">
            <details>
              <summary title="Edit catatan" aria-label="Edit catatan">✎</summary>
              <form action={updateFeatureNote} className="feature-note-form compact-note-form">
                <input type="hidden" name="id" value={note.id} />
                <input type="hidden" name="return_path" value={returnPath} />
                <label>Judul <input name="title" defaultValue={note.title || ''} /></label>
                <label>Catatan <textarea name="content" required defaultValue={note.content} /></label>
                <PendingSubmitButton className="secondary-button" pendingLabel="Menyimpan…">Simpan</PendingSubmitButton>
              </form>
            </details>
            <form action={deleteFeatureNote}>
              <input type="hidden" name="id" value={note.id} />
              <input type="hidden" name="return_path" value={returnPath} />
              <PendingSubmitButton className="icon-delete-button compact" pendingLabel="…" title="Hapus catatan" aria-label="Hapus catatan">×</PendingSubmitButton>
            </form>
          </div> : null}
        </div>
        <p>{note.content}</p>
      </article>)}
      {(notes ?? []).length === 0 ? <div className="feature-note-empty">Belum ada catatan untuk bagian ini.</div> : null}
    </div>
  </section>
}


export function FeatureNotes(props: {
  featureKey: string
  entityKey?: string
  returnPath: string
  adminMode: boolean
  title?: string
  description?: string
}) {
  return (
    <Suspense fallback={
      <section className="panel feature-notes-panel feature-notes-deferred" aria-label="Memuat catatan">
        <div className="feature-notes-head">
          <div><p className="eyebrow">CATATAN</p><h2>{props.title || 'Catatan'}</h2></div>
          <span>…</span>
        </div>
      </section>
    }>
      <FeatureNotesContent {...props} />
    </Suspense>
  )
}
