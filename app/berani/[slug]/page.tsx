import Link from 'next/link'
import { notFound } from 'next/navigation'
import { AppShell } from '@/components/app-shell'
import { addBeraniDocuments, createBeraniUpdate, deleteBeraniDocument, deleteBeraniUpdate } from '@/lib/actions/knowledge'
import { SUPABASE_URL } from '@/lib/branding'
import { createClient } from '@/lib/supabase/server'
import type { Json } from '@/lib/database.types'

type PageProps = {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ update?: string }>
}

function documentUrl(path?: string | null) {
  return path ? `${SUPABASE_URL}/storage/v1/object/public/berani-documents/${encodeURI(path)}` : null
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

function fileKind(name: string) {
  const ext = name.split('.').pop()?.toUpperCase()
  return ext || 'FILE'
}

export default async function BeraniDetailPage({ params, searchParams }: PageProps) {
  const { slug } = await params
  const query = await searchParams
  const supabase = await createClient(null)

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

  const { data: documents, error: documentError } = selected
    ? await supabase.from('berani_update_documents').select('*').eq('update_id', selected.id).order('created_at')
    : { data: [], error: null }
  if (documentError) throw new Error(documentError.message)

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
  const allDataRecords = documentIds.length
    ? [...rowsByDocument.values()].flat()
    : legacyRecords
  const metricColumns = documentIds.length
    ? [...new Set((documents ?? []).flatMap((doc) => stringColumns(doc.columns)))]
    : legacyColumns
  const progressColumn = metricColumns.find((column) => column.toUpperCase().includes('PERSENTASE'))
  const budgetColumn = metricColumns.find((column) => column.toUpperCase().includes('PAGU'))
  const progressValues = progressColumn
    ? allDataRecords.map((row) => row[progressColumn]).filter((value): value is number => typeof value === 'number')
    : []
  const completed = progressValues.filter((value) => value >= 1).length
  const running = progressValues.filter((value) => value > 0 && value < 1).length
  const missingProgress = progressColumn ? allDataRecords.length - progressValues.length : 0
  const totalBudget = budgetColumn
    ? allDataRecords.reduce((sum, row) => sum + (typeof row[budgetColumn] === 'number' ? row[budgetColumn] as number : 0), 0)
    : 0

  return <AppShell active="/berani" title={program.name}>
    <div className="breadcrumb-line"><Link href="/berani">9 BERANI</Link><span>/</span><strong>{program.name}</strong></div>

    <section className="program-head panel">
      <div>
        <p className="eyebrow">PROGRAM BERANI</p>
        <h2>{program.name}</h2>
        <p>{program.summary}</p>
      </div>
      <div className="program-head-meta"><strong>{updates?.length ?? 0}</strong><span>update tersimpan</span></div>
    </section>

    <section className="module-grid knowledge-module-grid">
      <form action={createBeraniUpdate} className="panel form-card">
        <div className="section-heading"><p className="eyebrow">UPDATE DATA</p><h2>Tambah Pembaruan</h2></div>
        <input type="hidden" name="program_id" value={program.id} />
        <input type="hidden" name="program_slug" value={program.slug} />
        <label>Judul Update<input name="title" required placeholder="Contoh: Data BERANI Sehat September 2026" /></label>
        <label>OPD Sumber<input name="opd_name" placeholder="Satu OPD boleh punya banyak update" /></label>
        <label>Periode<input name="period_label" placeholder="Contoh: September 2026 / Triwulan III" /></label>
        <label>Ringkasan<textarea name="summary" placeholder="Sorotan utama dari pembaruan ini" /></label>
        <label>Dokumen Sumber
          <input name="document_files" type="file" multiple accept=".pdf,.xlsx,.xls,.docx,.doc,application/pdf,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.openxmlformats-officedocument.wordprocessingml.document" />
          <small className="muted-line">Bisa pilih hingga 10 PDF, Excel, atau Word sekaligus. Setiap file maksimal 15 MB. Excel .xlsx dibaca otomatis menjadi tabel.</small>
        </label>
        <button className="primary-button" type="submit">Simpan Update</button>
      </form>

      <section className="panel update-history-panel">
        <div className="section-heading"><p className="eyebrow">RIWAYAT</p><h2>Pembaruan {program.name}</h2></div>
        <div className="update-history-list">
          {(updates ?? []).map((update) => <div className={`update-history-item${selected?.id === update.id ? ' active' : ''}`} key={update.id}>
            <Link href={`/berani/${program.slug}?update=${update.id}`} scroll={false}>
              <span>{update.period_label || dateLabel(update.created_at)}</span>
              <strong>{update.title}</strong>
              <small>{update.opd_name || 'Sumber belum dicantumkan'} · {update.row_count || 0} baris data</small>
            </Link>
            <form action={deleteBeraniUpdate}>
              <input type="hidden" name="id" value={update.id} />
              <input type="hidden" name="program_slug" value={program.slug} />
              <button className="text-danger-button" type="submit">Hapus</button>
            </form>
          </div>)}
          {(updates ?? []).length === 0 ? <div className="empty">Belum ada pembaruan untuk program ini.</div> : null}
        </div>
      </section>
    </section>

    {selected ? <>
      <section className="update-summary panel">
        <div className="panel-head">
          <div><p className="eyebrow">DATA TERPILIH</p><h2>{selected.title}</h2></div>
          <span className="document-count-badge">{documents?.length || (selected.file_path ? 1 : 0)} dokumen</span>
        </div>
        <div className="source-meta-line">
          <span>{selected.opd_name || 'OPD belum dicantumkan'}</span>
          <span>{selected.period_label || dateLabel(selected.created_at)}</span>
          <span>Diperbarui {dateLabel(selected.updated_at)}</span>
        </div>
        {selected.summary ? <p className="update-summary-copy">{selected.summary}</p> : null}
      </section>

      <section className="panel multi-doc-panel">
        <div className="panel-head">
          <div><p className="eyebrow">DOKUMEN SUMBER</p><h2>Semua lampiran update</h2></div>
          <span className="muted-line">Satu update dapat menyimpan banyak dokumen.</span>
        </div>

        <div className="document-gallery">
          {(documents ?? []).map((doc) => <article className="document-card" key={doc.id}>
            <div className="document-icon">{fileKind(doc.file_name)}</div>
            <div className="document-card-copy">
              <strong>{doc.file_name}</strong>
              <span>{doc.row_count ? `${doc.row_count} baris data` : doc.extracted_text ? 'Teks berhasil dibaca' : 'Dokumen sumber'}</span>
            </div>
            <div className="document-card-actions">
              <a href={documentUrl(doc.file_path) || '#'} target="_blank" rel="noreferrer">Buka ↗</a>
              <form action={deleteBeraniDocument}>
                <input type="hidden" name="id" value={doc.id} />
                <input type="hidden" name="update_id" value={selected.id} />
                <input type="hidden" name="program_slug" value={program.slug} />
                <button className="inline-delete" type="submit">hapus</button>
              </form>
            </div>
          </article>)}
          {selected.file_path ? <article className="document-card">
            <div className="document-icon">{fileKind(selected.file_name || 'FILE')}</div>
            <div className="document-card-copy"><strong>{selected.file_name || 'Dokumen lama'}</strong><span>Dokumen dari versi sebelumnya</span></div>
            <a href={documentUrl(selected.file_path) || '#'} target="_blank" rel="noreferrer">Buka ↗</a>
          </article> : null}
          {!documents?.length && !selected.file_path ? <div className="empty">Belum ada lampiran untuk update ini.</div> : null}
        </div>

        <details className="append-documents">
          <summary>+ Tambah dokumen ke update ini</summary>
          <form action={addBeraniDocuments} className="notulensi-add-form">
            <input type="hidden" name="update_id" value={selected.id} />
            <input type="hidden" name="program_slug" value={program.slug} />
            <input name="document_files" type="file" multiple accept=".pdf,.xlsx,.xls,.docx,.doc" required />
            <small className="muted-line">Pilih sampai 10 file sekaligus. File baru akan ditambahkan tanpa menghapus dokumen sebelumnya.</small>
            <button className="secondary-button" type="submit">Tambahkan Dokumen</button>
          </form>
        </details>
      </section>

      {allDataRecords.length ? <section className="summary-kpis">
        <article><span>Total Baris Data</span><strong>{allDataRecords.length}</strong><small>dari seluruh Excel update</small></article>
        {progressColumn ? <article><span>Selesai 100%</span><strong>{completed}</strong><small>{running} masih berjalan</small></article> : null}
        {progressColumn ? <article><span>Belum Ada Realisasi</span><strong>{missingProgress}</strong><small>berdasarkan kolom persentase</small></article> : null}
        {budgetColumn ? <article><span>Total Pagu</span><strong className="money-kpi">Rp{new Intl.NumberFormat('id-ID', { notation: 'compact', maximumFractionDigits: 2 }).format(totalBudget)}</strong><small>{budgetColumn}</small></article> : null}
      </section> : null}

      {(documents ?? []).map((doc) => {
        const columns = stringColumns(doc.columns)
        const records = rowsByDocument.get(doc.id) ?? []
        if (columns.length && records.length) return <section className="panel dynamic-data-panel" key={`table-${doc.id}`}>
          <div className="panel-head"><div><p className="eyebrow">DATA EXCEL</p><h2>{doc.file_name}</h2></div><span className="muted-line">{records.length} baris · {doc.sheet_name || 'sheet utama'}</span></div>
          <div className="table-scroll"><table className="data-table dynamic-data-table"><thead><tr>{columns.map((column) => <th key={column}>{column}</th>)}</tr></thead><tbody>
            {records.map((row, index) => <tr key={index}>{columns.map((column) => <td key={column}>{formatCell(column, row[column])}</td>)}</tr>)}
          </tbody></table></div>
        </section>
        if (doc.extracted_text) return <section className="panel document-text-panel" key={`text-${doc.id}`}>
          <p className="eyebrow">RINGKASAN DOKUMEN WORD</p><h2>{doc.file_name}</h2><p>{doc.extracted_text.slice(0, 3000)}</p>
        </section>
        return null
      })}

      {!documentIds.length && legacyColumns.length && legacyRecords.length ? <section className="panel dynamic-data-panel">
        <div className="panel-head"><div><p className="eyebrow">TABEL DATA</p><h2>{selected.sheet_name || 'Data Dokumen'}</h2></div><span className="muted-line">{legacyRecords.length} baris ditampilkan</span></div>
        <div className="table-scroll"><table className="data-table dynamic-data-table"><thead><tr>{legacyColumns.map((column) => <th key={column}>{column}</th>)}</tr></thead><tbody>
          {legacyRecords.map((row, index) => <tr key={index}>{legacyColumns.map((column) => <td key={column}>{formatCell(column, row[column])}</td>)}</tr>)}
        </tbody></table></div>
      </section> : null}
    </> : null}
  </AppShell>
}
