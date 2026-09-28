'use server'

import { revalidatePath } from 'next/cache'
import { requireActionUser } from '@/lib/auth'

function text(fd: FormData, key: string) {
  return String(fd.get(key) ?? '').trim()
}

function idValue(fd: FormData) {
  const id = Number(text(fd, 'id'))
  if (!Number.isSafeInteger(id) || id <= 0) throw new Error('ID catatan tidak valid.')
  return id
}

function featureKey(fd: FormData) {
  const value = text(fd, 'feature_key')
  if (!/^[a-z0-9_-]{2,80}$/.test(value)) throw new Error('Fitur catatan tidak valid.')
  return value
}

function entityKey(fd: FormData) {
  const value = text(fd, 'entity_key') || '__module__'
  if (value.length > 180) throw new Error('Target catatan tidak valid.')
  return value
}

function noteContent(fd: FormData) {
  const value = text(fd, 'content')
  if (!value) throw new Error('Isi catatan wajib diisi.')
  if (value.length > 12000) throw new Error('Catatan terlalu panjang.')
  return value
}

function noteTitle(fd: FormData) {
  const value = text(fd, 'title')
  if (value.length > 300) throw new Error('Judul catatan terlalu panjang.')
  return value || null
}

function returnPath(fd: FormData) {
  const value = text(fd, 'return_path')
  return value.startsWith('/') && !value.startsWith('//') ? value : '/dashboard'
}

function refresh(path: string) {
  revalidatePath(path)
  revalidatePath('/dashboard')
}

export async function createFeatureNote(fd: FormData) {
  const supabase = (await requireActionUser(['admin'])).supabase
  const path = returnPath(fd)
  const { error } = await supabase.from('feature_notes').insert({
    feature_key: featureKey(fd),
    entity_key: entityKey(fd),
    title: noteTitle(fd),
    content: noteContent(fd),
  })
  if (error) throw new Error(error.message)
  refresh(path)
}

export async function updateFeatureNote(fd: FormData) {
  const supabase = (await requireActionUser(['admin'])).supabase
  const path = returnPath(fd)
  const { error } = await supabase.from('feature_notes').update({
    title: noteTitle(fd),
    content: noteContent(fd),
    updated_at: new Date().toISOString(),
  }).eq('id', idValue(fd))
  if (error) throw new Error(error.message)
  refresh(path)
}

export async function deleteFeatureNote(fd: FormData) {
  const supabase = (await requireActionUser(['admin'])).supabase
  const path = returnPath(fd)
  const { error } = await supabase.from('feature_notes').delete().eq('id', idValue(fd))
  if (error) throw new Error(error.message)
  refresh(path)
}
