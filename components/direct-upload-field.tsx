'use client'

import { useId, useRef, useState } from 'react'
import type { ChangeEvent } from 'react'
import { createDirectUploadTicket } from '@/lib/actions/uploads'
import { createBrowserClient } from '@/lib/supabase/browser'
import type { DirectUploadDescriptor, UploadKind } from '@/lib/upload-config'

type Props = {
  kind: UploadKind
  name: string
  label: string
  accept: string
  multiple?: boolean
  maxFiles?: number
  helpText?: string
  scope?: string
  required?: boolean
}

export function DirectUploadField({
  kind,
  name,
  label,
  accept,
  multiple = false,
  maxFiles = 1,
  helpText,
  scope,
  required = false,
}: Props) {
  const id = useId()
  const generation = useRef(0)
  const [uploads, setUploads] = useState<DirectUploadDescriptor[]>([])
  const [expected, setExpected] = useState(0)
  const [busy, setBusy] = useState(false)
  const [status, setStatus] = useState('Belum ada file dipilih.')
  const [error, setError] = useState('')

  async function handleFiles(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files || [])
    generation.current += 1
    const ownGeneration = generation.current
    setUploads([])
    setExpected(files.length)
    setError('')

    if (!files.length) {
      setBusy(false)
      setStatus('Belum ada file dipilih.')
      return
    }
    if (files.length > maxFiles) {
      event.target.value = ''
      setExpected(0)
      setError(`Maksimum ${maxFiles} file dalam satu kali pilih.`)
      setStatus('Pilih ulang file.')
      return
    }

    setBusy(true)
    const completed: DirectUploadDescriptor[] = []

    try {
      const supabase = createBrowserClient()
      for (let index = 0; index < files.length; index += 1) {
        if (generation.current !== ownGeneration) return
        const file = files[index]
        setStatus(`Mengunggah ${index + 1}/${files.length} · ${file.name}`)

        const ticket = await createDirectUploadTicket({
          kind,
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
      }

      if (generation.current !== ownGeneration) return
      setStatus(`${completed.length} file siap disimpan.`)
    } catch (uploadError) {
      console.error(uploadError)
      setError(uploadError instanceof Error ? uploadError.message : 'Upload gagal.')
      setStatus(completed.length ? `${completed.length}/${files.length} file berhasil. Pilih ulang agar lengkap.` : 'Upload gagal. Pilih ulang file.')
    } finally {
      if (generation.current === ownGeneration) setBusy(false)
    }
  }

  return (
    <div className="direct-upload-field">
      <label htmlFor={id}>{label}</label>
      <input
        id={id}
        type="file"
        accept={accept}
        multiple={multiple}
        required={required}
        onChange={handleFiles}
        aria-describedby={`${id}-status`}
      />
      <input type="hidden" name={name} value={JSON.stringify(uploads)} readOnly />
      <input type="hidden" name={`${name}_expected`} value={String(expected)} readOnly />
      <div id={`${id}-status`} className={`direct-upload-status${busy ? ' is-uploading' : ''}${error ? ' has-error' : ''}`}>
        <span className="direct-upload-dot" aria-hidden />
        <div>
          <strong>{busy ? 'Mengunggah langsung ke Supabase…' : error ? 'Upload perlu diulang' : uploads.length ? 'Siap disimpan' : 'Upload langsung'}</strong>
          <small>{error || status}</small>
        </div>
      </div>
      {helpText ? <small className="muted-line">{helpText}</small> : null}
    </div>
  )
}
