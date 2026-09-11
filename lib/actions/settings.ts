'use server'

import { revalidatePath } from 'next/cache'
import { requireActionUser } from '@/lib/auth'

const text = (fd: FormData, key: string) => String(fd.get(key) ?? '').trim()
function required(fd: FormData, key: string, label: string) {
  const result = text(fd, key)
  if (!result) throw new Error(`${label} wajib diisi.`)
  return result
}
function numberValue(fd: FormData, key: string, label: string) {
  const raw = required(fd, key, label).replace(/\./g, '').replace(',', '.')
  const result = Number(raw)
  if (!Number.isFinite(result)) throw new Error(`${label} harus berupa angka.`)
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
    nama: required(formData, 'nama', 'Nama'),
    peran: text(formData, 'peran'),
    link_foto: text(formData, 'link_foto'),
    link_cv: text(formData, 'link_cv'),
    active: true,
  })
  if (error) throw new Error(error.message)
  refreshAll()
}

export async function updateTeamMember(formData: FormData) {
  const supabase = await adminClient()
  const id = Number(required(formData, 'id', 'ID tim'))
  if (!Number.isFinite(id)) throw new Error('ID anggota tidak valid.')
  const { error } = await supabase.from('tim_analisis').update({
    nama: required(formData, 'nama', 'Nama'),
    peran: text(formData, 'peran'),
    link_foto: text(formData, 'link_foto'),
    link_cv: text(formData, 'link_cv'),
    active: text(formData, 'active') === 'true',
  }).eq('id', id)
  if (error) throw new Error(error.message)
  refreshAll()
}

export async function addMasterAgenda(formData: FormData) {
  const supabase = await adminClient()
  const { error } = await supabase.from('master_agenda').insert({
    nama_agenda: required(formData, 'nama_agenda', 'Nama agenda'),
    bobot: numberValue(formData, 'bobot', 'Bobot'),
    kewajiban: required(formData, 'kewajiban', 'Kewajiban'),
    pengecualian: text(formData, 'pengecualian'),
    status: text(formData, 'status') || 'Aktif',
  })
  if (error) throw new Error(error.message)
  refreshAll()
}

export async function updateMasterAgenda(formData: FormData) {
  const supabase = await adminClient()
  const id = Number(required(formData, 'id', 'ID agenda'))
  const { error } = await supabase.from('master_agenda').update({
    nama_agenda: required(formData, 'nama_agenda', 'Nama agenda'),
    bobot: numberValue(formData, 'bobot', 'Bobot'),
    kewajiban: required(formData, 'kewajiban', 'Kewajiban'),
    pengecualian: text(formData, 'pengecualian'),
    status: required(formData, 'status', 'Status'),
  }).eq('id', id)
  if (error) throw new Error(error.message)
  refreshAll()
}

export async function addMasterContribution(formData: FormData) {
  const supabase = await adminClient()
  const { error } = await supabase.from('master_kontribusi').insert({
    nama_kontribusi: required(formData, 'nama_kontribusi', 'Nama kontribusi'),
    bobot: numberValue(formData, 'bobot', 'Bobot'),
    khusus_tim: text(formData, 'khusus_tim'),
    status: text(formData, 'status') || 'Aktif',
  })
  if (error) throw new Error(error.message)
  refreshAll()
}

export async function updateMasterContribution(formData: FormData) {
  const supabase = await adminClient()
  const id = Number(required(formData, 'id', 'ID kontribusi'))
  const { error } = await supabase.from('master_kontribusi').update({
    nama_kontribusi: required(formData, 'nama_kontribusi', 'Nama kontribusi'),
    bobot: numberValue(formData, 'bobot', 'Bobot'),
    khusus_tim: text(formData, 'khusus_tim'),
    status: required(formData, 'status', 'Status'),
  }).eq('id', id)
  if (error) throw new Error(error.message)
  refreshAll()
}

export async function updateKinerjaSetting(formData: FormData) {
  const supabase = await adminClient()
  const kunci = required(formData, 'kunci', 'Kunci pengaturan')
  const { error } = await supabase.from('pengaturan_kinerja').update({
    nilai: numberValue(formData, 'nilai', 'Nilai'),
    keterangan: text(formData, 'keterangan'),
  }).eq('kunci', kunci)
  if (error) throw new Error(error.message)
  refreshAll()
}
