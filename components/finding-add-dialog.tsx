'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { createFinding } from '@/lib/actions/knowledge'
import { DirectUploadField } from '@/components/direct-upload-field'
import { PendingSubmitButton } from '@/components/pending-submit-button'

type ProgramOption = {
  id: number
  name: string
}

const categories = ['Temuan', 'Positif', 'Perlu Perhatian', 'Potensi', 'Tindak Lanjut']

export function FindingAddDialog({
  today,
  selectedOpd,
  programs,
  opdNames,
}: {
  today: string
  selectedOpd: string
  programs: ProgramOption[]
  opdNames: string[]
}) {
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
      await createFinding(formData)
      setOpen(false)
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Temuan gagal disimpan.')
    }
  }

  return (
    <>
      <button
        className="media-add-icon finding-add-icon"
        type="button"
        aria-label="Tambah temuan OPD"
        title="Tambah temuan OPD"
        onClick={() => { setError(''); setOpen(true) }}
      >
        <span aria-hidden>＋</span>
      </button>

      {mounted && open ? createPortal(
        <div className="media-editor-layer finding-editor-layer" role="presentation">
          <button className="media-editor-backdrop" type="button" aria-label="Tutup form tambah temuan" onClick={() => setOpen(false)} />
          <section className="media-editor-modal finding-editor-modal" role="dialog" aria-modal="true" aria-labelledby="finding-add-title">
            <div className="media-editor-head">
              <div>
                <p className="eyebrow">TEMUAN OPD</p>
                <h2 id="finding-add-title">Tambah Temuan</h2>
                <span>Form disembunyikan dari tampilan utama agar halaman tetap bersih saat dipakai untuk paparan.</span>
              </div>
              <button className="media-editor-close" type="button" aria-label="Tutup" onClick={() => setOpen(false)}>×</button>
            </div>

            <form action={submit} className="media-editor-form finding-editor-form">
              <label className="media-editor-wide">Nama OPD<input name="opd_name" list="finding-opd-options" required defaultValue={selectedOpd} placeholder="Pilih atau ketik nama OPD" autoFocus /></label>
              <datalist id="finding-opd-options">{opdNames.map((name) => <option value={name} key={name} />)}</datalist>
              <label className="media-editor-wide">Judul Temuan<input name="title" required placeholder="Apa yang menarik/perlu dicatat?" /></label>
              <label>Kategori<select name="category" defaultValue="Temuan">{categories.map((category) => <option key={category}>{category}</option>)}</select></label>
              <label>Tanggal<input name="finding_date" type="date" defaultValue={today} required /></label>
              <label className="media-editor-wide">Detail<textarea name="detail" placeholder="Jelaskan konteks, angka, potensi, atau tindak lanjut." /></label>
              <label>Terkait 9 BERANI<select name="berani_program_id" defaultValue=""><option value="">Tidak terkait khusus</option>{programs.map((program) => <option value={program.id} key={program.id}>{program.name}</option>)}</select></label>
              <label>Nama Sumber<input name="source_label" placeholder="Contoh: Kunjungan OPD / Paparan Kadis" /></label>
              <label className="media-editor-wide">Link Sumber<input name="source_url" type="url" placeholder="https://..." /></label>

              <div className="finding-editor-upload">
                <DirectUploadField
                  kind="finding-document"
                  name="finding_uploads"
                  label="Lampiran"
                  accept=".pdf,.xlsx,.xls,.docx,.doc,.pptx,.ppt,.csv,.png,.jpg,.jpeg,.webp"
                  multiple
                  maxFiles={10}
                  helpText="Bisa pilih hingga 10 file, maksimal 20 MB per file. File diunggah langsung ke Supabase."
                />
              </div>

              {error ? <div className="media-editor-error" role="alert">{error}</div> : null}
              <div className="media-editor-actions">
                <button className="ghost-button dark" type="button" onClick={() => setOpen(false)}>Batal</button>
                <PendingSubmitButton className="primary-button" pendingLabel="Menyimpan temuan…">Simpan Temuan</PendingSubmitButton>
              </div>
            </form>
          </section>
        </div>,
        document.body,
      ) : null}
    </>
  )
}
