'use client'

import { createClient } from '@supabase/supabase-js'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

export function ContentReferenceLive() {
  const router = useRouter()

  useEffect(() => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
    if (!url || !key) return

    const supabase = createClient(url, key)
    const channel = supabase
      .channel('content-references-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'content_references' }, () => router.refresh())
      .subscribe()

    return () => { void supabase.removeChannel(channel) }
  }, [router])

  return null
}
