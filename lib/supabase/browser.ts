'use client'

import { createClient as createSupabaseClient } from '@supabase/supabase-js'

const DEFAULT_SUPABASE_URL = 'https://suiiaiuxkhdsqufswpfv.supabase.co'
const DEFAULT_SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_dtMWWlvdj-Qzui7DFQfGTw_SRlc5SDh'

let browserClient: ReturnType<typeof createSupabaseClient> | null = null

export function createBrowserClient() {
  if (browserClient) return browserClient
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || DEFAULT_SUPABASE_URL
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || DEFAULT_SUPABASE_PUBLISHABLE_KEY

  browserClient = createSupabaseClient(url, publishableKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  })

  return browserClient
}
