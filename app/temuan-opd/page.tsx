import Link from 'next/link'
import { AppShell } from '@/components/app-shell'
import { createFinding, deleteFinding, deleteFindingDocument, updateFinding } from '@/lib/actions/knowledge'
import { SUPABASE_URL } from '@/lib/branding'
import { requireUser } from '@/lib/auth'
import { FeatureNotes } from '@/components/feature-notes'
import type { Database } from '@/lib/database.types'
import { DirectUploadField } from '@/components/direct-upload-field'

type Params = { opd?: string }
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
  const { supabase } = await requireUser('/temuan-opd')

  const [{ data: programs, error: programError }, { data: visits, error: visitError }, { data: updates, error: updateError }] = await Promise.all([
    supabase.from('berani_programs').select('id,name').eq('active', true).order('sort_order'),
    supabase.from('kunjungan').select('nama_opd').order('nama_opd'),
    supabase.from('berani_updates').select('opd_name').not('opd_name', 'is', null).order('opd_name'),
  ])
  if (programError) throw new Error(programError.message)
  if (visitError) throw new Error(visitError.message)
  if (updateError) throw new Error(updateError.message)

  let findingQuery = supabase.from('opd_findings').select('*').order('finding_date', { ascending: false }).order('id', { ascending: false })
  if (selectedOpd) findingQuery = findingQuery.eq('opd_name', selectedOpd)
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

  const opdNames = [...new Set([
    ...(visits ?? []).map((row) => row.nama_opd),
    ...(updates ?? []).map((row) => row.opd_name).filter((name): name is string => Boolean(name)),
    ...(findings ?? []).map((row) => row.opd_name),
  ].map((name) => name.trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'id'))
  const programNames = new Map((programs ?? []).map((program) => [program.id, program.name]))

  return <AppShell active="/temuan-opd" title="Temuan OPD" adminMode>
    <section className="knowledge-hero panel compact-knowledge-hero">
      <div>
        <p className="eyebrow">RUANG KERJA TERLINDUNGI</p>
        <h2>Satu OPD bisa punya banyak temuan, tanpa dibatasi satu catatan.</h2>
        <p>Halaman ini hanya dapat dibuka setelah PIN administrator benar. Setiap OPD dapat memiliki banyak temuan, lampiran, dan keterkaitan dengan 9 BERANI.</p>
      </div>
      <div className="knowledge-hero-stat"><strong>{findings?.length ?? 0}</strong><span>temuan tampil</span></div>
    </section>

    <section className="opd-selector panel">
      <form method="get" className="opd-selector-form">
        <label>Pilih OPD<select name="opd" defaultValue={selectedOpd}><option value="">Semua OPD</option>{opdNames.map((name) => <option key={name}>{name}</option>)}</select></label>
        <button className="secondary-button" type="submit">Tampilkan</button>
        {selectedOpd ? <Link className="secondary-button" href="/temuan-opd">Reset</Link> : null}
      </form>
      <div className="opd-selector-stat"><strong>{selectedOpd ? findings?.length ?? 0 : opdNames.length}</strong><span>{selectedOpd ? 'temuan OPD ini' : 'OPD terdata'}</span></div>
    </section>

    <section className="module-grid finding-module-grid">
      <form action={createFinding} className="panel form-card">
        <div className="section-heading"><p className="eyebrow">TEMUAN BARU</p><h2>Tambah Temuan OPD</h2></div>
        <label>Nama OPD<input name="opd_name" list="opd-options" required defaultValue={selectedOpd} placeholder="Pilih atau ketik nama OPD" /></label>
        <datalist id="opd-options">{opdNames.map((name) => <option value={name} key={name} />)}</datalist>
        <label>Judul Temuan<input name="title" required placeholder="Apa yang menarik/perlu dicatat?" /></label>
        <label>Kategori<select name="category" defaultValue="Temuan">{categories.map((category) => <option key={category}>{category}</option>)}</select></label>
        <label>Tanggal<input name="finding_date" type="date" defaultValue={todayMakassar()} required /></label>
        <label>Detail<textarea name="detail" placeholder="Jelaskan konteks, angka, potensi, atau tindak lanjut." /></label>
        <label>Terkait 9 BERANI<select name="berani_program_id" defaultValue=""><option value="">Tidak terkait khusus</option>{(programs ?? []).map((program) => <option value={program.id} key={program.id}>{program.name}</option>)}</select></label>
        <label>Nama Sumber<input name="source_label" placeholder="Contoh: Kunjungan OPD / Paparan Kadis" /></label>
        <label>Link Sumber<input name="source_url" type="url" placeholder="https://..." /></label>
        <DirectUploadField
          kind="finding-document"
          name="finding_uploads"
          label="Lampiran"
          accept=".pdf,.xlsx,.xls,.docx,.doc,.pptx,.ppt,.csv,.png,.jpg,.jpeg,.webp"
          multiple
          maxFiles={10}
          helpText="Bisa pilih hingga 10 file, maksimal 20 MB per file. File diunggah langsung ke Supabase agar tidak mentok batas request Vercel."
        />
        <button className="primary-button" type="submit">Simpan Temuan</button>
      </form>

      <section className="finding-list">
        {(findings ?? []).map((finding) => {
          const findingDocuments = documentsByFinding.get(finding.id) ?? []
          return <article className="finding-card panel" key={finding.id}>
            <div className="finding-card-head">
              <div><span className={`finding-category finding-${finding.category.toLowerCase().replaceAll(' ', '-')}`}>{finding.category}</span><h2>{finding.title}</h2></div>
              <time>{dateLabel(finding.finding_date)}</time>
            </div>
            <p className="finding-opd">{finding.opd_name}</p>
            {finding.detail ? <p className="finding-detail">{finding.detail}</p> : null}
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
                <form action={deleteFindingDocument}><input type="hidden" name="id" value={document.id} /><button className="inline-delete" type="submit">×</button></form>
              </div>)}
            </div> : null}

            <div className="finding-actions">
              <details>
                <summary>Edit / tambah lampiran</summary>
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
                  <button className="secondary-button" type="submit">Simpan Perubahan</button>
                </form>
              </details>
              <form action={deleteFinding}><input type="hidden" name="id" value={finding.id} /><button className="text-danger-button" type="submit">Hapus Temuan</button></form>
            </div>
          </article>
        })}
        {(findings ?? []).length === 0 ? <div className="panel empty-document-panel"><p className="eyebrow">BELUM ADA TEMUAN</p><h2>{selectedOpd || 'OPD belum dipilih'}</h2><p>Tambahkan catatan pertama melalui formulir di samping. Tidak ada batas satu temuan per OPD.</p></div> : null}
      </section>
    </section>
    <FeatureNotes featureKey="temuan-opd" returnPath="/temuan-opd" adminMode title="Catatan Temuan OPD" description="Catatan umum, tindak lanjut, dan pengingat untuk temuan lintas OPD." />
  </AppShell>
}
