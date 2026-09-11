import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export type AppRole = 'admin' | 'editor' | 'viewer'

export async function getAuthContext() {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) return { supabase, user: null, profile: null }

  const { data: profile } = await supabase
    .from('profiles')
    .select('user_id,email,full_name,role,active')
    .eq('user_id', user.id)
    .maybeSingle()

  return { supabase, user, profile }
}

export async function requireUser() {
  const context = await getAuthContext()
  if (!context.user) redirect('/login')
  if (!context.profile || !context.profile.active) redirect('/access-pending')
  return context as typeof context & { user: NonNullable<typeof context.user>; profile: NonNullable<typeof context.profile> }
}

export async function requireActionUser(allowedRoles: AppRole[] = ['admin', 'editor']) {
  const { supabase, user, profile } = await getAuthContext()
  if (!user) throw new Error('Sesi login tidak valid. Silakan masuk kembali.')
  if (!profile || !profile.active) throw new Error('Akses AH Center belum diaktifkan.')
  if (!allowedRoles.includes(profile.role as AppRole)) throw new Error('Anda tidak memiliki izin untuk melakukan tindakan ini.')
  return { supabase, user, profile }
}
