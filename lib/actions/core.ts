'use server'

import { revalidatePath } from 'next/cache'
import { requireActionUser } from '@/lib/auth'

function value(formData: FormData, key: string) {
  return String(formData.get(key) ?? '').trim()
}

function required(formData: FormData, key: string, label: string) {
  const result = value(formData, key)
  if (!result) throw new Error(`${label} wajib diisi.`)
  return result
}

function refresh(...paths: string[]) {
  paths.forEach((path) => revalidatePath(path))
}

export async function createKunjungan(formData: FormData) {
  const { supabase } = await requireActionUser()
  const payload = {
    nama_opd: required(formData, 'opd', 'Nama OPD'),
    tanggal: required(formData, 'tanggal', 'Tanggal'),
    pejabat: value(formData, 'pejabat'),
    anggota_tim: value(formData, 'anggota'),
    topik: required(formData, 'topik', 'Topik pembahasan'),
    status: value(formData, 'status') || 'Terjadwal',
    link_notulen: value(formData, 'link_notulen'),
  }
  const { error } = await supabase.from('kunjungan').insert(payload)
  if (error) throw new Error(error.message)
  refresh('/kunjungan', '/dashboard')
}

export async function createIsu(formData: FormData) {
  const { supabase } = await requireActionUser()
  const payload = {
    nama_isu: required(formData, 'nama', 'Nama isu'),
    opd_terkait: value(formData, 'opd'),
    prioritas: value(formData, 'prioritas'),
    ringkasan: value(formData, 'ringkasan'),
    status_monitoring: value(formData, 'status') || 'Monitoring',
  }
  const { error } = await supabase.from('isu_strategis').insert(payload)
  if (error) throw new Error(error.message)
  refresh('/isu-strategis', '/dashboard')
}

export async function createPolicy(formData: FormData) {
  const { supabase } = await requireActionUser()
  const payload = {
    judul: required(formData, 'judul', 'Judul'),
    opd_terkait: value(formData, 'opd'),
    ringkasan: value(formData, 'ringkasan'),
    pic: value(formData, 'pic'),
    status: value(formData, 'status') || 'Draft',
    link_doc: value(formData, 'link'),
  }
  const { error } = await supabase.from('rekomendasi').insert(payload)
  if (error) throw new Error(error.message)
  refresh('/policy-brief', '/dashboard')
}

export async function createMedia(formData: FormData) {
  const { supabase } = await requireActionUser()
  const payload = {
    judul_berita: required(formData, 'judul', 'Judul berita'),
    nama_media: value(formData, 'media'),
    tanggal: required(formData, 'tanggal', 'Tanggal'),
    sentimen: value(formData, 'sentimen'),
    link_berita: value(formData, 'link'),
  }
  const { error } = await supabase.from('media_monitoring').insert(payload)
  if (error) throw new Error(error.message)
  refresh('/media-monitor')
}

export async function createAgenda(formData: FormData) {
  const { supabase } = await requireActionUser()
  const payload = {
    nama_agenda: required(formData, 'nama', 'Nama agenda'),
    tanggal: required(formData, 'tanggal', 'Tanggal'),
    tipe: value(formData, 'tipe'),
    status: value(formData, 'status') || 'Terjadwal',
    pic: value(formData, 'pic'),
  }
  const { error } = await supabase.from('agenda').insert(payload)
  if (error) throw new Error(error.message)
  refresh('/agenda', '/dashboard')
}

export async function updateTimLinks(formData: FormData) {
  const { supabase } = await requireActionUser(['admin'])
  const id = Number(required(formData, 'id', 'ID tim'))
  if (!Number.isFinite(id)) throw new Error('ID anggota tidak valid.')
  const { error } = await supabase
    .from('tim_analisis')
    .update({ link_foto: value(formData, 'link_foto'), link_cv: value(formData, 'link_cv') })
    .eq('id', id)
  if (error) throw new Error(error.message)
  refresh('/tim-analisis')
}
