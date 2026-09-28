import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'
const BUCKET = 'kunjungan-notulensi'

function safeName(value: string) {
  return value.replace(/[\r\n"]/g, '').slice(0, 180) || 'notulensi.pdf'
}

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const numericId = Number(id)
  if (!Number.isSafeInteger(numericId) || numericId <= 0) notFound()

  const supabase = await createClient(null)
  const { data: visit, error } = await supabase
    .from('kunjungan')
    .select('id,notulen_pdf_path,notulen_pdf_name')
    .eq('id', numericId)
    .single()

  if (error || !visit?.notulen_pdf_path) notFound()

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
      'cache-control': 'private, max-age=300',
      'x-content-type-options': 'nosniff',
    },
  })
}
