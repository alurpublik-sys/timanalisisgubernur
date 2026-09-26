'use server'

import { revalidatePath } from 'next/cache'
import { importDocument } from '@/lib/document-import'
import { createClient } from '@/lib/supabase/server'

const BERANI_BUCKET = 'berani-documents'
const NOTULENSI_BUCKET = 'kunjungan-notulensi'
const MAX_BERANI_BYTES = 15 * 1024 * 1024
const MAX_PDF_BYTES = 10 * 1024 * 1024
const FINDING_CATEGORIES = ['Temuan', 'Positif', 'Perlu Perhatian', 'Potensi', 'Tindak Lanjut'] as const

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

function fileEntry(formData: FormData, key: string) {
  const entry = formData.get(key)
  if (!(entry instanceof File) || entry.size === 0) return null
  return entry
}

function extension(name: string) {
  return name.toLowerCase().match(/\.([a-z0-9]+)$/)?.[1] || ''
}

function beraniFile(formData: FormData) {
  const file = fileEntry(formData, 'document_file')
  if (!file) return null
  if (file.size > MAX_BERANI_BYTES) throw new Error('Dokumen BERANI maksimal 15 MB.')
  const ext = extension(file.name)
  if (!['pdf', 'xlsx', 'xls', 'docx', 'doc'].includes(ext)) throw new Error('Dokumen harus PDF, Excel (.xlsx/.xls), atau Word (.docx/.doc).')
  return file
}

function pdfFile(formData: FormData) {
  const file = fileEntry(formData, 'notulensi_pdf')
  if (!file) throw new Error('Pilih file PDF notulensi terlebih dahulu.')
  if (file.size > MAX_PDF_BYTES) throw new Error('File notulensi PDF maksimal 10 MB.')
  if (extension(file.name) !== 'pdf' || file.type !== 'application/pdf') throw new Error('File notulensi harus berformat PDF.')
  return file
}

function todayMakassar() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Makassar', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date())
}

export async function addKunjunganDocument(formData: FormData) {
  const kunjunganId = positiveId(formData, 'kunjungan_id', 'ID kunjungan')
  const title = optional(formData, 'title', 'Judul dokumen', 200) || 'Notulensi'
  const file = pdfFile(formData)
  const supabase = await createClient(null)
  const path = `${kunjunganId}/${Date.now()}-${crypto.randomUUID()}.pdf`

  const { error: uploadError } = await supabase.storage.from(NOTULENSI_BUCKET).upload(path, file, {
    contentType: 'application/pdf', cacheControl: '3600', upsert: false,
  })
  if (uploadError) throw new Error(`Upload PDF gagal: ${uploadError.message}`)

  const { error } = await supabase.from('kunjungan_documents').insert({
    kunjungan_id: kunjunganId,
    title,
    file_path: path,
    file_name: file.name,
    mime_type: 'application/pdf',
  })
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
  if (data?.file_path) {
    const { error: storageError } = await supabase.storage.from(NOTULENSI_BUCKET).remove([data.file_path])
    if (storageError) throw new Error(`Hapus PDF gagal: ${storageError.message}`)
  }
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
  const file = beraniFile(formData)
  if (!file && !summary) throw new Error('Isi ringkasan atau unggah dokumen sumber.')

  let filePath: string | null = null
  let imported = { sheetName: null as string | null, columns: [] as string[], rows: [] as Record<string, string | number | boolean | null>[], extractedText: null as string | null }
  if (file) {
    imported = await importDocument(file)
    if (!summary && imported.extractedText) summary = imported.extractedText.slice(0, 1200)
  }

  const supabase = await createClient(null)
  if (file) {
    const ext = extension(file.name)
    filePath = `${programSlug}/${todayMakassar()}/${Date.now()}-${crypto.randomUUID()}.${ext}`
    const { error: uploadError } = await supabase.storage.from(BERANI_BUCKET).upload(filePath, file, {
      contentType: file.type || undefined,
      cacheControl: '3600',
      upsert: false,
    })
    if (uploadError) throw new Error(`Upload dokumen gagal: ${uploadError.message}`)
  }

  const { data: update, error } = await supabase.from('berani_updates').insert({
    program_id: programId,
    title,
    opd_name: opdName,
    period_label: periodLabel,
    summary,
    file_path: filePath,
    file_name: file?.name ?? null,
    mime_type: file?.type || null,
    file_size: file?.size ?? null,
    sheet_name: imported.sheetName,
    columns: imported.columns,
    row_count: imported.rows.length,
    extracted_text: imported.extractedText,
  }).select('id').single()

  if (error || !update) {
    if (filePath) await supabase.storage.from(BERANI_BUCKET).remove([filePath])
    throw new Error(error?.message || 'Update BERANI gagal disimpan.')
  }

  if (imported.rows.length) {
    for (let offset = 0; offset < imported.rows.length; offset += 300) {
      const batch = imported.rows.slice(offset, offset + 300).map((row, index) => ({
        update_id: update.id,
        row_index: offset + index + 1,
        data: row,
      }))
      const { error: rowsError } = await supabase.from('berani_update_rows').insert(batch)
      if (rowsError) {
        await supabase.from('berani_updates').delete().eq('id', update.id)
        if (filePath) await supabase.storage.from(BERANI_BUCKET).remove([filePath])
        throw new Error(`Data Excel gagal disimpan: ${rowsError.message}`)
      }
    }
  }

  revalidatePath('/berani')
  revalidatePath(`/berani/${programSlug}`)
  revalidatePath('/dashboard')
}

export async function deleteBeraniUpdate(formData: FormData) {
  const id = positiveId(formData, 'id', 'ID update')
  const programSlug = required(formData, 'program_slug', 'Slug program', 120)
  const supabase = await createClient(null)
  const { data, error: findError } = await supabase.from('berani_updates').select('file_path').eq('id', id).single()
  if (findError) throw new Error(findError.message)
  if (data?.file_path) {
    const { error: storageError } = await supabase.storage.from(BERANI_BUCKET).remove([data.file_path])
    if (storageError) throw new Error(`Dokumen tidak dapat dihapus: ${storageError.message}`)
  }
  const { error } = await supabase.from('berani_updates').delete().eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/berani')
  revalidatePath(`/berani/${programSlug}`)
  revalidatePath('/dashboard')
}

export async function createFinding(formData: FormData) {
  const category = value(formData, 'category') || 'Temuan'
  if (!FINDING_CATEGORIES.includes(category as (typeof FINDING_CATEGORIES)[number])) throw new Error('Kategori temuan tidak valid.')
  const programRaw = value(formData, 'berani_program_id')
  const programId = programRaw ? Number(programRaw) : null
  if (programId !== null && (!Number.isSafeInteger(programId) || programId <= 0)) throw new Error('Program BERANI tidak valid.')
  const supabase = await createClient(null)
  const { error } = await supabase.from('opd_findings').insert({
    opd_name: required(formData, 'opd_name', 'Nama OPD', 300),
    title: required(formData, 'title', 'Judul temuan', 300),
    detail: optional(formData, 'detail', 'Detail', 10000) || null,
    category,
    finding_date: dateValue(formData, 'finding_date', 'Tanggal', todayMakassar()),
    berani_program_id: programId,
    source_label: optional(formData, 'source_label', 'Sumber', 300) || null,
    source_url: optionalUrl(formData, 'source_url', 'Link sumber'),
  })
  if (error) throw new Error(error.message)
  revalidatePath('/temuan-opd')
  revalidatePath('/dashboard')
}

export async function updateFinding(formData: FormData) {
  const id = positiveId(formData, 'id', 'ID temuan')
  const category = value(formData, 'category') || 'Temuan'
  if (!FINDING_CATEGORIES.includes(category as (typeof FINDING_CATEGORIES)[number])) throw new Error('Kategori temuan tidak valid.')
  const programRaw = value(formData, 'berani_program_id')
  const programId = programRaw ? Number(programRaw) : null
  if (programId !== null && (!Number.isSafeInteger(programId) || programId <= 0)) throw new Error('Program BERANI tidak valid.')
  const supabase = await createClient(null)
  const { error } = await supabase.from('opd_findings').update({
    opd_name: required(formData, 'opd_name', 'Nama OPD', 300),
    title: required(formData, 'title', 'Judul temuan', 300),
    detail: optional(formData, 'detail', 'Detail', 10000) || null,
    category,
    finding_date: dateValue(formData, 'finding_date', 'Tanggal', todayMakassar()),
    berani_program_id: programId,
    source_label: optional(formData, 'source_label', 'Sumber', 300) || null,
    source_url: optionalUrl(formData, 'source_url', 'Link sumber'),
  }).eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/temuan-opd')
  revalidatePath('/dashboard')
}

export async function deleteFinding(formData: FormData) {
  const id = positiveId(formData, 'id', 'ID temuan')
  const supabase = await createClient(null)
  const { error } = await supabase.from('opd_findings').delete().eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/temuan-opd')
  revalidatePath('/dashboard')
}
