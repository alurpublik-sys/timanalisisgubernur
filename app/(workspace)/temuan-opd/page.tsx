import Link from 'next/link'
import { deleteFinding, deleteFindingDocument, updateFinding } from '@/lib/actions/knowledge'
import { SUPABASE_URL } from '@/lib/branding'
import { requireUser } from '@/lib/auth'
import { FeatureNotes } from '@/components/feature-notes'
import type { Database } from '@/lib/database.types'
import { DirectUploadField } from '@/components/direct-upload-field'
import { PendingSubmitButton } from '@/components/pending-submit-button'
import { FindingAddDialog } from '@/components/finding-add-dialog'
import { getOpdNames } from '@/lib/opd'

type Params = { opd?: string; q?: string; category?: string; sort?: string }
type FindingDocument = Database['public']['Tables']['opd_finding_documents']['Row']

function todayMakassar() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Makassar', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date())
}

function dateLabel(value: string) {
  return new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium', timeZone: 'Asia/Makassar' }).format(new Date(`${value}T00:00:00+08:00`))
}

function findingDocumentUrl(path: string) {
  return `${SUPABASE_URL}/storage/v1/object/public/finding-documents/${encodeURI(path)}`
}

function fileKind(name: string) {
  return name.split('.').pop()?.toUpperCase() || 'FILE'
}

const categories = ['Temuan', 'Positif', 'Perlu Perhatian', 'Potensi', 'Tindak Lanjut']

export default async function TemuanOpdPage({ searchParams }: { searchParams: Promise<Params> }) {
  const params = await searchParams
  const selectedOpd = String(params.opd || '').trim()
  const keyword = String(params.q || '').trim()
  const selectedCategory = String(params.category || '').trim()
  const sort = String(params.sort || 'latest').trim()
  const { supabase } = await requireUser('/temuan-opd')

  const [{ data: programs, error: programError }, opdNames] = await Promise.all([
    supabase.from('berani_programs').select('id,name').eq('active', true).order('sort_order'),
    getOpdNames(),
  ])
  if (programError) throw new Error(programError.message)

  let findingQuery = supabase.from('opd_findings').select('*')
  if (selectedOpd) findingQuery = findingQuery.eq('opd_name', selectedOpd)
  if (selectedCategory) findingQuery = findingQuery.eq('category', selectedCategory)
  if (keyword) findingQuery = findingQuery.or(`title.ilike.%${keyword}%,detail.ilike.%${keyword}%,opd_name.ilike.%${keyword}%,source_label.ilike.%${keyword}%`)
  findingQuery = sort === 'oldest'
    ? findingQuery.order('finding_date', { ascending: true }).order('id', { ascending: true })
    : findingQuery.order('finding_date', { ascending: false }).order('id', { ascending: false })
  const { data: findings, error: findingError } = await findingQuery
  if (findingError) throw new Error(findingError.message)

  const findingIds = (findings ?? []).map((item) => item.id)
  const { data: documents, error: documentError } = findingIds.length
    ? await supabase.from('opd_finding_documents').select('*').in('finding_id', findingIds).order('created_at')
    : { data: [], error: null }
  if (documentError) throw new Error(documentError.message)

  const documentsByFinding = new Map<number, FindingDocument[]>()
  for (const document of documents ?? []) {
    const list = documentsByFinding.get(document.finding_id) ?? []
    list.push(document)
    documentsByFinding.set(document.finding_id, list)
  }

  const programNames = new Map((programs ?? []).map((program) => [program.id, program.name]))

  return <>
    <section className="knowledge-hero panel compact-knowledge-hero finding-briefing-hero">
      <div>
        <p className="eyebrow">RUANG KERJA TERLINDUNGI</p>
        <h2>Temuan strategis yang cepat dipindai saat briefing dan paparan.</h2>
        <p>Fokus pada inti isu, konteks OPD, keterkaitan program, dan tindak lanjut. Data tetap terlindungi PIN administrator.</p>
      </div>
      <div className="knowledge-hero-stat"><strong>{findings?.length ?? 0}</strong><span>temuan tampil</span></div>
    </section>

    <section className="opd-selector panel finding-toolbar">
      <form method="get" className="opd-selector-form finding-toolbar-form">
        <label className="finding-search-field">Cari<input name="q" defaultValue={keyword} placeholder="Cari judul, isi, OPD, atau sumber..." /></label>
        <label>OPD<select name="opd" defaultValue={selectedOpd}><option value="">Semua OPD</option>{opdNames.map((name) => <option key={name}>{name}</option>)}</select></label>
        <label>Kategori<select name="category" defaultValue={selectedCategory}><option value="">Semua kategori</option>{categories.map((category) => <option key={category}>{category}</option>)}</select></label>
        <label>Urutkan<select name="sort" defaultValue={sort}><option value="latest">Terbaru</option><option value="oldest">Terlama</option></select></label>
        <button className="secondary-button" type="submit">Terapkan</button>
        {(selectedOpd || keyword || selectedCategory || sort === 'oldest') ? <Link className="ghost-button dark" href="/temuan-opd">Reset</Link> : null}
      </form>
      <div className="opd-selector-tools">
        <FindingAddDialog
          today={todayMakassar()}
          selectedOpd={selectedOpd}
          programs={(programs ?? []).map((program) => ({ id: program.id, name: program.name }))}
          opdNames={opdNames}
        />
        <div className="opd-selector-stat"><strong>{selectedOpd ? findings?.length ?? 0 : opdNames.length}</strong><span>{selectedOpd ? 'temuan OPD ini' : 'OPD terdata'}</span></div>
      </div>
    </section>

    <datalist id="opd-options">{opdNames.map((name) => <option value={name} key={name} />)}</datalist>

    <section className="finding-list finding-presentation-list">
        {(findings ?? []).map((finding) => {
          const findingDocuments = documentsByFinding.get(finding.id) ?? []
          return <article className={`finding-card panel finding-brief-card finding-priority-${finding.category.toLowerCase().replaceAll(' ', '-')}`} key={finding.id}>
            <div className="finding-card-head">
              <div><span className={`finding-category finding-${finding.category.toLowerCase().replaceAll(' ', '-')}`}>{finding.category}</span><h2>{finding.title}</h2></div>
              <time>{dateLabel(finding.finding_date)}</time>
            </div>
            <p className="finding-opd"><span>OPD</span>{finding.opd_name}</p>
            {finding.detail ? (finding.detail.length > 300
              ? <details className="finding-detail-expand"><summary>Lihat ringkasan lengkap</summary><p className="finding-detail">{finding.detail}</p></details>
              : <p className="finding-detail">{finding.detail}</p>) : null}
            <div className="finding-meta">
              {finding.berani_program_id ? <span>{programNames.get(finding.berani_program_id) || '9 BERANI'}</span> : null}
              {finding.source_label ? <span>{finding.source_label}</span> : null}
              {finding.source_url ? <a href={finding.source_url} target="_blank" rel="noreferrer">Lihat sumber ↗</a> : null}
              {findingDocuments.length ? <span>{findingDocuments.length} lampiran</span> : null}
            </div>

            {findingDocuments.length ? <div className="finding-document-list">
              {findingDocuments.map((document) => <div className="finding-document-chip" key={document.id}>
                <span className="mini-file-kind">{fileKind(document.file_name)}</span>
                <a href={findingDocumentUrl(document.file_path)} target="_blank" rel="noreferrer">{document.file_name}</a>
                <form action={deleteFindingDocument}><input type="hidden" name="id" value={document.id} /><PendingSubmitButton className="inline-delete" pendingLabel="…">×</PendingSubmitButton></form>
              </div>)}
            </div> : null}

            <div className="finding-actions">
              <details>
                <summary><span>✎</span> Edit & lampiran</summary>
                <form action={updateFinding} className="mini-form finding-edit-form">
                  <input type="hidden" name="id" value={finding.id} />
                  <label>Nama OPD<input name="opd_name" list="opd-options" defaultValue={finding.opd_name} required /></label>
                  <label>Judul<input name="title" defaultValue={finding.title} required /></label>
                  <label>Kategori<select name="category" defaultValue={finding.category}>{categories.map((category) => <option key={category}>{category}</option>)}</select></label>
                  <label>Tanggal<input name="finding_date" type="date" defaultValue={finding.finding_date} required /></label>
                  <label>Detail<textarea name="detail" defaultValue={finding.detail || ''} /></label>
                  <label>9 BERANI<select name="berani_program_id" defaultValue={finding.berani_program_id || ''}><option value="">Tidak terkait khusus</option>{(programs ?? []).map((program) => <option value={program.id} key={program.id}>{program.name}</option>)}</select></label>
                  <label>Sumber<input name="source_label" defaultValue={finding.source_label || ''} /></label>
                  <label>Link<input name="source_url" type="url" defaultValue={finding.source_url || ''} /></label>
                  <DirectUploadField
                    kind="finding-document"
                    name="finding_uploads"
                    label="Tambah lampiran"
                    accept=".pdf,.xlsx,.xls,.docx,.doc,.pptx,.ppt,.csv,.png,.jpg,.jpeg,.webp"
                    multiple
                    maxFiles={10}
                    scope={String(finding.id)}
                    helpText="Lampiran baru diunggah langsung ke Supabase."
                  />
                  <PendingSubmitButton className="secondary-button" pendingLabel="Menyimpan perubahan…">Simpan Perubahan</PendingSubmitButton>
                </form>
              </details>
              <form action={deleteFinding}><input type="hidden" name="id" value={finding.id} /><PendingSubmitButton className="text-danger-button" pendingLabel="Menghapus…">Hapus Temuan</PendingSubmitButton></form>
            </div>
          </article>
        })}
        {(findings ?? []).length === 0 ? <div className="panel empty-document-panel"><p className="eyebrow">BELUM ADA TEMUAN</p><h2>{selectedOpd || 'Belum ada temuan'}</h2><p>Gunakan tombol + di area filter untuk menambahkan catatan pertama. Tidak ada batas satu temuan per OPD.</p></div> : null}
      </section>
    <FeatureNotes featureKey="temuan-opd" returnPath="/temuan-opd" adminMode title="Catatan Temuan OPD" description="Catatan umum, tindak lanjut, dan pengingat untuk temuan lintas OPD." />
  </>
}
