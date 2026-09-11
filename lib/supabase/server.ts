import 'server-only'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/database.types'
import { getAdminSessionToken } from '@/lib/pin-session'

const DEFAULT_SUPABASE_URL = 'https://suiiaiuxkhdsqufswpfv.supabase.co'
const DEFAULT_SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_dtMWWlvdj-Qzui7DFQfGTw_SRlc5SDh'

export async function createClient(
  sessionToken?: string | null,
  extraHeaders: Record<string, string> = {},
) {
  // URL + publishable key are public client configuration, not secrets.
  // Keep env overrides when available, with safe fallbacks so the Git-linked
  // Vercel project cannot fail only because its environment variables are absent.
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || DEFAULT_SUPABASE_URL
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || DEFAULT_SUPABASE_PUBLISHABLE_KEY

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
