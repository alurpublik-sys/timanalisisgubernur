import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getLegacyNotulensiOriginal } from '@/lib/legacy-notulensi-originals'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
const BUCKET = 'kunjungan-notulensi'

function safeName(value: string) {
  return value.replace(/[\r\n"]/g, '').slice(0, 180) || 'notulensi.pdf'
}

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const numericId = Number(id)
  if (!Number.isSafeInteger(numericId) || numericId <= 0) notFound()

  const supabase = await createClient(null)
  const { data: visit, error } = await supabase
    .from('kunjungan')
    .select('id,notulen_pdf_path,notulen_pdf_name')
    .eq('id', numericId)
    .single()

  if (error || !visit) notFound()

  if (visit.notulen_pdf_path) {
    const { data: file, error: downloadError } = await supabase.storage
      .from(BUCKET)
      .download(visit.notulen_pdf_path)
    if (downloadError || !file) notFound()

    const bytes = await file.arrayBuffer()
    return new Response(bytes, {
      status: 200,
      headers: {
        'content-type': 'application/pdf',
        'content-length': String(bytes.byteLength),
        'content-disposition': `inline; filename="${safeName(visit.notulen_pdf_name || 'notulensi.pdf')}"`,
        'cache-control': 'no-store, max-age=0',
        'x-content-type-options': 'nosniff',
        'x-notulensi-source': 'stored-original',
      },
    })
  }

  const legacyOriginal = getLegacyNotulensiOriginal(visit.id)
  if (legacyOriginal) {
    return Response.redirect(new URL(legacyOriginal.publicPath, request.url), 307)
  }

  notFound()
}
