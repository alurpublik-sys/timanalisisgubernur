'use client'

import { useRef, useState } from 'react'
import type { ChangeEvent } from 'react'
import { createDirectUploadTicket } from '@/lib/actions/uploads'
import { createBrowserClient } from '@/lib/supabase/browser'
import type { DirectUploadDescriptor } from '@/lib/upload-config'

declare global {
  interface Window {
    pdfjsLib?: {
      GlobalWorkerOptions: { workerSrc: string }
      getDocument: (source: { data: ArrayBuffer }) => { promise: Promise<any> }
    }
    Tesseract?: {
      createWorker: (languages?: string, oem?: number, options?: Record<string, unknown>) => Promise<any>
    }
  }
}

const PDF_JS = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js'
const PDF_WORKER = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js'
const TESSERACT_JS = 'https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js'
const MAX_OCR_PAGES = 24
const MAX_OCR_CHARS = 90000
const MAX_FILES = 10

function loadScript(src: string) {
  return new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[data-berani-src="${src}"]`)
    if (existing?.dataset.loaded === '1') return resolve()
    if (existing) {
      existing.addEventListener('load', () => resolve(), { once: true })
      existing.addEventListener('error', () => reject(new Error('Library pemrosesan gagal dimuat.')), { once: true })
      return
    }
    const script = document.createElement('script')
    script.src = src
    script.async = true
    script.dataset.beraniSrc = src
    script.addEventListener('load', () => { script.dataset.loaded = '1'; resolve() }, { once: true })
    script.addEventListener('error', () => reject(new Error('Library pemrosesan gagal dimuat.')), { once: true })
    document.head.appendChild(script)
  })
}

async function ensurePdf() {
  if (!window.pdfjsLib) await loadScript(PDF_JS)
  if (!window.pdfjsLib) throw new Error('Pembaca PDF tidak tersedia.')
  window.pdfjsLib.GlobalWorkerOptions.workerSrc = PDF_WORKER
  return window.pdfjsLib
}

async function ensureTesseract() {
  if (!window.Tesseract) await loadScript(TESSERACT_JS)
  if (!window.Tesseract) throw new Error('Mesin OCR tidak tersedia.')
  return window.Tesseract
}

function pageText(items: any[]) {
  return items
    .map((item) => typeof item?.str === 'string' ? item.str : '')
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim()
}

async function extractPdf(file: File, onStatus: (message: string) => void) {
  const pdfjs = await ensurePdf()
  const pdf = await pdfjs.getDocument({ data: await file.arrayBuffer() }).promise
  const pages: string[] = []
  let worker: any = null

  try {
    for (let index = 1; index <= Math.min(pdf.numPages, MAX_OCR_PAGES); index += 1) {
      const page = await pdf.getPage(index)
      const textContent = await page.getTextContent()
      let text = pageText(textContent.items || [])

      if ((text.match(/[A-Za-zÀ-ÿ0-9]/g)?.length ?? 0) < 45) {
        onStatus(`Membaca visual PDF · halaman ${index}/${Math.min(pdf.numPages, MAX_OCR_PAGES)}`)
        if (!worker) {
          const Tesseract = await ensureTesseract()
          worker = await Tesseract.createWorker('eng')
        }
        const viewport = page.getViewport({ scale: 1.45 })
        const canvas = document.createElement('canvas')
        const context = canvas.getContext('2d', { willReadFrequently: true })
        if (!context) throw new Error('Canvas OCR tidak tersedia.')
        canvas.width = Math.ceil(viewport.width)
        canvas.height = Math.ceil(viewport.height)
        await page.render({ canvasContext: context, viewport }).promise
        const result = await worker.recognize(canvas)
        text = String(result?.data?.text || '').replace(/\s+\n/g, '\n').trim()
        canvas.width = 1
        canvas.height = 1
      }

      if (text) pages.push(`[HALAMAN ${index}]\n${text}`)
    }
  } finally {
    if (worker) await worker.terminate()
  }

  return pages.join('\n\n').slice(0, MAX_OCR_CHARS)
}

async function extractImage(file: File, onStatus: (message: string) => void) {
  onStatus(`Membaca teks pada ${file.name}`)
  const Tesseract = await ensureTesseract()
  const worker = await Tesseract.createWorker('eng')
  try {
    const result = await worker.recognize(file)
    return String(result?.data?.text || '').slice(0, MAX_OCR_CHARS)
  } finally {
    await worker.terminate()
  }
}

type Props = {
  required?: boolean
  buttonLabel: string
  buttonClassName?: string
  helpText?: string
  scope?: string
}

export function BeraniSmartUpload({
  required = false,
  buttonLabel,
  buttonClassName = 'primary-button',
  helpText = 'Dokumen diproses otomatis lalu diunggah langsung ke Supabase.',
  scope = 'berani',
}: Props) {
  const [busy, setBusy] = useState(false)
  const [status, setStatus] = useState('Siap menerima dokumen.')
  const [error, setError] = useState('')
  const [ocrJson, setOcrJson] = useState('{}')
  const [uploads, setUploads] = useState<DirectUploadDescriptor[]>([])
  const [expected, setExpected] = useState(0)
  const generation = useRef(0)

  async function onFiles(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files || [])
    generation.current += 1
    const ownGeneration = generation.current
    setExpected(files.length)
    setUploads([])
    setError('')

    if (!files.length) {
      setOcrJson('{}')
      setStatus('Siap menerima dokumen.')
      setBusy(false)
      return
    }
    if (files.length > MAX_FILES) {
      event.target.value = ''
      setExpected(0)
      setError(`Maksimum ${MAX_FILES} dokumen dalam sekali upload.`)
      setStatus('Pilih ulang dokumen.')
      return
    }

    setBusy(true)
    setStatus('Memeriksa dokumen…')
    const extracted: Record<string, string> = {}
    const completed: DirectUploadDescriptor[] = []

    try {
      const supabase = createBrowserClient()

      for (let index = 0; index < files.length; index += 1) {
        if (ownGeneration !== generation.current) return
        const file = files[index]
        const lower = file.name.toLowerCase()
        setStatus(`Memproses ${index + 1}/${files.length} · ${file.name}`)

        try {
          if (lower.endsWith('.pdf')) {
            const text = await extractPdf(file, setStatus)
            if (text) extracted[file.name] = text
          } else if (/\.(png|jpe?g|webp)$/.test(lower)) {
            const text = await extractImage(file, setStatus)
            if (text) extracted[file.name] = text
          }
        } catch (ocrError) {
          console.warn('[berani-upload] OCR dilewati', file.name, ocrError)
        }

        setStatus(`Mengunggah ${index + 1}/${files.length} · ${file.name}`)
        const ticket = await createDirectUploadTicket({
          kind: 'berani-document',
          fileName: file.name,
          size: file.size,
          mimeType: file.type,
          scope,
        })

        const { error: uploadError } = await supabase.storage
          .from(ticket.descriptor.bucket)
          .uploadToSignedUrl(ticket.descriptor.path, ticket.token, file, {
            contentType: file.type || undefined,
            cacheControl: '3600',
          })

        if (uploadError) throw new Error(`Upload ${file.name} gagal: ${uploadError.message}`)
        completed.push(ticket.descriptor)
        setUploads([...completed])
        setOcrJson(JSON.stringify(extracted))
      }

      if (ownGeneration !== generation.current) return
      const scanned = Object.keys(extracted).length
      setStatus(scanned
        ? `${completed.length} dokumen siap disimpan · ${scanned} sumber visual berhasil dibaca.`
        : `${completed.length} dokumen siap disimpan.`)
    } catch (uploadError) {
      console.error(uploadError)
      setOcrJson(JSON.stringify(extracted))
      setUploads([...completed])
      setError(uploadError instanceof Error ? uploadError.message : 'Upload dokumen gagal.')
      setStatus(`${completed.length}/${files.length} dokumen berhasil. Pilih ulang dokumen agar lengkap.`)
    } finally {
      if (ownGeneration === generation.current) setBusy(false)
    }
  }

  const incomplete = expected > uploads.length

  return <div className="berani-smart-upload">
    <label>
      Dokumen Sumber
      <input
        type="file"
        multiple
        required={required}
        accept=".pdf,.xlsx,.xls,.docx,.doc,.pptx,.ppt,.csv,.png,.jpg,.jpeg,.webp"
        onChange={onFiles}
      />
    </label>
    <input type="hidden" name="document_uploads" value={JSON.stringify(uploads)} readOnly />
    <input type="hidden" name="document_uploads_expected" value={String(expected)} readOnly />
    <input type="hidden" name="document_ocr_json" value={ocrJson} readOnly />
    <div className={`smart-upload-status${busy ? ' is-processing' : ''}${error ? ' has-error' : ''}`}>
      <span className="smart-upload-dot" />
      <div>
        <strong>{busy ? 'Sedang memproses & mengunggah' : error ? 'Upload perlu diulang' : uploads.length ? 'Dokumen siap disimpan' : 'Pemrosesan otomatis'}</strong>
        <small>{error || status}</small>
      </div>
    </div>
    <small className="muted-line">{helpText}</small>
    <button className={buttonClassName} type="submit" disabled={busy || incomplete}>
      {busy ? 'Tunggu upload selesai…' : incomplete ? 'Lengkapi upload…' : buttonLabel}
    </button>
  </div>
}
