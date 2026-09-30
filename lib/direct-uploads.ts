import 'server-only'

import type { SupabaseClient } from '@supabase/supabase-js'
import type { DirectUploadDescriptor, UploadKind } from '@/lib/upload-config'

type UploadSpec = {
  bucket: string
  maxBytes: number
  extensions: ReadonlySet<string>
}

const MB = 1024 * 1024
const DOC_EXTENSIONS = new Set(['pdf','xlsx','xls','docx','doc','pptx','ppt','csv','png','jpg','jpeg','webp'])

export const UPLOAD_SPECS: Record<UploadKind, UploadSpec> = {
  'kunjungan-pdf': { bucket: 'kunjungan-notulensi', maxBytes: 20 * MB, extensions: new Set(['pdf']) },
  'team-photo': { bucket: 'team-assets', maxBytes: 10 * MB, extensions: new Set(['jpg','jpeg','png','webp']) },
  'team-cv': { bucket: 'team-assets', maxBytes: 10 * MB, extensions: new Set(['pdf']) },
  'finding-document': { bucket: 'finding-documents', maxBytes: 20 * MB, extensions: DOC_EXTENSIONS },
  'berani-document': { bucket: 'berani-documents', maxBytes: 20 * MB, extensions: DOC_EXTENSIONS },
}

export function fileExtension(name: string) {
  const clean = name.trim().toLowerCase()
  const dot = clean.lastIndexOf('.')
  return dot >= 0 ? clean.slice(dot + 1) : ''
}

export function validateUploadMetadata(input: {
  kind: UploadKind
  fileName: string
  size: number
}) {
  const spec = UPLOAD_SPECS[input.kind]
  if (!spec) throw new Error('Jenis upload tidak didukung.')
  const fileName = String(input.fileName || '').trim()
  if (!fileName || fileName.length > 255) throw new Error('Nama file tidak valid.')
  if (!Number.isFinite(input.size) || input.size <= 0) throw new Error('Ukuran file tidak valid.')
  if (input.size > spec.maxBytes) {
    throw new Error(`Ukuran ${fileName} melebihi batas ${Math.round(spec.maxBytes / MB)} MB.`)
  }
  const extension = fileExtension(fileName)
  if (!spec.extensions.has(extension)) throw new Error(`Format file ${fileName} tidak didukung.`)
  return { spec, extension, fileName }
}

function expectedCount(fd: FormData, fieldName: string) {
  const raw = String(fd.get(`${fieldName}_expected`) ?? '').trim()
  if (!raw) return 0
  const parsed = Number(raw)
  return Number.isSafeInteger(parsed) && parsed >= 0 ? parsed : 0
}

export function directUploadsFromForm(fd: FormData, fieldName: string, kind: UploadKind) {
  const raw = String(fd.get(fieldName) ?? '').trim()
  let parsed: unknown = []
  if (raw) {
    try { parsed = JSON.parse(raw) } catch { throw new Error('Metadata upload tidak valid. Pilih ulang file.') }
  }

  if (!Array.isArray(parsed)) throw new Error('Metadata upload tidak valid.')
  const uploads: DirectUploadDescriptor[] = []

  for (const item of parsed) {
    if (!item || typeof item !== 'object') throw new Error('Metadata upload tidak valid.')
    const value = item as Record<string, unknown>
    const descriptor: DirectUploadDescriptor = {
      kind: String(value.kind || '') as UploadKind,
      bucket: String(value.bucket || ''),
      path: String(value.path || ''),
      fileName: String(value.fileName || ''),
      mimeType: String(value.mimeType || ''),
      size: Number(value.size || 0),
    }

    if (descriptor.kind !== kind) throw new Error('Jenis upload tidak cocok.')
    const { spec } = validateUploadMetadata(descriptor)
    if (descriptor.bucket !== spec.bucket) throw new Error('Bucket upload tidak cocok.')
    if (!descriptor.path.startsWith(`direct/${kind}/`)) throw new Error('Path upload tidak valid.')
    uploads.push(descriptor)
  }

  const expected = expectedCount(fd, fieldName)
  if (expected > uploads.length) {
    throw new Error('Upload file belum selesai. Tunggu sampai status file menjadi “Siap disimpan”, lalu coba lagi.')
  }

  return uploads
}

export async function downloadDirectUploads(
  supabase: SupabaseClient,
  uploads: DirectUploadDescriptor[],
) {
  const files: File[] = []
  for (const upload of uploads) {
    const { data, error } = await supabase.storage.from(upload.bucket).download(upload.path)
    if (error || !data) throw new Error(`Gagal membaca ${upload.fileName}: ${error?.message || 'file tidak ditemukan'}`)
    const buffer = await data.arrayBuffer()
    files.push(new File([buffer], upload.fileName, { type: upload.mimeType || data.type || 'application/octet-stream' }))
  }
  return files
}

export async function cleanupDirectUploads(
  supabase: SupabaseClient,
  uploads: DirectUploadDescriptor[],
) {
  const groups = new Map<string, string[]>()
  for (const upload of uploads) {
    const paths = groups.get(upload.bucket) ?? []
    paths.push(upload.path)
    groups.set(upload.bucket, paths)
  }
  for (const [bucket, paths] of groups) {
    if (!paths.length) continue
    const { error } = await supabase.storage.from(bucket).remove(paths)
    if (error) console.warn('[direct-upload] cleanup failed', { bucket, count: paths.length, error: error.message })
  }
}
