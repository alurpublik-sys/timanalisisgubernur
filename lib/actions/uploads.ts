'use server'

import { requireActionUser } from '@/lib/auth'
import { validateUploadMetadata } from '@/lib/direct-uploads'
import type { DirectUploadDescriptor, UploadKind } from '@/lib/upload-config'

function safeScope(value?: string) {
  const normalized = String(value || 'general').toLowerCase().replace(/[^a-z0-9_-]+/g, '-').replace(/^-+|-+$/g, '')
  return normalized.slice(0, 80) || 'general'
}

export async function createDirectUploadTicket(input: {
  kind: UploadKind
  fileName: string
  size: number
  mimeType?: string
  scope?: string
}): Promise<{ descriptor: DirectUploadDescriptor; token: string }> {
  const { supabase } = await requireActionUser(['admin'])
  const { spec, extension, fileName } = validateUploadMetadata(input)
  const path = `direct/${input.kind}/${safeScope(input.scope)}/${Date.now()}-${crypto.randomUUID()}.${extension}`

  const { data, error } = await supabase.storage
    .from(spec.bucket)
    .createSignedUploadUrl(path, { upsert: false })

  if (error || !data?.token) {
    console.error('[direct-upload] ticket failed', {
      kind: input.kind,
      bucket: spec.bucket,
      size: input.size,
      error: error?.message || 'token missing',
    })
    throw new Error(`Gagal menyiapkan upload: ${error?.message || 'token upload tidak tersedia'}`)
  }

  const descriptor: DirectUploadDescriptor = {
    kind: input.kind,
    bucket: spec.bucket,
    path,
    fileName,
    mimeType: String(input.mimeType || ''),
    size: input.size,
  }

  console.info('[direct-upload] ticket ready', { kind: input.kind, bucket: spec.bucket, size: input.size })
  return { descriptor, token: data.token }
}
