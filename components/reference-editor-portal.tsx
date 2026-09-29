'use client'

import { useEffect, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { useRouter } from 'next/navigation'

export function ReferenceEditorPortal({ closeHref, children }: { closeHref: string; children: ReactNode }) {
  const router = useRouter()
  const [mounted, setMounted] = useState(false)

  useEffect(() => setMounted(true), [])

  useEffect(() => {
    if (!mounted) return
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    const close = () => router.replace(closeHref, { scroll: false })
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close()
    }

    window.addEventListener('keydown', onKeyDown)
    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [closeHref, mounted, router])

  if (!mounted) return null

  const close = () => router.replace(closeHref, { scroll: false })

  return createPortal(
    <div className="reference-editor-layer" role="presentation">
      <button className="reference-editor-backdrop" type="button" aria-label="Tutup editor" onClick={close} />
      <section className="reference-editor-modal" role="dialog" aria-modal="true" aria-label="Edit referensi konten">
        {children}
      </section>
    </div>,
    document.body,
  )
}
