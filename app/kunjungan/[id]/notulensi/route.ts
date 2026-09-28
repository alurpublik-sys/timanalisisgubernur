import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
const BUCKET = 'kunjungan-notulensi'

function safeName(value: string) {
  return value.replace(/[\r\n"]/g, '').slice(0, 180) || 'notulensi.pdf'
}

function pdfText(value: string) {
  return value
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/[–—]/g, '-')
    .replace(/…/g, '...')
    .replace(/[•●▪]/g, '-')
    .replace(/Rp\./g, 'Rp')
    .normalize('NFKD')
    .replace(/[^\x20-\x7E\n\r\t]/g, '')
    .replace(/\\/g, '\\\\')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)')
}

function wrapText(value: string, width = 92) {
  const paragraphs = value.replace(/\r/g, '').split('\n')
  const lines: string[] = []
  for (const paragraph of paragraphs) {
    const trimmed = paragraph.trim()
    if (!trimmed) {
      lines.push('')
      continue
    }
    const words = trimmed.split(/\s+/)
    let line = ''
    for (const word of words) {
      const candidate = line ? `${line} ${word}` : word
      if (candidate.length > width && line) {
        lines.push(line)
        line = word
      } else {
        line = candidate
      }
    }
    if (line) lines.push(line)
  }
  return lines
}

function buildLegacyPdf(title: string, meta: string[], body: string) {
  const titleLines = wrapText(title, 64).slice(0, 3)
  const metaLines = meta.flatMap((item) => wrapText(item, 92))
  const bodyLines = wrapText(body || 'Isi notulensi belum tersedia.', 92)
  const bodyCapacity = 43
  const chunks: string[][] = []
  for (let i = 0; i < bodyLines.length; i += bodyCapacity) chunks.push(bodyLines.slice(i, i + bodyCapacity))
  if (!chunks.length) chunks.push(['Isi notulensi belum tersedia.'])

  const objects: string[] = []
  const pages: number[] = []
  objects[1] = '<< /Type /Catalog /Pages 2 0 R >>'
  objects[3] = '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>'
  objects[4] = '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>'

  chunks.forEach((chunk, pageIndex) => {
    const pageObject = 5 + pageIndex * 2
    const contentObject = pageObject + 1
    pages.push(pageObject)

    const stream: string[] = ['BT', '/F2 14 Tf', '46 798 Td']
    titleLines.forEach((line, index) => {
      if (index > 0) stream.push('0 -18 Td')
      stream.push(`(${pdfText(line)}) Tj`)
    })
    stream.push('0 -22 Td', '/F1 8.5 Tf')
    if (pageIndex === 0) {
      metaLines.forEach((line) => {
        stream.push(`(${pdfText(line)}) Tj`, '0 -12 Td')
      })
      stream.push('0 -8 Td')
    } else {
      stream.push(`(Lanjutan - halaman ${pageIndex + 1} dari ${chunks.length}) Tj`, '0 -18 Td')
    }
    stream.push('/F1 9.5 Tf')
    chunk.forEach((line) => {
      stream.push(`(${pdfText(line)}) Tj`, '0 -13 Td')
    })
    stream.push('ET')
    const content = stream.join('\n')
    objects[pageObject] = `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${contentObject} 0 R >>`
    objects[contentObject] = `<< /Length ${Buffer.byteLength(content, 'latin1')} >>\nstream\n${content}\nendstream`
  })

  objects[2] = `<< /Type /Pages /Kids [${pages.map((n) => `${n} 0 R`).join(' ')}] /Count ${pages.length} >>`
  const maxObject = Math.max(...Object.keys(objects).map(Number))
  let pdf = '%PDF-1.4\n%\xE2\xE3\xCF\xD3\n'
  const offsets = new Array(maxObject + 1).fill(0)
  for (let n = 1; n <= maxObject; n += 1) {
    if (!objects[n]) continue
    offsets[n] = Buffer.byteLength(pdf, 'latin1')
    pdf += `${n} 0 obj\n${objects[n]}\nendobj\n`
  }
  const xref = Buffer.byteLength(pdf, 'latin1')
  pdf += `xref\n0 ${maxObject + 1}\n0000000000 65535 f \n`
  for (let n = 1; n <= maxObject; n += 1) {
    pdf += `${String(offsets[n]).padStart(10, '0')} 00000 n \n`
  }
  pdf += `trailer\n<< /Size ${maxObject + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`
  return Buffer.from(pdf, 'latin1')
}

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const numericId = Number(id)
  if (!Number.isSafeInteger(numericId) || numericId <= 0) notFound()

  const supabase = await createClient(null)
  const { data: visit, error } = await supabase
    .from('kunjungan')
    .select('id,nama_opd,tanggal,tanggal_estimasi,tanggal_sumber,pejabat,topik,notulen_text,notulen_pdf_path,notulen_pdf_name')
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
      },
    })
  }

  if (!visit.notulen_text) notFound()

  const date = new Intl.DateTimeFormat('id-ID', { dateStyle: 'long', timeZone: 'Asia/Makassar' })
    .format(new Date(`${visit.tanggal}T00:00:00+08:00`))
  const legacyPdf = buildLegacyPdf(
    `Notulensi - ${visit.nama_opd}`,
    [
      `Tanggal dashboard: ${date}${visit.tanggal_estimasi ? ' (estimasi)' : ''}`,
      visit.tanggal_sumber ? `Keterangan tanggal: ${visit.tanggal_sumber}` : '',
      `Pejabat/Narasumber: ${visit.pejabat || '-'}`,
      `Topik: ${visit.topik}`,
      `Sumber arsip: ${visit.notulen_pdf_name || 'dokumen notulensi lama'}`,
      'Salinan terolah lengkap dari teks dokumen sumber yang tersimpan di arsip sistem.',
    ].filter(Boolean),
    visit.notulen_text,
  )

  return new Response(legacyPdf, {
    status: 200,
    headers: {
      'content-type': 'application/pdf',
      'content-length': String(legacyPdf.byteLength),
      'content-disposition': `inline; filename="salinan-terolah-${visit.id}.pdf"`,
      'cache-control': 'no-store, max-age=0',
      'x-content-type-options': 'nosniff',
      'x-notulensi-source': 'legacy-processed-copy',
    },
  })
}
