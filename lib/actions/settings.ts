'use server'

import { revalidatePath } from 'next/cache'
import { requireActionUser } from '@/lib/auth'

const SETTINGS = new Set([
  'HONOR_DASAR',
  'POTONGAN_75_84',
  'POTONGAN_65_74',
  'POTONGAN_50_64',
  'POTONGAN_35_49',
  'POTONGAN_20_34',
  'POTONGAN_0_19',
  'FAKTOR_HADIR',
  'FAKTOR_IZIN',
  'FAKTOR_TIDAK_HADIR',
  'MIN_AGENDA_INTI_FLOOR',
])

const text = (fd: FormData, key: string) => String(fd.get(key) ?? '').trim()
function required(fd: FormData, key: string, label: string, max = 5000) {
  const result = text(fd, key)
  if (!result) throw new Error(`${label} wajib diisi.`)
  if (result.length > max) throw new Error(`${label} terlalu panjang.`)
  return result
}
function optional(fd: FormData, key: string, label: string, max = 5000) {
  const result = text(fd, key)
  if (result.length > max) throw new Error(`${label} terlalu panjang.`)
  return result
}
function idValue(fd: FormData, key: string, label: string) {
  const result = Number(required(fd, key, label, 20))
  if (!Number.isSafeInteger(result) || result <= 0) throw new Error(`${label} tidak valid.`)
  return result
}
function numberValue(fd: FormData, key: string, label: string) {
  const raw = required(fd, key, label, 50).replace(',', '.')
  if (!/^-?\d+(?:\.\d+)?$/.test(raw)) throw new Error(`${label} harus berupa angka.`)
  const result = Number(raw)
  if (!Number.isFinite(result)) throw new Error(`${label} harus berupa angka.`)
  return result
}
function positiveNumber(fd: FormData, key: string, label: string) {
  const result = numberValue(fd, key, label)
  if (result <= 0 || result > 1000000000) throw new Error(`${label} harus lebih dari 0 dan dalam batas wajar.`)
  return result
}
function enumValue(fd: FormData, key: string, label: string, allowed: readonly string[], fallback?: string) {
  const result = text(fd, key) || fallback || ''
  if (!allowed.includes(result)) throw new Error(`${label} tidak valid.`)
  return result
}
function optionalUrl(fd: FormData, key: string, label: string) {
  const result = optional(fd, key, label, 2048)
  if (!result) return ''
  let parsed: URL
  try { parsed = new URL(result) } catch { throw new Error(`${label} harus berupa URL yang valid.`) }
  if (!['http:', 'https:'].includes(parsed.protocol)) throw new Error(`${label} harus menggunakan http atau https.`)
  return result
}
function refreshAll() {
  revalidatePath('/pengaturan')
  revalidatePath('/kinerja')
  revalidatePath('/tim-analisis')
  revalidatePath('/dashboard')
}
async function adminClient() {
  return (await requireActionUser(['admin'])).supabase
}

export async function addTeamMember(formData: FormData) {
  const supabase = await adminClient()
  const { error } = await supabase.from('tim_analisis').insert({
    nama: required(formData, 'nama', 'Nama', 300),
    peran: optional(formData, 'peran', 'Peran', 500),
    link_foto: optionalUrl(formData, 'link_foto', 'Link foto'),
    link_cv: optionalUrl(formData, 'link_cv', 'Link CV'),
    active: true,
  })
  if (error) throw new Error(error.message)
  refreshAll()
}

export async function updateTeamMember(formData: FormData) {
  const supabase = await adminClient()
  const id = idValue(formData, 'id', 'ID anggota')
  const { error } = await supabase.from('tim_analisis').update({
    nama: required(formData, 'nama', 'Nama', 300),
    peran: optional(formData, 'peran', 'Peran', 500),
    link_foto: optionalUrl(formData, 'link_foto', 'Link foto'),
    link_cv: optionalUrl(formData, 'link_cv', 'Link CV'),
    active: enumValue(formData, 'active', 'Status', ['true', 'false']) === 'true',
  }).eq('id', id)
  if (error) throw new Error(error.message)
  refreshAll()
}

export async function addMasterAgenda(formData: FormData) {
  const supabase = await adminClient()
  const { error } = await supabase.from('master_agenda').insert({
    nama_agenda: required(formData, 'nama_agenda', 'Nama agenda', 300),
    bobot: positiveNumber(formData, 'bobot', 'Bobot'),
    kewajiban: enumValue(formData, 'kewajiban', 'Kewajiban', ['Semua Tim', 'Peserta Dipilih']),
    pengecualian: optional(formData, 'pengecualian', 'Pengecualian', 2000),
    status: enumValue(formData, 'status', 'Status', ['Aktif', 'Nonaktif'], 'Aktif'),
  })
  if (error) throw new Error(error.message)
  refreshAll()
}

export async function updateMasterAgenda(formData: FormData) {
  const supabase = await adminClient()
  const id = idValue(formData, 'id', 'ID agenda')
  const { error } = await supabase.from('master_agenda').update({
    nama_agenda: required(formData, 'nama_agenda', 'Nama agenda', 300),
    bobot: positiveNumber(formData, 'bobot', 'Bobot'),
    kewajiban: enumValue(formData, 'kewajiban', 'Kewajiban', ['Semua Tim', 'Peserta Dipilih']),
    pengecualian: optional(formData, 'pengecualian', 'Pengecualian', 2000),
    status: enumValue(formData, 'status', 'Status', ['Aktif', 'Nonaktif']),
  }).eq('id', id)
  if (error) throw new Error(error.message)
  refreshAll()
}

export async function addMasterContribution(formData: FormData) {
  const supabase = await adminClient()
  const { error } = await supabase.from('master_kontribusi').insert({
    nama_kontribusi: required(formData, 'nama_kontribusi', 'Nama kontribusi', 500),
    bobot: positiveNumber(formData, 'bobot', 'Bobot'),
    khusus_tim: optional(formData, 'khusus_tim', 'Khusus tim', 2000),
    status: enumValue(formData, 'status', 'Status', ['Aktif', 'Nonaktif'], 'Aktif'),
  })
  if (error) throw new Error(error.message)
  refreshAll()
}

export async function updateMasterContribution(formData: FormData) {
  const supabase = await adminClient()
  const id = idValue(formData, 'id', 'ID kontribusi')
  const { error } = await supabase.from('master_kontribusi').update({
    nama_kontribusi: required(formData, 'nama_kontribusi', 'Nama kontribusi', 500),
    bobot: positiveNumber(formData, 'bobot', 'Bobot'),
    khusus_tim: optional(formData, 'khusus_tim', 'Khusus tim', 2000),
    status: enumValue(formData, 'status', 'Status', ['Aktif', 'Nonaktif']),
  }).eq('id', id)
  if (error) throw new Error(error.message)
  refreshAll()
}

export async function updateKinerjaSetting(formData: FormData) {
  const supabase = await adminClient()
  const kunci = required(formData, 'kunci', 'Kunci pengaturan', 100)
  if (!SETTINGS.has(kunci)) throw new Error('Kunci pengaturan tidak dikenal.')

  const nilai = numberValue(formData, 'nilai', 'Nilai')
  if (kunci.startsWith('FAKTOR_') && (nilai < 0 || nilai > 1)) throw new Error('Faktor kehadiran harus berada pada rentang 0 sampai 1.')
  if (kunci === 'MIN_AGENDA_INTI_FLOOR' && (!Number.isInteger(nilai) || nilai < 1 || nilai > 100)) throw new Error('Minimal agenda inti harus berupa bilangan bulat 1–100.')
  if ((kunci === 'HONOR_DASAR' || kunci.startsWith('POTONGAN_')) && (nilai < 0 || nilai > 1000000000)) throw new Error('Nominal honor/potongan tidak valid.')

  const { error } = await supabase.from('pengaturan_kinerja').update({
    nilai,
    keterangan: optional(formData, 'keterangan', 'Keterangan', 5000),
  }).eq('kunci', kunci)
  if (error) throw new Error(error.message)
  refreshAll()
}
