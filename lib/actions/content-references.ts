'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

const STATUSES = ['Draft', 'Perlu Verifikasi', 'Siap Dibagikan'] as const

function text(fd: FormData, key: string) {
  return String(fd.get(key) ?? '').trim()
}

function required(fd: FormData, key: string, label: string, max = 10000) {
  const result = text(fd, key)
  if (!result) throw new Error(`${label} wajib diisi.`)
  if (result.length > max) throw new Error(`${label} terlalu panjang.`)
  return result
}

function optional(fd: FormData, key: string, label: string, max = 10000) {
  const result = text(fd, key)
  if (result.length > max) throw new Error(`${label} terlalu panjang.`)
  return result || null
}

function idValue(fd: FormData, key: string, label: string) {
  const id = Number(required(fd, key, label, 30))
  if (!Number.isSafeInteger(id) || id <= 0) throw new Error(`${label} tidak valid.`)
  return id
}

function statusValue(fd: FormData) {
  const status = text(fd, 'status') || 'Draft'
  if (!STATUSES.includes(status as (typeof STATUSES)[number])) throw new Error('Status referensi tidak valid.')
  return status
}

function programId(fd: FormData) {
  const raw = text(fd, 'berani_program_id')
  if (!raw) return null
  const id = Number(raw)
  if (!Number.isSafeInteger(id) || id <= 0) throw new Error('Program BERANI tidak valid.')
  return id
}

function urls(fd: FormData) {
  const raw = text(fd, 'reference_urls')
  if (!raw) return []
  const values = raw.split(/\r?\n|,/).map((item) => item.trim()).filter(Boolean)
  if (values.length > 12) throw new Error('Maksimum 12 link referensi.')
  return values.map((item) => {
    let parsed: URL
    try { parsed = new URL(item) } catch { throw new Error(`Link referensi tidak valid: ${item}`) }
    if (!['http:', 'https:'].includes(parsed.protocol)) throw new Error('Referensi harus menggunakan http atau https.')
    return item
  })
}

function refresh() {
  revalidatePath('/referensi-konten')
  revalidatePath('/dashboard')
}

export async function createContentReference(fd: FormData) {
  const supabase = await createClient(null)
  const { error } = await supabase.from('content_references').insert({
    opd_name: required(fd, 'opd_name', 'Nama OPD', 300),
    title: required(fd, 'title', 'Judul program', 300),
    program_label: optional(fd, 'program_label', 'Label program', 300),
    detail: optional(fd, 'detail', 'Detail', 12000),
    key_facts: optional(fd, 'key_facts', 'Fakta utama', 12000),
    status: statusValue(fd),
    berani_program_id: programId(fd),
    reference_urls: urls(fd),
    source_label: optional(fd, 'source_label', 'Sumber', 500),
    sort_order: Math.max(0, Number(text(fd, 'sort_order')) || 0),
  })
  if (error) throw new Error(error.message)
  refresh()
}

export async function updateContentReference(fd: FormData) {
  const supabase = await createClient(null)
  const id = idValue(fd, 'id', 'ID referensi')
  const { error } = await supabase.from('content_references').update({
    opd_name: required(fd, 'opd_name', 'Nama OPD', 300),
    title: required(fd, 'title', 'Judul program', 300),
    program_label: optional(fd, 'program_label', 'Label program', 300),
    detail: optional(fd, 'detail', 'Detail', 12000),
    key_facts: optional(fd, 'key_facts', 'Fakta utama', 12000),
    status: statusValue(fd),
    berani_program_id: programId(fd),
    reference_urls: urls(fd),
    source_label: optional(fd, 'source_label', 'Sumber', 500),
    sort_order: Math.max(0, Number(text(fd, 'sort_order')) || 0),
  }).eq('id', id)
  if (error) throw new Error(error.message)
  refresh()
}

export async function deleteContentReference(fd: FormData) {
  const supabase = await createClient(null)
  const id = idValue(fd, 'id', 'ID referensi')
  const { error } = await supabase.from('content_references').delete().eq('id', id)
  if (error) throw new Error(error.message)
  refresh()
}
