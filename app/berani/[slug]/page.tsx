import Link from 'next/link'
import { notFound } from 'next/navigation'
import { AppShell } from '@/components/app-shell'
import { createBeraniUpdate, deleteBeraniUpdate } from '@/lib/actions/knowledge'
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

function formatCell(column: string, value: Json | undefined) {
  if (value === null || value === undefined || value === '') return '-'
  if (typeof value === 'number') {
    const upper = column.toUpperCase()
    if (upper.includes('PERSEN') || upper.includes('REALISASI') && value >= 0 && value <= 1) {
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
  const { data: rows, error: rowError } = selected
    ? await supabase.from('berani_update_rows').select('row_index,data').eq('update_id', selected.id).order('row_index').limit(5000)
    : { data: [], error: null }
  if (rowError) throw new Error(rowError.message)

  const columns = Array.isArray(selected?.columns) ? selected.columns.filter((item): item is string => typeof item === 'string') : []
  const progressColumn = columns.find((column) => column.toUpperCase().includes('PERSENTASE'))
  const budgetColumn = columns.find((column) => column.toUpperCase().includes('PAGU'))
  const rowRecords = (rows ?? []).map((row) => asRecord(row.data))
  const progressValues = progressColumn ? rowRecords.map((row) => row[progressColumn]).filter((value): value is number => typeof value === 'number') : []
  const completed = progressValues.filter((value) => value >= 1).length
  const running = progressValues.filter((value) => value > 0 && value < 1).length
  const totalBudget = budgetColumn ? rowRecords.reduce((sum, row) => sum + (typeof row[budgetColumn] === 'number' ? row[budgetColumn] as number : 0), 0) : 0
  const missingProgress = progressColumn ? rowRecords.length - progressValues.length : 0
  const fileUrl = documentUrl(selected?.file_path)

  return <AppShell active="/berani" title={program.name}>
    <div className="breadcrumb-line"><Link href="/berani">9 BERANI</Link><span>/</span><strong>{program.name}</strong></div>

    <section className="program-head panel">
      <div><p className="eyebrow">PROGRAM BERANI</p><h2>{program.name}</h2><p>{program.summary}</p></div>
      <div className="program-head-meta"><strong>{updates?.length ?? 0}</strong><span>riwayat update</span></div>
    </section>

    <section className="module-grid knowledge-module-grid">
      <form action={createBeraniUpdate} className="panel form-card">
        <div className="section-heading"><p className="eyebrow">UPDATE DATA</p><h2>Tambah Pembaruan</h2></div>
        <input type="hidden" name="program_id" value={program.id} />
        <input type="hidden" name="program_slug" value={program.slug} />
        <label>Judul Update<input name="title" required placeholder="Contoh: Paket pekerjaan BERANI Lancar September 2026" /></label>
        <label>OPD Sumber<input name="opd_name" placeholder="Nama OPD / unit sumber data" /></label>
        <label>Periode<input name="period_label" placeholder="Contoh: September 2026 / Triwulan III" /></label>
        <label>Ringkasan<textarea name="summary" placeholder="Sorotan singkat dari pembaruan ini" /></label>
        <label>Dokumen Sumber<input name="document_file" type="file" accept=".pdf,.xlsx,.xls,.docx,.doc,application/pdf,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.openxmlformats-officedocument.wordprocessingml.document" /><small className="muted-line">PDF, Excel, atau Word. Maksimum 15 MB. Excel .xlsx akan dibaca otomatis menjadi tabel.</small></label>
        <button className="primary-button" type="submit">Simpan Update</button>
      </form>

      <section className="panel update-history-panel">
        <div className="section-heading"><p className="eyebrow">RIWAYAT</p><h2>Pembaruan {program.name}</h2></div>
        <div className="update-history-list">
          {(updates ?? []).map((update) => <div className={`update-history-item${selected?.id === update.id ? ' active' : ''}`} key={update.id}>
            <Link href={`/berani/${program.slug}?update=${update.id}`} scroll={false}>
              <span>{update.period_label || dateLabel(update.created_at)}</span>
              <strong>{update.title}</strong>
              <small>{update.opd_name || 'Sumber belum dicantumkan'} · {update.row_count} baris</small>
            </Link>
            <form action={deleteBeraniUpdate}>
              <input type="hidden" name="id" value={update.id} /><input type="hidden" name="program_slug" value={program.slug} />
              <button className="text-danger-button" type="submit">Hapus</button>
            </form>
          </div>)}
          {(updates ?? []).length === 0 ? <div className="empty">Belum ada pembaruan untuk program ini.</div> : null}
        </div>
      </section>
    </section>

    {selected ? <>
      <section className="update-summary panel">
        <div className="panel-head"><div><p className="eyebrow">DATA TERPILIH</p><h2>{selected.title}</h2></div>{fileUrl ? <a className="secondary-button" href={fileUrl} target="_blank" rel="noreferrer">Buka Dokumen</a> : null}</div>
        <div className="source-meta-line"><span>{selected.opd_name || 'OPD belum dicantumkan'}</span><span>{selected.period_label || dateLabel(selected.created_at)}</span>{selected.file_name ? <span>{selected.file_name}</span> : null}</div>
        {selected.summary ? <p className="update-summary-copy">{selected.summary}</p> : null}
        {selected.extracted_text && !selected.summary ? <p className="update-summary-copy">{selected.extracted_text.slice(0, 1200)}</p> : null}
      </section>

      <section className="summary-kpis">
        <article><span>Baris Data</span><strong>{selected.row_count}</strong><small>{selected.sheet_name || 'Dokumen pembaruan'}</small></article>
        {progressColumn ? <article><span>Selesai 100%</span><strong>{completed}</strong><small>{running} masih berjalan</small></article> : null}
        {progressColumn ? <article><span>Belum Ada Realisasi</span><strong>{missingProgress}</strong><small>berdasarkan kolom persentase</small></article> : null}
        {budgetColumn ? <article><span>Total Pagu</span><strong className="money-kpi">Rp{new Intl.NumberFormat('id-ID', { notation: 'compact', maximumFractionDigits: 2 }).format(totalBudget)}</strong><small>{budgetColumn}</small></article> : null}
      </section>

      {columns.length && rowRecords.length ? <section className="panel dynamic-data-panel">
        <div className="panel-head"><div><p className="eyebrow">TABEL DATA</p><h2>{selected.sheet_name || 'Data Dokumen'}</h2></div><span className="muted-line">{rowRecords.length} baris ditampilkan</span></div>
        <div className="table-scroll"><table className="data-table dynamic-data-table"><thead><tr>{columns.map((column) => <th key={column}>{column}</th>)}</tr></thead><tbody>
          {rowRecords.map((row, index) => <tr key={index}>{columns.map((column) => <td key={column}>{formatCell(column, row[column])}</td>)}</tr>)}
        </tbody></table></div>
      </section> : <section className="panel empty-document-panel"><p className="eyebrow">DOKUMEN SUMBER</p><h2>{selected.file_name || 'Pembaruan tanpa tabel'}</h2><p>Update ini tersimpan sebagai dokumen/ringkasan. Excel .xlsx yang diunggah pada update berikutnya akan otomatis muncul sebagai tabel dinamis di halaman ini.</p></section>}
    </> : null}
  </AppShell>
}
