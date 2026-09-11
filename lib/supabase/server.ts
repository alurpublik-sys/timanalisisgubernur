import 'server-only'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/database.types'
import { getAdminSessionToken } from '@/lib/pin-session'

export async function createClient(
  sessionToken?: string | null,
  extraHeaders: Record<string, string> = {},
) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY

  if (!url) throw new Error('NEXT_PUBLIC_SUPABASE_URL belum dikonfigurasi.')
  if (!publishableKey) throw new Error('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY belum dikonfigurasi.')

  const token = sessionToken === undefined ? await getAdminSessionToken() : sessionToken
  const headers: Record<string, string> = { ...extraHeaders }
  if (token) headers['x-ah-session'] = token

  return createSupabaseClient<Database>(url, publishableKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
    global: { headers },
  })
}
