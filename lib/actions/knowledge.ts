'use server'

import { revalidatePath } from 'next/cache'
import { importDocument } from '@/lib/document-import'
import { createClient } from '@/lib/supabase/server'

const BERANI_BUCKET = 'berani-documents'
const FINDING_BUCKET = 'finding-documents'
const NOTULENSI_BUCKET = 'kunjungan-notulensi'
const MAX_DOCUMENT_BYTES = 15 * 1024 * 1024
const MAX_PDF_BYTES = 10 * 1024 * 1024
const MAX_FILES_PER_SUBMISSION = 10
const FINDING_CATEGORIES = ['Temuan', 'Positif', 'Perlu Perhatian', 'Potensi', 'Tindak Lanjut'] as const
const ALLOWED_EXTENSIONS = new Set(['pdf', 'xlsx', 'xls', 'docx', 'doc'])

function value(formData: FormData, key: string) {
  return String(formData.get(key) ?? '').trim()
}

function required(formData: FormData, key: string, label: string, max = 5000) {
  const result = value(formData, key)
  if (!result) throw new Error(`${label} wajib diisi.`)
  if (result.length > max) throw new Error(`${label} terlalu panjang.`)
  return result
}

function optional(formData: FormData, key: string, label: string, max = 5000) {
  const result = value(formData, key)
  if (result.length > max) throw new Error(`${label} terlalu panjang.`)
  return result
}

function positiveId(formData: FormData, key: string, label: string) {
  const parsed = Number(required(formData, key, label, 30))
  if (!Number.isSafeInteger(parsed) || parsed <= 0) throw new Error(`${label} tidak valid.`)
  return parsed
}

function dateValue(formData: FormData, key: string, label: string, fallback?: string) {
  const result = value(formData, key) || fallback || ''
  if (!/^\d{4}-\d{2}-\d{2}$/.test(result)) throw new Error(`${label} tidak valid.`)
  const parsed = new Date(`${result}T00:00:00Z`)
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== result) throw new Error(`${label} tidak valid.`)
  return result
}

function optionalUrl(formData: FormData, key: string, label: string) {
  const result = optional(formData, key, label, 2048)
  if (!result) return null
  let parsed: URL
  try { parsed = new URL(result) } catch { throw new Error(`${label} harus berupa URL yang valid.`) }
  if (!['http:', 'https:'].includes(parsed.protocol)) throw new Error(`${label} harus menggunakan http atau https.`)
  return result
}

function extension(name: string) {
  return name.toLowerCase().match(/\.([a-z0-9]+)$/)?.[1] || ''
}

function documentFiles(formData: FormData, key: string) {
  const files = formData.getAll(key).filter((entry): entry is File => entry instanceof File && entry.size > 0)
  if (files.length > MAX_FILES_PER_SUBMISSION) throw new Error(`Maksimum ${MAX_FILES_PER_SUBMISSION} dokumen dalam sekali upload.`)
  for (const file of files) {
    if (file.size > MAX_DOCUMENT_BYTES) throw new Error(`${file.name} melebihi batas 15 MB.`)
    if (!ALLOWED_EXTENSIONS.has(extension(file.name))) throw new Error(`${file.name} bukan PDF, Excel, atau Word yang didukung.`)
  }
  return files
}

function pdfFile(formData: FormData) {
  const entry = formData.get('notulensi_pdf')
  if (!(entry instanceof File) || entry.size === 0) throw new Error('Pilih file PDF notulensi terlebih dahulu.')
  if (entry.size > MAX_PDF_BYTES) throw new Error('File notulensi PDF maksimal 10 MB.')
  if (extension(entry.name) !== 'pdf') throw new Error('File notulensi harus berformat PDF.')
  return entry
}

function todayMakassar() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Makassar', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date())
}

async function uploadBeraniDocuments(
  supabase: Awaited<ReturnType<typeof createClient>>,
  updateId: number,
  programSlug: string,
  files: File[],
) {
  const uploadedPaths: string[] = []
  let totalRows = 0
  let firstColumns: string[] = []
  let firstSheet: string | null = null
  let firstText: string | null = null

  try {
    for (const file of files) {
      const imported = await importDocument(file)
      const ext = extension(file.name)
      const path = `${programSlug}/${todayMakassar()}/${updateId}/${Date.now()}-${crypto.randomUUID()}.${ext}`
      const { error: uploadError } = await supabase.storage.from(BERANI_BUCKET).upload(path, file, {
        contentType: file.type || undefined,
        cacheControl: '3600',
        upsert: false,
      })
      if (uploadError) throw new Error(`Upload ${file.name} gagal: ${uploadError.message}`)
      uploadedPaths.push(path)

      const { data: document, error: documentError } = await supabase.from('berani_update_documents').insert({
        update_id: updateId,
        file_path: path,
        file_name: file.name,
        mime_type: file.type || null,
        file_size: file.size,
        sheet_name: imported.sheetName,
        columns: imported.columns,
        row_count: imported.rows.length,
        extracted_text: imported.extractedText,
      }).select('id').single()
      if (documentError || !document) throw new Error(documentError?.message || 'Metadata dokumen gagal disimpan.')

      if (imported.rows.length) {
        for (let offset = 0; offset < imported.rows.length; offset += 300) {
          const batch = imported.rows.slice(offset, offset + 300).map((row, index) => ({
            document_id: document.id,
            row_index: offset + index + 1,
            data: row,
          }))
          const { error: rowsError } = await supabase.from('berani_document_rows').insert(batch)
          if (rowsError) throw new Error(`Data ${file.name} gagal disimpan: ${rowsError.message}`)
        }
      }

      totalRows += imported.rows.length
      if (!firstColumns.length && imported.columns.length) firstColumns = imported.columns
      if (!firstSheet && imported.sheetName) firstSheet = imported.sheetName
      if (!firstText && imported.extractedText) firstText = imported.extractedText
    }
  } catch (error) {
    if (uploadedPaths.length) await supabase.storage.from(BERANI_BUCKET).remove(uploadedPaths)
    throw error
  }

  return { totalRows, firstColumns, firstSheet, firstText }
}

async function appendFindingDocuments(
  supabase: Awaited<ReturnType<typeof createClient>>,
  findingId: number,
  files: File[],
) {
  const uploadedPaths: string[] = []
  try {
    for (const file of files) {
      const imported = await importDocument(file)
      const ext = extension(file.name)
      const path = `${findingId}/${todayMakassar()}/${Date.now()}-${crypto.randomUUID()}.${ext}`
      const { error: uploadError } = await supabase.storage.from(FINDING_BUCKET).upload(path, file, {
        contentType: file.type || undefined,
        cacheControl: '3600',
        upsert: false,
      })
      if (uploadError) throw new Error(`Upload ${file.name} gagal: ${uploadError.message}`)
      uploadedPaths.push(path)
      const { error } = await supabase.from('opd_finding_documents').insert({
        finding_id: findingId,
        file_path: path,
        file_name: file.name,
        mime_type: file.type || null,
        file_size: file.size,
        extracted_text: imported.extractedText,
      })
      if (error) throw new Error(error.message)
    }
  } catch (error) {
    if (uploadedPaths.length) await supabase.storage.from(FINDING_BUCKET).remove(uploadedPaths)
    throw error
  }
}

function refreshKnowledge(programSlug?: string) {
  revalidatePath('/berani')
  if (programSlug) revalidatePath(`/berani/${programSlug}`)
  revalidatePath('/temuan-opd')
  revalidatePath('/dashboard')
}

export async function addKunjunganDocument(formData: FormData) {
  const kunjunganId = positiveId(formData, 'kunjungan_id', 'ID kunjungan')
  const title = optional(formData, 'title', 'Judul dokumen', 200) || 'Notulensi'
  const file = pdfFile(formData)
  const supabase = await createClient(null)
  const path = `${kunjunganId}/${Date.now()}-${crypto.randomUUID()}.pdf`
  const { error: uploadError } = await supabase.storage.from(NOTULENSI_BUCKET).upload(path, file, { contentType: 'application/pdf', cacheControl: '3600', upsert: false })
  if (uploadError) throw new Error(`Upload PDF gagal: ${uploadError.message}`)
  const { error } = await supabase.from('kunjungan_documents').insert({ kunjungan_id: kunjunganId, title, file_path: path, file_name: file.name, mime_type: 'application/pdf' })
  if (error) {
    await supabase.storage.from(NOTULENSI_BUCKET).remove([path])
    throw new Error(error.message)
  }
  revalidatePath('/kunjungan')
}

export async function deleteKunjunganDocument(formData: FormData) {
  const id = positiveId(formData, 'id', 'ID dokumen')
  const supabase = await createClient(null)
  const { data, error: findError } = await supabase.from('kunjungan_documents').select('file_path').eq('id', id).single()
  if (findError) throw new Error(findError.message)
  if (data?.file_path) await supabase.storage.from(NOTULENSI_BUCKET).remove([data.file_path])
  const { error } = await supabase.from('kunjungan_documents').delete().eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/kunjungan')
}

export async function createBeraniUpdate(formData: FormData) {
  const programId = positiveId(formData, 'program_id', 'Program BERANI')
  const programSlug = required(formData, 'program_slug', 'Slug program', 120)
  const title = required(formData, 'title', 'Judul update', 300)
  const opdName = optional(formData, 'opd_name', 'Nama OPD', 300) || null
  const periodLabel = optional(formData, 'period_label', 'Periode', 100) || null
  let summary = optional(formData, 'summary', 'Ringkasan', 10000) || null
  const files = documentFiles(formData, 'document_files')
  if (!files.length && !summary) throw new Error('Isi ringkasan atau unggah minimal satu dokumen sumber.')

  const supabase = await createClient(null)
  const { data: update, error } = await supabase.from('berani_updates').insert({
    program_id: programId, title, opd_name: opdName, period_label: periodLabel, summary,
  }).select('id').single()
  if (error || !update) throw new Error(error?.message || 'Update BERANI gagal disimpan.')

  try {
    if (files.length) {
      const imported = await uploadBeraniDocuments(supabase, update.id, programSlug, files)
      if (!summary && imported.firstText) summary = imported.firstText.slice(0, 1200)
      const { error: patchError } = await supabase.from('berani_updates').update({
        summary,
        row_count: imported.totalRows,
        columns: imported.firstColumns,
        sheet_name: imported.firstSheet,
        extracted_text: imported.firstText,
      }).eq('id', update.id)
      if (patchError) throw new Error(patchError.message)
    }
  } catch (uploadError) {
    await supabase.from('berani_updates').delete().eq('id', update.id)
    throw uploadError
  }

  refreshKnowledge(programSlug)
}

export async function addBeraniDocuments(formData: FormData) {
  const updateId = positiveId(formData, 'update_id', 'ID update')
  const programSlug = required(formData, 'program_slug', 'Slug program', 120)
  const files = documentFiles(formData, 'document_files')
  if (!files.length) throw new Error('Pilih minimal satu dokumen.')
  const supabase = await createClient(null)
  await uploadBeraniDocuments(supabase, updateId, programSlug, files)
  const { data: docs, error } = await supabase.from('berani_update_documents').select('row_count').eq('update_id', updateId)
  if (error) throw new Error(error.message)
  const totalRows = (docs ?? []).reduce((sum, doc) => sum + doc.row_count, 0)
  const { error: patchError } = await supabase.from('berani_updates').update({ row_count: totalRows }).eq('id', updateId)
  if (patchError) throw new Error(patchError.message)
  refreshKnowledge(programSlug)
}

export async function deleteBeraniDocument(formData: FormData) {
  const id = positiveId(formData, 'id', 'ID dokumen')
  const updateId = positiveId(formData, 'update_id', 'ID update')
  const programSlug = required(formData, 'program_slug', 'Slug program', 120)
  const supabase = await createClient(null)
  const { data, error } = await supabase.from('berani_update_documents').select('file_path').eq('id', id).single()
  if (error) throw new Error(error.message)
  if (data.file_path) await supabase.storage.from(BERANI_BUCKET).remove([data.file_path])
  const { error: deleteError } = await supabase.from('berani_update_documents').delete().eq('id', id)
  if (deleteError) throw new Error(deleteError.message)
  const { data: docs, error: countError } = await supabase.from('berani_update_documents').select('row_count').eq('update_id', updateId)
  if (countError) throw new Error(countError.message)
  const totalRows = (docs ?? []).reduce((sum, doc) => sum + doc.row_count, 0)
  await supabase.from('berani_updates').update({ row_count: totalRows }).eq('id', updateId)
  refreshKnowledge(programSlug)
}

export async function deleteBeraniUpdate(formData: FormData) {
  const id = positiveId(formData, 'id', 'ID update')
  const programSlug = required(formData, 'program_slug', 'Slug program', 120)
  const supabase = await createClient(null)
  const [{ data: update }, { data: docs }] = await Promise.all([
    supabase.from('berani_updates').select('file_path').eq('id', id).single(),
    supabase.from('berani_update_documents').select('file_path').eq('update_id', id),
  ])
  const paths = [...(docs ?? []).map((doc) => doc.file_path), ...(update?.file_path ? [update.file_path] : [])]
  if (paths.length) await supabase.storage.from(BERANI_BUCKET).remove(paths)
  const { error } = await supabase.from('berani_updates').delete().eq('id', id)
  if (error) throw new Error(error.message)
  refreshKnowledge(programSlug)
}

function findingPayload(formData: FormData) {
  const category = value(formData, 'category') || 'Temuan'
  if (!FINDING_CATEGORIES.includes(category as (typeof FINDING_CATEGORIES)[number])) throw new Error('Kategori temuan tidak valid.')
  const programRaw = value(formData, 'berani_program_id')
  const programId = programRaw ? Number(programRaw) : null
  if (programId !== null && (!Number.isSafeInteger(programId) || programId <= 0)) throw new Error('Program BERANI tidak valid.')
  return {
    opd_name: required(formData, 'opd_name', 'Nama OPD', 300),
    title: required(formData, 'title', 'Judul temuan', 300),
    detail: optional(formData, 'detail', 'Detail', 10000) || null,
    category,
    finding_date: dateValue(formData, 'finding_date', 'Tanggal', todayMakassar()),
    berani_program_id: programId,
    source_label: optional(formData, 'source_label', 'Sumber', 300) || null,
    source_url: optionalUrl(formData, 'source_url', 'Link sumber'),
  }
}

export async function createFinding(formData: FormData) {
  const files = documentFiles(formData, 'finding_files')
  const supabase = await createClient(null)
  const { data, error } = await supabase.from('opd_findings').insert(findingPayload(formData)).select('id').single()
  if (error || !data) throw new Error(error?.message || 'Temuan gagal disimpan.')
  try {
    if (files.length) await appendFindingDocuments(supabase, data.id, files)
  } catch (uploadError) {
    await supabase.from('opd_findings').delete().eq('id', data.id)
    throw uploadError
  }
  refreshKnowledge()
}

export async function updateFinding(formData: FormData) {
  const id = positiveId(formData, 'id', 'ID temuan')
  const files = documentFiles(formData, 'finding_files')
  const supabase = await createClient(null)
  const { error } = await supabase.from('opd_findings').update(findingPayload(formData)).eq('id', id)
  if (error) throw new Error(error.message)
  if (files.length) await appendFindingDocuments(supabase, id, files)
  refreshKnowledge()
}

export async function deleteFindingDocument(formData: FormData) {
  const id = positiveId(formData, 'id', 'ID lampiran')
  const supabase = await createClient(null)
  const { data, error } = await supabase.from('opd_finding_documents').select('file_path').eq('id', id).single()
  if (error) throw new Error(error.message)
  if (data.file_path) await supabase.storage.from(FINDING_BUCKET).remove([data.file_path])
  const { error: deleteError } = await supabase.from('opd_finding_documents').delete().eq('id', id)
  if (deleteError) throw new Error(deleteError.message)
  refreshKnowledge()
}

export async function deleteFinding(formData: FormData) {
  const id = positiveId(formData, 'id', 'ID temuan')
  const supabase = await createClient(null)
  const { data: docs } = await supabase.from('opd_finding_documents').select('file_path').eq('finding_id', id)
  const paths = (docs ?? []).map((doc) => doc.file_path)
  if (paths.length) await supabase.storage.from(FINDING_BUCKET).remove(paths)
  const { error } = await supabase.from('opd_findings').delete().eq('id', id)
  if (error) throw new Error(error.message)
  refreshKnowledge()
}
