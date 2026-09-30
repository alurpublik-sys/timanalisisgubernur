import Link from 'next/link'
import { notFound } from 'next/navigation'
import { AppShell } from '@/components/app-shell'
import { ProcessedBeraniSection } from '@/components/processed-berani-section'
import { BeraniSmartUpload } from '@/components/berani-smart-upload'
import { addBeraniDocuments, createBeraniUpdate, deleteBeraniDocument, deleteBeraniUpdate } from '@/lib/actions/knowledge'
import { SUPABASE_URL } from '@/lib/branding'
import { getAuthContext } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import type { Json } from '@/lib/database.types'
import { FeatureNotes } from '@/components/feature-notes'

type PageProps = {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ update?: string }>
}

function documentUrl(path?: string | null) {
  if (!path) return null
  if (/^https?:\/\//i.test(path)) return path
  if (path.startsWith('/')) return path
  return `${SUPABASE_URL}/storage/v1/object/public/berani-documents/${encodeURI(path)}`
}

function dateLabel(value?: string | null) {
  if (!value) return '-'
  return new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium', timeZone: 'Asia/Makassar' }).format(new Date(value))
}

function asRecord(value: Json): Record<string, Json> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, Json> : {}
}

function stringColumns(value: Json) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : []
}

function formatCell(column: string, value: Json | undefined) {
  if (value === null || value === undefined || value === '') return '-'
  if (typeof value === 'number') {
    const upper = column.toUpperCase()
    if ((upper.includes('PERSEN') || upper.includes('REALISASI')) && value >= 0 && value <= 1) {
      return `${new Intl.NumberFormat('id-ID', { maximumFractionDigits: 2 }).format(value * 100)}%`
    }
    if (upper.includes('PAGU') || upper.includes('ANGGARAN') || upper.includes('KONTRAK') || upper.includes('NILAI')) {
      return `Rp${new Intl.NumberFormat('id-ID', { maximumFractionDigits: 0 }).format(value)}`
    }
    return new Intl.NumberFormat('id-ID', { maximumFractionDigits: 4 }).format(value)
  }
  if (typeof value === 'boolean') return value ? 'Ya' : 'Tidak'
  if (typeof value === 'object') return JSON.stringify(value)
  return String(value)
}

function fileKind(name: string, kind?: string | null) {
  const rawKind = (kind || '').toLowerCase()
  const extension = (name.split('.').pop() || '').toLowerCase()
  const values = [rawKind, extension].filter(Boolean)
  if (values.some((raw) => raw.includes('present') || raw === 'ppt' || raw === 'pptx' || raw === 'powerpoint')) return 'PPT'
  if (values.some((raw) => raw.includes('excel') || raw === 'xls' || raw === 'xlsx')) return 'XLS'
  if (values.some((raw) => raw.includes('word') || raw === 'doc' || raw === 'docx')) return 'DOC'
  if (values.some((raw) => raw.includes('image') || ['png','jpg','jpeg','webp'].includes(raw))) return 'IMG'
  if (values.includes('csv')) return 'CSV'
  if (values.includes('pdf')) return 'PDF'
  return (extension || rawKind || 'file').slice(0, 4).toUpperCase()
}

function fileTypeLabel(name: string, kind?: string | null) {
  const code = fileKind(name, kind)
  return ({ PPT: 'Presentasi', XLS: 'Spreadsheet', DOC: 'Dokumen', IMG: 'Gambar', CSV: 'Data CSV', PDF: 'PDF' } as Record<string, string>)[code] || 'Dokumen'
}

function mobileTitle(columns: string[], row: Record<string, Json>, index: number) {
  const preferred = columns.find((column) => /nama|judul|paket|program/i.test(column)) || columns[0]
  const value = preferred ? formatCell(preferred, row[preferred]) : ''
  return value && value !== '-' ? value : `Data ${index + 1}`
}

function DataTable({ columns, records, title, subtitle }: { columns: string[]; records: Record<string, Json>[]; title: string; subtitle?: string }) {
  if (!columns.length || !records.length) return null
  return <section className="panel dynamic-data-panel">
    <div className="panel-head">
      <div><p className="eyebrow">DATA TERSTRUKTUR</p><h2>{title}</h2></div>
      <span className="muted-line">{records.length} baris{subtitle ? ` · ${subtitle}` : ''}</span>
    </div>
    <div className="table-mobile-hint">Mode ponsel: data ditampilkan sebagai kartu agar lebih mudah dibaca.</div>
    <div className="responsive-data-wrap">
      <table className="data-table dynamic-data-table">
        <thead><tr>{columns.map((column) => <th key={column}>{column}</th>)}</tr></thead>
        <tbody>{records.map((row, index) => <tr key={index}>{columns.map((column) => <td key={column}>{formatCell(column, row[column])}</td>)}</tr>)}</tbody>
      </table>
    </div>
    <div className="mobile-data-cards">
      {records.map((row, index) => <article className="mobile-data-card" key={index}>
        <h3>{mobileTitle(columns, row, index)}</h3>
        <dl>{columns.map((column) => <div key={column}><dt>{column}</dt><dd>{formatCell(column, row[column])}</dd></div>)}</dl>
      </article>)}
    </div>
  </section>
}

export default async function BeraniDetailPage({ params, searchParams }: PageProps) {
  const { slug } = await params
  const query = await searchParams
  const [{ user }, supabase] = await Promise.all([getAuthContext(), createClient(null)])
  const adminMode = Boolean(user)

  const { data: program, error: programError } = await supabase.from('berani_programs').select('*').eq('slug', slug).single()
  if (programError || !program) notFound()

  const { data: updates, error: updateError } = await supabase
    .from('berani_updates')
    .select('*')
    .eq('program_id', program.id)
    .order('created_at', { ascending: false })
  if (updateError) throw new Error(updateError.message)

  const requestedId = Number(query.update || 0)
  const selected = (updates ?? []).find((item) => item.id === requestedId) ?? updates?.[0] ?? null

  const [{ data: documents, error: documentError }, { data: sections, error: sectionError }] = selected
    ? await Promise.all([
        supabase.from('berani_update_documents').select('*').eq('update_id', selected.id).order('created_at'),
        supabase.from('berani_update_sections').select('*').eq('update_id', selected.id).order('sort_order').order('id'),
      ])
    : [{ data: [], error: null }, { data: [], error: null }]

  if (documentError) throw new Error(documentError.message)
  if (sectionError) throw new Error(sectionError.message)

  const documentIds = (documents ?? []).map((item) => item.id)
  const { data: documentRows, error: documentRowsError } = documentIds.length
    ? await supabase.from('berani_document_rows').select('document_id,row_index,data').in('document_id', documentIds).order('row_index')
    : { data: [], error: null }
  if (documentRowsError) throw new Error(documentRowsError.message)

  const { data: legacyRows, error: legacyError } = selected && !documentIds.length
    ? await supabase.from('berani_update_rows').select('row_index,data').eq('update_id', selected.id).order('row_index').limit(5000)
    : { data: [], error: null }
  if (legacyError) throw new Error(legacyError.message)

  const rowsByDocument = new Map<number, Record<string, Json>[]>()
  for (const row of documentRows ?? []) {
    const values = rowsByDocument.get(row.document_id) ?? []
    values.push(asRecord(row.data))
    rowsByDocument.set(row.document_id, values)
  }

  const legacyColumns = selected ? stringColumns(selected.columns) : []
  const legacyRecords = (legacyRows ?? []).map((row) => asRecord(row.data))

  return <AppShell active="/berani" title={program.name} adminMode={adminMode} editReturnTo={`/berani/${program.slug}`}>
    <div className="breadcrumb-line"><Link href="/berani">9 BERANI</Link><span>/</span><strong>{program.name}</strong></div>

    <section className="program-head panel berani-program-head">
      <div>
        <p className="eyebrow">PROGRAM UNGGULAN</p>
        <h2>{program.name}</h2>
        <p>{program.summary}</p><div className="berani-live-note"><span>DATA AKTIF</span><strong>Dokumen baru diproses dan digabung ke basis data program, bukan mengganti seluruh riwayat.</strong></div>
      </div>
      <div className="program-head-meta"><strong>{updates?.length ?? 0}</strong><span>update tersimpan</span></div>
    </section>

    <section className={`module-grid knowledge-module-grid${adminMode ? '' : ' berani-readonly-grid'}`}>
      {adminMode ? <form action={createBeraniUpdate} className="panel form-card">
        <div className="section-heading"><p className="eyebrow">UPDATE DATA</p><h2>Tambah Pembaruan</h2></div>
        <input type="hidden" name="program_id" value={program.id} />
        <input type="hidden" name="program_slug" value={program.slug} />
        <label>Judul Update<input name="title" required placeholder={`Contoh: Data ${program.name} September 2026`} /></label>
        <label>OPD Sumber<input name="opd_name" placeholder="Satu OPD boleh memiliki banyak update" /></label>
        <label>Periode<input name="period_label" placeholder="Contoh: September 2026 / Triwulan III" /></label>
        <label>Ringkasan<textarea name="summary" placeholder="Opsional. Data utama akan dibaca dari dokumen sumber dan digabung dengan data yang sudah ada." /></label>
        <BeraniSmartUpload scope={program.slug} buttonLabel="Simpan & Olah Update" helpText="Maksimum 10 file dan 20 MB per file. File diunggah langsung ke Supabase; PDF visual/scan tetap dibaca dengan OCR." />
      </form> : null}

      <section className="panel update-history-panel">
        <div className="section-heading"><p className="eyebrow">RIWAYAT UPDATE</p><h2>{program.name}</h2></div>
        <div className="update-history-list">
          {(updates ?? []).map((update) => <div className={`update-history-item${selected?.id === update.id ? ' active' : ''}`} key={update.id}>
            <Link href={`/berani/${program.slug}?update=${update.id}`} scroll={false}>
              <span>{update.period_label || dateLabel(update.created_at)}</span>
              <strong>{update.title}</strong>
              <small>{update.opd_name || 'Sumber belum dicantumkan'} · {update.row_count || 0} data terstruktur</small>
            </Link>
            {adminMode ? <form action={deleteBeraniUpdate}>
              <input type="hidden" name="id" value={update.id} />
              <input type="hidden" name="program_slug" value={program.slug} />
              <button className="icon-delete-button" type="submit" aria-label="Hapus update" title="Hapus update">×</button>
            </form> : null}
          </div>)}
          {(updates ?? []).length === 0 ? <div className="empty">Belum ada pembaruan untuk program ini.</div> : null}
        </div>
      </section>
    </section>

    {selected ? <>
      <section className="update-summary panel">
        <div className="panel-head">
          <div><p className="eyebrow">UPDATE TERPILIH</p><h2>{selected.title}</h2></div>
          <span className="document-count-badge">{documents?.length || (selected.file_path ? 1 : 0)} sumber</span>
        </div>
        <div className="source-meta-line">
          <span>{selected.opd_name || 'OPD belum dicantumkan'}</span>
          <span>{selected.period_label || dateLabel(selected.created_at)}</span>
          <span>Diperbarui {dateLabel(selected.updated_at)}</span><span className="source-freshness-badge">Basis data aktif</span>
        </div>
        {selected.summary ? <p className="update-summary-copy">{selected.summary}</p> : null}
      </section>

      {!documents?.length && !sections?.length && !legacyRecords.length && !selected.file_path ? (
        <section className="panel berani-processing-empty">
          <div className="berani-processing-empty-icon" aria-hidden>!</div>
          <div>
            <p className="eyebrow">SUMBER BELUM TEROLAH</p>
            <h2>Update ini belum memiliki dokumen yang berhasil diproses.</h2>
            <p>Judul update sudah tersimpan, tetapi belum ada file permanen, data terstruktur, atau hasil ekstraksi yang bisa divisualisasikan.</p>
            {adminMode
              ? <a className="secondary-button" href="#berani-add-source">Unggah ulang sumber</a>
              : <Link className="secondary-button" href={`/login?next=${encodeURIComponent(`/berani/${program.slug}?update=${selected.id}`)}`}>Masuk untuk memperbaiki</Link>}
          </div>
        </section>
      ) : null}

      {(sections ?? []).map((section) => <ProcessedBeraniSection key={section.id} title={section.title} type={section.section_type} payload={section.payload} />)}

      {(documents ?? []).map((doc) => {
        const columns = stringColumns(doc.columns)
        const records = rowsByDocument.get(doc.id) ?? []
        return columns.length && records.length
          ? <DataTable key={`table-${doc.id}`} columns={columns} records={records} title={doc.display_title || doc.file_name} subtitle={doc.sheet_name || undefined} />
          : null
      })}

      {!documentIds.length && legacyColumns.length && legacyRecords.length
        ? <DataTable columns={legacyColumns} records={legacyRecords} title={selected.sheet_name || selected.file_name || 'Data Dokumen'} />
        : null}

      <section className="panel source-documents-panel">
        <div className="panel-head">
          <div><p className="eyebrow">SUMBER DATA</p><h2>Dokumen pendukung</h2></div>
          <span className="muted-line">Dokumen disimpan sebagai sumber; informasi utama disajikan dalam panel di atas.</span>
        </div>

        <div className="document-gallery">
          {(documents ?? []).map((doc) => {
            const url = documentUrl(doc.file_path)
            const isImage = Boolean(doc.mime_type?.startsWith('image/'))
            const kindCode = fileKind(doc.file_name, doc.document_kind)
            return <article className="document-card processed-source" key={doc.id}>
              <div className="document-card-main">
                <div className={`document-icon document-icon-${kindCode.toLowerCase()}`}>{kindCode}</div>
                <div className="document-card-copy">
                  <div className="document-card-kicker">
                    <span className="doc-kind">{fileTypeLabel(doc.file_name, doc.document_kind)}</span>
                    <span className="doc-processed">Terolah</span>
                  </div>
                  <strong title={doc.display_title || doc.file_name}>{doc.display_title || doc.file_name}</strong>
                  <span>{doc.row_count ? `${doc.row_count} baris data terstruktur` : doc.extracted_text ? 'Isi dokumen berhasil dibaca sistem' : 'Sumber data tersimpan'}</span>
                  {doc.summary ? <p>{doc.summary.slice(0, 190)}</p> : null}
                </div>
              </div>
              {isImage && url ? <img src={url} alt="" className="image-document-preview" /> : null}
              <div className="document-card-actions">
                {url ? <a className="document-open-action" href={url} target="_blank" rel="noreferrer"><span>Buka sumber</span><b>↗</b></a> : <span className="document-source-state">Sumber unggahan awal</span>}
                {adminMode ? <form action={deleteBeraniDocument}>
                  <input type="hidden" name="id" value={doc.id} />
                  <input type="hidden" name="update_id" value={selected.id} />
                  <input type="hidden" name="program_slug" value={program.slug} />
                  <button className="icon-delete-button compact" type="submit" aria-label="Hapus dokumen" title="Hapus dokumen">×</button>
                </form> : null}
              </div>
            </article>
          })}
          {selected.file_path ? <article className="document-card processed-source legacy-source-card">
            <div className="document-card-main">
              <div className="document-icon">{fileKind(selected.file_name || 'FILE')}</div>
              <div className="document-card-copy">
                <div className="document-card-kicker"><span className="doc-kind">Dokumen lama</span></div>
                <strong>{selected.file_name || 'Dokumen lama'}</strong>
                <span>Sumber dari versi sebelumnya</span>
              </div>
            </div>
            <div className="document-card-actions"><a className="document-open-action" href={documentUrl(selected.file_path) || '#'} target="_blank" rel="noreferrer"><span>Buka sumber</span><b>↗</b></a></div>
          </article> : null}
          {!documents?.length && !selected.file_path ? <div className="empty">Belum ada dokumen sumber untuk update ini.</div> : null}
        </div>

        {adminMode ? <details className="append-documents" id="berani-add-source">
          <summary>+ Tambah sumber ke update ini</summary>
          <form action={addBeraniDocuments} className="notulensi-add-form">
            <input type="hidden" name="update_id" value={selected.id} />
            <input type="hidden" name="program_slug" value={program.slug} />
            <BeraniSmartUpload required scope={`${program.slug}-${selected.id}`} buttonLabel="Tambahkan & Olah" buttonClassName="secondary-button" helpText="Sumber lama tetap tersimpan. Dokumen baru diunggah langsung ke Supabase lalu diolah dan digabung ke data aktif." />
          </form>
        </details> : <div className="readonly-edit-note"><span>Data hanya dapat diubah dalam mode edit.</span><Link href={`/login?next=${encodeURIComponent(`/berani/${program.slug}`)}`}>✎</Link></div>}
      </section>
    </> : null}
    <FeatureNotes featureKey="berani" entityKey={selected ? `${program.slug}:${selected.id}` : program.slug} returnPath={`/berani/${program.slug}${selected ? `?update=${selected.id}` : ''}`} adminMode={adminMode} title={`Catatan ${program.name}`} description="Catatan khusus untuk program/update yang sedang dibuka." />
  </AppShell>
}
