import Link from 'next/link'
import { notFound } from 'next/navigation'
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
  searchParams: Promise<{ update?: string; doc?: string; dataPage?: string }>
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

  const { data: opdMaster, error: opdError } = await supabase
    .from('opd_master')
    .select('display_name')
    .eq('active', true)
    .order('sort_order')
  if (opdError) throw new Error(opdError.message)
  const opdNames = (opdMaster ?? []).map((item) => item.display_name)

  const {data:updates,error:updateError}=await supabase
    .from('berani_updates')
    .select('id,title,opd_name,period_label,row_count,created_at,updated_at')
    .eq('program_id',program.id)
    .order('created_at',{ascending:false})
    .limit(200)
  if(updateError)throw new Error(updateError.message)

  const requestedId=Number(query.update||0)
  const selectedId=(updates??[]).some((item)=>item.id===requestedId)?requestedId:(updates?.[0]?.id??null)
  const {data:selected,error:selectedError}=selectedId
    ? await supabase.from('berani_updates').select('*').eq('id',selectedId).eq('program_id',program.id).single()
    : {data:null,error:null}
  if(selectedError)throw new Error(selectedError.message)

  const [{data:documents,error:documentError},{data:sections,error:sectionError}]=selected
    ? await Promise.all([
      supabase.from('berani_update_documents').select('*').eq('update_id',selected.id).order('created_at'),
      supabase.from('berani_update_sections').select('*').eq('update_id',selected.id).order('sort_order').order('id'),
    ])
    : [{data:[],error:null},{data:[],error:null}]
  if(documentError)throw new Error(documentError.message)
  if(sectionError)throw new Error(sectionError.message)

  const requestedDocId=Number(query.doc||0)
  const activeDocument=(documents??[]).find((item)=>item.id===requestedDocId)??(documents??[]).find((item)=>item.row_count>0)??documents?.[0]??null
  const dataPage=Math.max(1,Number(query.dataPage)||1)
  const DATA_PAGE_SIZE=200
  const dataFrom=(dataPage-1)*DATA_PAGE_SIZE
  const dataTo=dataFrom+DATA_PAGE_SIZE-1

  const [{data:documentRows,count:documentRowsCount,error:documentRowsError},{data:legacyRows,count:legacyRowsCount,error:legacyError}]=await Promise.all([
    selected&&activeDocument
      ? supabase.from('berani_document_rows').select('row_index,data',{count:'exact'}).eq('document_id',activeDocument.id).order('row_index').range(dataFrom,dataTo)
      : Promise.resolve({data:[],count:0,error:null}),
    selected&&!(documents??[]).length
      ? supabase.from('berani_update_rows').select('row_index,data',{count:'exact'}).eq('update_id',selected.id).order('row_index').range(dataFrom,dataTo)
      : Promise.resolve({data:[],count:0,error:null}),
  ])
  if(documentRowsError)throw new Error(documentRowsError.message)
  if(legacyError)throw new Error(legacyError.message)

  const rawColumns=activeDocument?stringColumns(activeDocument.columns):selected?stringColumns(selected.columns):[]
  const rawRecords=((activeDocument?documentRows:legacyRows)??[]).map((row)=>asRecord(row.data))
  const rawTotal=activeDocument?(documentRowsCount??0):(legacyRowsCount??0)
  const rawPages=Math.max(1,Math.ceil(rawTotal/DATA_PAGE_SIZE))

  return <>
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
        <label>OPD Sumber<input name="opd_name" list="berani-opd-options" placeholder="Pilih atau ketik OPD sumber" /><datalist id="berani-opd-options">{opdNames.map((name) => <option value={name} key={name} />)}</datalist></label>
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

      {!documents?.length && !sections?.length && rawTotal===0 && !selected.file_path ? (
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

      {rawColumns.length&&rawRecords.length?<>
        <section className="panel berani-raw-toolbar">
          <div><p className="eyebrow">DATA MENTAH TERSTRUKTUR</p><h2>{activeDocument?.display_title||activeDocument?.file_name||selected.sheet_name||selected.file_name||'Data Dokumen'}</h2><span>{rawTotal} baris · maksimum {DATA_PAGE_SIZE} baris per halaman</span></div>
          {(documents??[]).filter((doc)=>doc.row_count>0).length>1?<div className="berani-document-tabs">{(documents??[]).filter((doc)=>doc.row_count>0).map((doc)=><Link className={activeDocument?.id===doc.id?'active':''} href={`/berani/${program.slug}?update=${selected.id}&doc=${doc.id}`} key={doc.id}>{doc.display_title||doc.file_name}</Link>)}</div>:null}
        </section>
        <DataTable columns={rawColumns} records={rawRecords} title={activeDocument?.display_title||activeDocument?.file_name||selected.sheet_name||selected.file_name||'Data Dokumen'} subtitle={activeDocument?.sheet_name||selected.sheet_name||undefined}/>
        {rawPages>1?<div className="data-pagination panel"><span>Halaman {Math.min(dataPage,rawPages)} dari {rawPages}</span><div>{dataPage>1?<Link className="secondary-button" href={`/berani/${program.slug}?update=${selected.id}${activeDocument?`&doc=${activeDocument.id}`:''}&dataPage=${dataPage-1}`}>Sebelumnya</Link>:null}{dataPage<rawPages?<Link className="secondary-button" href={`/berani/${program.slug}?update=${selected.id}${activeDocument?`&doc=${activeDocument.id}`:''}&dataPage=${dataPage+1}`}>Berikutnya</Link>:null}</div></div>:null}
      </>:null}

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
                {url?<a className="document-open-action" href={url} target="_blank" rel="noreferrer"><span>Buka sumber</span><b>↗</b></a>:<span className="document-source-state">Sumber unggahan awal</span>}{doc.row_count>0?<Link className="document-data-action" href={`/berani/${program.slug}?update=${selected.id}&doc=${doc.id}`}>Lihat data</Link>:null}
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
  </>
}
