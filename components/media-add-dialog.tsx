'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { createMedia } from '@/lib/actions/core'
import { PendingSubmitButton } from '@/components/pending-submit-button'

export function MediaAddDialog({ today }: { today: string }) {
  const [mounted, setMounted] = useState(false)
  const [open, setOpen] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => setMounted(true), [])

  useEffect(() => {
    if (!open) return
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', closeOnEscape)
    return () => {
      document.body.style.overflow = previous
      window.removeEventListener('keydown', closeOnEscape)
    }
  }, [open])

  async function submit(formData: FormData) {
    setError('')
    try {
      await createMedia(formData)
      setOpen(false)
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Berita gagal disimpan.')
    }
  }

  return (
    <>
      <button
        className="media-add-icon"
        type="button"
        aria-label="Tambah berita"
        title="Tambah berita"
        onClick={() => { setError(''); setOpen(true) }}
      >
        <span aria-hidden>＋</span>
      </button>

      {mounted && open ? createPortal(
        <div className="media-editor-layer" role="presentation">
          <button className="media-editor-backdrop" type="button" aria-label="Tutup form tambah berita" onClick={() => setOpen(false)} />
          <section className="media-editor-modal" role="dialog" aria-modal="true" aria-labelledby="media-add-title">
            <div className="media-editor-head">
              <div><p className="eyebrow">MEDIA MONITOR</p><h2 id="media-add-title">Tambah Berita</h2><span>Hanya tersedia saat mode edit dengan PIN administrator aktif.</span></div>
              <button className="media-editor-close" type="button" aria-label="Tutup" onClick={() => setOpen(false)}>×</button>
            </div>

            <form action={submit} className="media-editor-form">
              <label className="media-editor-wide">Judul Berita<input name="judul" required autoFocus /></label>
              <label>Nama Media<input name="media" /></label>
              <label>Tanggal<input name="tanggal" type="date" defaultValue={today} required /></label>
              <label>Sentimen<select name="sentimen" defaultValue="Netral"><option>Positif</option><option>Netral</option><option>Negatif</option></select></label>
              <label>Link Berita<input name="link" type="url" placeholder="https://..." /></label>
              {error ? <div className="media-editor-error" role="alert">{error}</div> : null}
              <div className="media-editor-actions">
                <button className="ghost-button dark" type="button" onClick={() => setOpen(false)}>Batal</button>
                <PendingSubmitButton className="primary-button" pendingLabel="Menyimpan berita…">Simpan Berita</PendingSubmitButton>
              </div>
            </form>
          </section>
        </div>,
        document.body,
      ) : null}
    </>
  )
}
