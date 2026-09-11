'use server'

import { revalidatePath } from 'next/cache'
import { requireActionUser } from '@/lib/auth'

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

function dateValue(formData: FormData, key: string, label: string) {
  const result = required(formData, key, label, 10)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(result)) throw new Error(`${label} tidak valid.`)
  const parsed = new Date(`${result}T00:00:00Z`)
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== result) throw new Error(`${label} tidak valid.`)
  return result
}

function enumValue(formData: FormData, key: string, label: string, allowed: readonly string[], fallback?: string) {
  const result = value(formData, key) || fallback || ''
  if (!allowed.includes(result)) throw new Error(`${label} tidak valid.`)
  return result
}

function optionalUrl(formData: FormData, key: string, label: string) {
  const result = optional(formData, key, label, 2048)
  if (!result) return ''
  let parsed: URL
  try { parsed = new URL(result) } catch { throw new Error(`${label} harus berupa URL yang valid.`) }
  if (!['http:', 'https:'].includes(parsed.protocol)) throw new Error(`${label} harus menggunakan http atau https.`)
  return result
}

function refresh(...paths: string[]) {
  paths.forEach((path) => revalidatePath(path))
}

export async function createKunjungan(formData: FormData) {
  const { supabase } = await requireActionUser()
  const payload = {
    nama_opd: required(formData, 'opd', 'Nama OPD', 300),
    tanggal: dateValue(formData, 'tanggal', 'Tanggal'),
    pejabat: optional(formData, 'pejabat', 'Pejabat', 500),
    anggota_tim: optional(formData, 'anggota', 'Anggota tim', 1000),
    topik: required(formData, 'topik', 'Topik pembahasan', 10000),
    status: enumValue(formData, 'status', 'Status', ['Terjadwal', 'Selesai', 'Ditunda'], 'Terjadwal'),
    link_notulen: optionalUrl(formData, 'link_notulen', 'Link notulensi'),
  }
  const { error } = await supabase.from('kunjungan').insert(payload)
  if (error) throw new Error(error.message)
  refresh('/kunjungan', '/dashboard')
}

export async function createIsu(formData: FormData) {
  const { supabase } = await requireActionUser()
  const payload = {
    nama_isu: required(formData, 'nama', 'Nama isu', 1000),
    opd_terkait: optional(formData, 'opd', 'OPD terkait', 1000),
    prioritas: enumValue(formData, 'prioritas', 'Prioritas', ['Tinggi', 'Sedang', 'Rendah'], 'Sedang'),
    ringkasan: optional(formData, 'ringkasan', 'Ringkasan', 50000),
    status_monitoring: enumValue(formData, 'status', 'Status', ['Aktif', 'Monitoring', 'Perlu Tindak Lanjut', 'Selesai'], 'Monitoring'),
  }
  const { error } = await supabase.from('isu_strategis').insert(payload)
  if (error) throw new Error(error.message)
  refresh('/isu-strategis', '/dashboard')
}

export async function createPolicy(formData: FormData) {
  const { supabase } = await requireActionUser()
  const payload = {
    judul: required(formData, 'judul', 'Judul', 1000),
    opd_terkait: optional(formData, 'opd', 'OPD terkait', 1000),
    ringkasan: optional(formData, 'ringkasan', 'Ringkasan', 50000),
    pic: optional(formData, 'pic', 'PIC', 500),
    status: enumValue(formData, 'status', 'Status', ['Draft', 'Review', 'Final'], 'Draft'),
    link_doc: optionalUrl(formData, 'link', 'Link dokumen'),
  }
  const { error } = await supabase.from('rekomendasi').insert(payload)
  if (error) throw new Error(error.message)
  refresh('/policy-brief', '/dashboard')
}

export async function createMedia(formData: FormData) {
  const { supabase } = await requireActionUser()
  const payload = {
    judul_berita: required(formData, 'judul', 'Judul berita', 2000),
    nama_media: optional(formData, 'media', 'Nama media', 500),
    tanggal: dateValue(formData, 'tanggal', 'Tanggal'),
    sentimen: enumValue(formData, 'sentimen', 'Sentimen', ['Positif', 'Netral', 'Negatif']),
    link_berita: optionalUrl(formData, 'link', 'Link berita'),
  }
  const { error } = await supabase.from('media_monitoring').insert(payload)
  if (error) throw new Error(error.message)
  refresh('/media-monitor', '/dashboard')
}

export async function createAgenda(formData: FormData) {
  const { supabase } = await requireActionUser()
  const payload = {
    nama_agenda: required(formData, 'nama', 'Nama agenda', 1000),
    tanggal: dateValue(formData, 'tanggal', 'Tanggal'),
    tipe: enumValue(formData, 'tipe', 'Tipe', ['Rapat', 'Kunjungan', 'Tugas', 'Koordinasi']),
    status: enumValue(formData, 'status', 'Status', ['Terjadwal', 'Proses', 'Selesai', 'Ditunda'], 'Terjadwal'),
    pic: optional(formData, 'pic', 'PIC', 500),
  }
  const { error } = await supabase.from('agenda').insert(payload)
  if (error) throw new Error(error.message)
  refresh('/agenda', '/dashboard')
}

export async function updateTimLinks(formData: FormData) {
  const { supabase } = await requireActionUser(['admin'])
  const id = Number(required(formData, 'id', 'ID tim', 20))
  if (!Number.isSafeInteger(id) || id <= 0) throw new Error('ID anggota tidak valid.')
  const { error } = await supabase
    .from('tim_analisis')
    .update({
      link_foto: optionalUrl(formData, 'link_foto', 'Link foto'),
      link_cv: optionalUrl(formData, 'link_cv', 'Link CV'),
    })
    .eq('id', id)
  if (error) throw new Error(error.message)
  refresh('/tim-analisis')
}
