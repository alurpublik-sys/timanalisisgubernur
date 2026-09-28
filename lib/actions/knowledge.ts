'use server'

import { revalidatePath } from 'next/cache'
import { importDocument } from '@/lib/document-import'
import { requireActionUser } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { deriveBeraniSections, mergeSectionPayload } from '@/lib/berani-auto-process'
import type { Json } from '@/lib/database.types'

const BERANI_BUCKET = 'berani-documents'
const FINDING_BUCKET = 'finding-documents'
const NOTULENSI_BUCKET = 'kunjungan-notulensi'
const MAX_DOCUMENT_BYTES = 20 * 1024 * 1024
const MAX_PDF_BYTES = 10 * 1024 * 1024
const MAX_FILES_PER_SUBMISSION = 10
const FINDING_CATEGORIES = ['Temuan', 'Positif', 'Perlu Perhatian', 'Potensi', 'Tindak Lanjut'] as const
const ALLOWED_EXTENSIONS = new Set(['pdf', 'xlsx', 'xls', 'docx', 'doc', 'pptx', 'ppt', 'csv', 'png', 'jpg', 'jpeg', 'webp'])

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

async function documentSha256(file: File) {
  const digest = await crypto.subtle.digest('SHA-256', await file.arrayBuffer())
  return Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, '0')).join('')
}

function jsonObject(value: Json | null | undefined): Record<string, Json> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, Json> : {}
}

function documentFiles(formData: FormData, key: string) {
  const files = formData.getAll(key).filter((entry): entry is File => entry instanceof File && entry.size > 0)
  if (files.length > MAX_FILES_PER_SUBMISSION) throw new Error(`Maksimum ${MAX_FILES_PER_SUBMISSION} dokumen dalam sekali upload.`)
  for (const file of files) {
    if (file.size > MAX_DOCUMENT_BYTES) throw new Error(`${file.name} melebihi batas 20 MB.`)
    if (!ALLOWED_EXTENSIONS.has(extension(file.name))) throw new Error(`${file.name} bukan PDF, Excel, Word, PowerPoint, CSV, atau gambar yang didukung.`)
  }
  return files
}

function documentOcrMap(formData: FormData) {
  const raw = String(formData.get('document_ocr_json') ?? '').trim()
  if (!raw) return {} as Record<string, string>
  if (raw.length > 500000) throw new Error('Hasil pembacaan visual terlalu besar.')
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>
    return Object.fromEntries(
      Object.entries(parsed)
        .filter(([key, value]) => key.length <= 255 && typeof value === 'string')
        .map(([key, value]) => [key, String(value).slice(0, 90000)]),
    )
  } catch {
    return {} as Record<string, string>
  }
}

async function upsertAutoSections(
  supabase: Awaited<ReturnType<typeof createClient>>,
  updateId: number,
  documentId: number,
  sections: ReturnType<typeof deriveBeraniSections>,
) {
  for (const section of sections) {
    const { data: existing, error: existingError } = await supabase
      .from('berani_update_sections')
      .select('id,payload,section_type')
      .eq('update_id', updateId)
      .eq('section_key', section.section_key)
      .maybeSingle()
    if (existingError) throw new Error(existingError.message)

    const payload = existing
      ? mergeSectionPayload(section.section_type, existing.payload as Json, section.payload)
      : section.payload

    if (existing) {
      const { error } = await supabase.from('berani_update_sections').update({
        document_id: documentId,
        title: section.title,
        section_type: section.section_type,
        payload,
        sort_order: section.sort_order,
        updated_at: new Date().toISOString(),
      }).eq('id', existing.id)
      if (error) throw new Error(`Data terolah gagal diperbarui: ${error.message}`)
    } else {
      const { error } = await supabase.from('berani_update_sections').insert({
        update_id: updateId,
        document_id: documentId,
        section_key: section.section_key,
        title: section.title,
        section_type: section.section_type,
        payload,
        sort_order: section.sort_order,
      })
      if (error) throw new Error(`Data terolah gagal disimpan: ${error.message}`)
    }
  }
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
  ocrTextByFile: Record<string, string> = {},
) {
  const uploadedPaths: string[] = []
  let totalRows = 0
  let firstColumns: string[] = []
  let firstSheet: string | null = null
  let firstText: string | null = null

  try {
    for (const file of files) {
      const fingerprint = await documentSha256(file)
      const { data: existingDocs, error: duplicateCheckError } = await supabase
        .from('berani_update_documents')
        .select('id,metadata')
        .eq('update_id', updateId)
        .eq('file_size', file.size)
      if (duplicateCheckError) throw new Error(duplicateCheckError.message)
      const duplicate = (existingDocs ?? []).some((doc) => String(jsonObject(doc.metadata as Json).sha256 || '') === fingerprint)
      if (duplicate) continue

      let imported = await importDocument(file)
      const serverExtractedText = imported.extractedText
      const browserOcrText = ocrTextByFile[file.name] || null
      if (!imported.extractedText && browserOcrText) imported = { ...imported, extractedText: browserOcrText }
      const ext = extension(file.name)
      const path = `${programSlug}/${todayMakassar()}/${updateId}/${Date.now()}-${crypto.randomUUID()}.${ext}`
      const { error: uploadError } = await supabase.storage.from(BERANI_BUCKET).upload(path, file, {
        contentType: file.type || undefined,
        cacheControl: '3600',
        upsert: false,
      })
      if (uploadError) throw new Error(`Upload ${file.name} gagal: ${uploadError.message}`)
      uploadedPaths.push(path)

      const displayTitle = file.name.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim()
      const summary = imported.extractedText ? imported.extractedText.slice(0, 1200) : null
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
        document_kind: imported.kind,
        display_title: displayTitle || file.name,
        summary,
        metadata: {
          auto_processed: true,
          ocr_used: Boolean(!serverExtractedText && browserOcrText),
          extraction: serverExtractedText ? 'server-text' : browserOcrText ? 'browser-ocr' : 'stored-only',
          processed_at: new Date().toISOString(),
          sha256: fingerprint,
        },
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

      const derivedSections = deriveBeraniSections({ programSlug, fileName: file.name, documentId: document.id, imported })
      if (derivedSections.length) await upsertAutoSections(supabase, updateId, document.id, derivedSections)

      if (imported.extractedText) {
        const { error: sectionError } = await supabase.from('berani_update_sections').insert({
          update_id: updateId,
          document_id: document.id,
          section_key: `source-text-${document.id}`,
          title: displayTitle || file.name,
          section_type: 'text',
          payload: { text: imported.extractedText.slice(0, 9000), source: file.name, extraction: serverExtractedText ? 'text' : 'ocr' },
          sort_order: 900,
        })
        if (sectionError) throw new Error(`Ringkasan ${file.name} gagal disimpan: ${sectionError.message}`)
      }
      if (imported.kind === 'image') {
        const { error: sectionError } = await supabase.from('berani_update_sections').insert({
          update_id: updateId,
          document_id: document.id,
          section_key: `auto-image-${document.id}`,
          title: displayTitle || file.name,
          section_type: 'image',
          payload: { caption: file.name, path },
          sort_order: 850,
        })
        if (sectionError) throw new Error(`Preview ${file.name} gagal disimpan: ${sectionError.message}`)
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

async function adminClient() { return (await requireActionUser(['admin'])).supabase }

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
  const supabase = await adminClient()
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
  const supabase = await adminClient()
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
  const ocrTextByFile = documentOcrMap(formData)
  if (!files.length && !summary) throw new Error('Isi ringkasan atau unggah minimal satu dokumen sumber.')

  const supabase = await adminClient()
  const liveKey = `live:${programSlug}`
  const { data: latest, error: latestError } = await supabase
    .from('berani_updates')
    .select('id,summary')
    .eq('program_id', programId)
    .order('updated_at', { ascending: false })
    .order('id', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (latestError) throw new Error(latestError.message)

  let activeUpdateId: number

  if (latest?.id) {
    activeUpdateId = latest.id
    const { error } = await supabase.from('berani_updates').update({
      title,
      opd_name: opdName,
      period_label: periodLabel,
      summary: summary || latest.summary || null,
      source_key: liveKey,
      updated_at: new Date().toISOString(),
    }).eq('id', activeUpdateId)
    if (error) throw new Error(error.message)
  } else {
    const { data: created, error } = await supabase.from('berani_updates').insert({
      program_id: programId,
      title,
      opd_name: opdName,
      period_label: periodLabel,
      summary,
      source_key: liveKey,
    }).select('id').single()
    if (error || !created) throw new Error(error?.message || 'Update BERANI gagal disimpan.')
    activeUpdateId = created.id
  }

  if (files.length) {
    const imported = await uploadBeraniDocuments(supabase, activeUpdateId, programSlug, files, ocrTextByFile)
    if (!summary && imported.firstText) summary = imported.firstText.slice(0, 1200)
    const { data: docs, error: docsError } = await supabase.from('berani_update_documents').select('row_count').eq('update_id', activeUpdateId)
    if (docsError) throw new Error(docsError.message)
    const totalRows = (docs ?? []).reduce((sum, doc) => sum + doc.row_count, 0)
    const { error: patchError } = await supabase.from('berani_updates').update({
      summary: summary || latest?.summary || null,
      row_count: totalRows,
      columns: imported.firstColumns,
      sheet_name: imported.firstSheet,
      extracted_text: imported.firstText,
      updated_at: new Date().toISOString(),
    }).eq('id', activeUpdateId)
    if (patchError) throw new Error(patchError.message)
  }

  refreshKnowledge(programSlug)
}

export async function addBeraniDocuments(formData: FormData) {
  const updateId = positiveId(formData, 'update_id', 'ID update')
  const programSlug = required(formData, 'program_slug', 'Slug program', 120)
  const files = documentFiles(formData, 'document_files')
  const ocrTextByFile = documentOcrMap(formData)
  if (!files.length) throw new Error('Pilih minimal satu dokumen.')
  const supabase = await adminClient()
  await uploadBeraniDocuments(supabase, updateId, programSlug, files, ocrTextByFile)
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
  const supabase = await adminClient()
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
  const supabase = await adminClient()
  const [{ data: update }, { data: docs }] = await Promise.all([
    supabase.from('berani_updates').select('file_path').eq('id', id).single(),
    supabase.from('berani_update_documents').select('file_path').eq('update_id', id),
  ])
  const paths = [...(docs ?? []).map((doc) => doc.file_path).filter((path): path is string => Boolean(path)), ...(update?.file_path ? [update.file_path] : [])]
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
  const supabase = await adminClient()
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
  const supabase = await adminClient()
  const { error } = await supabase.from('opd_findings').update(findingPayload(formData)).eq('id', id)
  if (error) throw new Error(error.message)
  if (files.length) await appendFindingDocuments(supabase, id, files)
  refreshKnowledge()
}

export async function deleteFindingDocument(formData: FormData) {
  const id = positiveId(formData, 'id', 'ID lampiran')
  const supabase = await adminClient()
  const { data, error } = await supabase.from('opd_finding_documents').select('file_path').eq('id', id).single()
  if (error) throw new Error(error.message)
  if (data.file_path) await supabase.storage.from(FINDING_BUCKET).remove([data.file_path])
  const { error: deleteError } = await supabase.from('opd_finding_documents').delete().eq('id', id)
  if (deleteError) throw new Error(deleteError.message)
  refreshKnowledge()
}

export async function deleteFinding(formData: FormData) {
  const id = positiveId(formData, 'id', 'ID temuan')
  const supabase = await adminClient()
  const { data: docs } = await supabase.from('opd_finding_documents').select('file_path').eq('finding_id', id)
  const paths = (docs ?? []).map((doc) => doc.file_path)
  if (paths.length) await supabase.storage.from(FINDING_BUCKET).remove(paths)
  const { error } = await supabase.from('opd_findings').delete().eq('id', id)
  if (error) throw new Error(error.message)
  refreshKnowledge()
}
