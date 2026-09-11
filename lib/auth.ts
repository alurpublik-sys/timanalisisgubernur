import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { hasAdminSession } from '@/lib/pin-session'

export type AppRole = 'admin' | 'editor' | 'viewer'

const PIN_ADMIN_USER = { id: 'pin-admin', email: null as string | null }
const PIN_ADMIN_PROFILE = {
  user_id: 'pin-admin',
  email: null as string | null,
  full_name: 'Administrator',
  role: 'admin' as const,
  active: true,
}

export async function getAuthContext() {
  const supabase = await createClient()
  const active = await hasAdminSession()
  if (!active) return { supabase, user: null, profile: null }
  return { supabase, user: PIN_ADMIN_USER, profile: PIN_ADMIN_PROFILE }
}

export async function requireUser() {
  const context = await getAuthContext()
  if (!context.user || !context.profile) redirect('/login')
  return context as typeof context & { user: typeof PIN_ADMIN_USER; profile: typeof PIN_ADMIN_PROFILE }
}

export async function requireActionUser(allowedRoles: AppRole[] = ['admin']) {
  const { supabase, user, profile } = await getAuthContext()
  if (!user || !profile) throw new Error('Sesi admin tidak valid. Masukkan PIN kembali.')
  if (!allowedRoles.includes('admin')) throw new Error('Tindakan ini tidak tersedia untuk mode admin PIN.')
  return { supabase, user, profile }
}
