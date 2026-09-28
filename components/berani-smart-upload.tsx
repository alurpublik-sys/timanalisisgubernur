'use client'

import { useRef, useState } from 'react'

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
      const content = await page.getTextContent()
      let text = pageText(content.items || [])

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
  name?: string
  required?: boolean
  buttonLabel: string
  buttonClassName?: string
  helpText?: string
}

export function BeraniSmartUpload({
  name = 'document_files',
  required = false,
  buttonLabel,
  buttonClassName = 'primary-button',
  helpText = 'PDF visual akan dibaca dengan OCR otomatis. Excel/CSV menjadi tabel; Word/PowerPoint dibaca sebagai dokumen; foto juga dipindai bila mengandung teks.',
}: Props) {
  const [busy, setBusy] = useState(false)
  const [status, setStatus] = useState('Siap menerima dokumen.')
  const [ocrJson, setOcrJson] = useState('{}')
  const generation = useRef(0)

  async function onFiles(event: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files || [])
    generation.current += 1
    const ownGeneration = generation.current
    if (!files.length) {
      setOcrJson('{}')
      setStatus('Siap menerima dokumen.')
      return
    }

    setBusy(true)
    setStatus('Memeriksa dokumen…')
    const extracted: Record<string, string> = {}

    try {
      for (let index = 0; index < files.length; index += 1) {
        if (ownGeneration !== generation.current) return
        const file = files[index]
        const lower = file.name.toLowerCase()
        setStatus(`Memproses ${index + 1}/${files.length} · ${file.name}`)

        if (lower.endsWith('.pdf')) {
          const text = await extractPdf(file, setStatus)
          if (text) extracted[file.name] = text
        } else if (/\.(png|jpe?g|webp)$/.test(lower)) {
          const text = await extractImage(file, setStatus)
          if (text) extracted[file.name] = text
        }
      }

      if (ownGeneration !== generation.current) return
      setOcrJson(JSON.stringify(extracted))
      const scanned = Object.keys(extracted).length
      setStatus(scanned
        ? `${files.length} dokumen siap · ${scanned} sumber visual berhasil dibaca otomatis.`
        : `${files.length} dokumen siap. Dokumen bertulisan akan diproses di server.`)
    } catch (error) {
      console.error(error)
      setOcrJson(JSON.stringify(extracted))
      setStatus('OCR visual tidak selesai seluruhnya. File tetap bisa disimpan dan bagian yang terbaca tetap akan diolah.')
    } finally {
      if (ownGeneration === generation.current) setBusy(false)
    }
  }

  return <div className="berani-smart-upload">
    <label>
      Dokumen Sumber
      <input name={name} type="file" multiple={true} required={required}
        accept=".pdf,.xlsx,.xls,.docx,.doc,.pptx,.ppt,.csv,.png,.jpg,.jpeg,.webp"
        onChange={onFiles} />
    </label>
    <input type="hidden" name="document_ocr_json" value={ocrJson} readOnly />
    <div className={`smart-upload-status${busy ? ' is-processing' : ''}`}>
      <span className="smart-upload-dot" />
      <div><strong>{busy ? 'Sedang membaca dokumen' : 'Pemrosesan otomatis'}</strong><small>{status}</small></div>
    </div>
    <small className="muted-line">{helpText}</small>
    <button className={buttonClassName} type="submit" disabled={busy}>{busy ? 'Tunggu pemrosesan…' : buttonLabel}</button>
  </div>
}
