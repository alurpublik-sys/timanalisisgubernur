'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { clearAdminSession, createAdminSession, getAdminSessionToken } from '@/lib/pin-session'

export type LoginState = { error: string }

function errorMessage(code?: string | null) {
  if (code === 'rate_limited') return 'Terlalu banyak percobaan. Akses dikunci sementara selama 15 menit.'
  if (code === 'configuration_missing') return 'PIN admin belum dikonfigurasi.'
  return 'PIN admin salah.'
}

export async function loginWithPin(_state: LoginState, formData: FormData): Promise<LoginState> {
  const pin = String(formData.get('pin') ?? '').trim()
  if (!/^\d{6}$/.test(pin)) return { error: 'PIN harus terdiri dari 6 angka.' }

  const supabase = await createClient()
  const { data, error } = await supabase.rpc('ah_admin_login', { p_pin: pin })
  if (error) throw new Error(`Gagal memproses login admin: ${error.message}`)

  const row = Array.isArray(data) ? data[0] : null
  if (!row?.success || !row.session_token) return { error: errorMessage(row?.error_code) }

  await createAdminSession(row.session_token, row.expires_at)
  redirect('/dashboard')
}

export async function changeAdminPin(formData: FormData) {
  const newPin = String(formData.get('new_pin') ?? '').trim()
  const confirmation = String(formData.get('confirm_pin') ?? '').trim()
  if (!/^\d{6}$/.test(newPin)) throw new Error('PIN baru harus terdiri dari 6 angka.')
  if (newPin !== confirmation) throw new Error('Konfirmasi PIN tidak sama.')

  const token = await getAdminSessionToken()
  if (!token) throw new Error('Sesi admin tidak valid. Masukkan PIN kembali.')
  const supabase = await createClient(token)
  const { data, error } = await supabase.rpc('ah_admin_change_pin', { p_new_pin: newPin })
  if (error) throw new Error(`Gagal mengganti PIN admin: ${error.message}`)
  if (!data) throw new Error('PIN admin tidak berhasil diganti.')

  await clearAdminSession()
  redirect('/login?pin_changed=1')
}

export async function logoutPinAdmin() {
  const token = await getAdminSessionToken()
  if (token) {
    const supabase = await createClient(token)
    await supabase.rpc('ah_admin_logout')
  }
  await clearAdminSession()
  redirect('/login')
}
