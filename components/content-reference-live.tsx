'use client'

import { createClient } from '@supabase/supabase-js'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

export function ContentReferenceLive() {
  const router = useRouter()

  useEffect(() => {
    const syncEditorState = () => {
      const editors = Array.from(document.querySelectorAll<HTMLDetailsElement>('.reference-inline-editor[open]'))
      document.body.classList.toggle('reference-editor-open', editors.length > 0)
    }

    const closeEditors = (except?: HTMLDetailsElement) => {
      document.querySelectorAll<HTMLDetailsElement>('.reference-inline-editor[open]').forEach((editor) => {
        if (editor !== except) editor.removeAttribute('open')
      })
      syncEditorState()
    }

    const handleToggle = (event: Event) => {
      const editor = event.target as HTMLDetailsElement | null
      if (!editor?.classList?.contains('reference-inline-editor')) return
      if (editor.open) closeEditors(editor)
      syncEditorState()
    }

    const handlePointerDown = (event: PointerEvent) => {
      const openEditor = document.querySelector<HTMLDetailsElement>('.reference-inline-editor[open]')
      if (!openEditor) return
      const target = event.target as Node | null
      if (target && !openEditor.contains(target)) closeEditors()
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeEditors()
    }

    document.addEventListener('toggle', handleToggle, true)
    document.addEventListener('pointerdown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
    if (!url || !key) return
    const supabase = createClient(url, key)
    const channel = supabase
      .channel('content-references-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'content_references' }, () => router.refresh())
      .subscribe()

    return () => {
      void supabase.removeChannel(channel)
      document.removeEventListener('toggle', handleToggle, true)
      document.removeEventListener('pointerdown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
      document.body.classList.remove('reference-editor-open')
    }
  }, [router])

  return null
}
