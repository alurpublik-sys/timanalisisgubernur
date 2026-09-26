import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'

function safePdfText(value: string) {
  return value
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/[–—]/g, '-')
    .replace(/…/g, '...')
    .normalize('NFKD')
    .replace(/[^\x20-\x7E\n\r\t]/g, '')
    .replace(/\\/g, '\\\\')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)')
}

function wrapText(value: string, width = 84) {
  const paragraphs = value.replace(/\r/g, '').split('\n')
  const lines: string[] = []
  for (const paragraph of paragraphs) {
    const words = paragraph.trim().split(/\s+/).filter(Boolean)
    if (!words.length) {
      lines.push('')
      continue
    }
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

function buildPdf(title: string, meta: string[], body: string) {
  const bodyLines = wrapText(body || 'Ringkasan teks belum tersedia.', 86)
  const pageBodyCapacity = 45
  const pageChunks: string[][] = []
  for (let i = 0; i < bodyLines.length; i += pageBodyCapacity) pageChunks.push(bodyLines.slice(i, i + pageBodyCapacity))
  if (!pageChunks.length) pageChunks.push(['Ringkasan teks belum tersedia.'])

  const objects: string[] = []
  const pageObjectNumbers: number[] = []
  const pageStart = 5

  objects[1] = '<< /Type /Catalog /Pages 2 0 R >>'
  objects[3] = '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>'
  objects[4] = '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>'

  pageChunks.forEach((chunk, pageIndex) => {
    const pageObject = pageStart + pageIndex * 2
    const contentObject = pageObject + 1
    pageObjectNumbers.push(pageObject)

    const streamLines = [
      'BT',
      '/F2 15 Tf',
      '50 790 Td',
      `(${safePdfText(title)}) Tj`,
      '0 -24 Td',
      '/F1 9 Tf',
      ...meta.flatMap((item) => [`(${safePdfText(item)}) Tj`, '0 -14 Td']),
      '0 -8 Td',
      '/F1 10 Tf',
      ...chunk.flatMap((line) => [`(${safePdfText(line)}) Tj`, '0 -14 Td']),
      'ET',
    ]
    const stream = streamLines.join('\n')
    objects[pageObject] = `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${contentObject} 0 R >>`
    objects[contentObject] = `<< /Length ${Buffer.byteLength(stream, 'latin1')} >>\nstream\n${stream}\nendstream`
  })

  objects[2] = `<< /Type /Pages /Kids [${pageObjectNumbers.map((n) => `${n} 0 R`).join(' ')}] /Count ${pageObjectNumbers.length} >>`

  const maxObject = Math.max(...Object.keys(objects).map(Number))
  let pdf = '%PDF-1.4\n%\xE2\xE3\xCF\xD3\n'
  const offsets = new Array(maxObject + 1).fill(0)
  for (let n = 1; n <= maxObject; n += 1) {
    if (!objects[n]) continue
    offsets[n] = Buffer.byteLength(pdf, 'latin1')
    pdf += `${n} 0 obj\n${objects[n]}\nendobj\n`
  }

  const xrefOffset = Buffer.byteLength(pdf, 'latin1')
  pdf += `xref\n0 ${maxObject + 1}\n0000000000 65535 f \n`
  for (let n = 1; n <= maxObject; n += 1) {
    pdf += `${String(offsets[n]).padStart(10, '0')} 00000 n \n`
  }
  pdf += `trailer\n<< /Size ${maxObject + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`
  return Buffer.from(pdf, 'latin1')
}

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const numericId = Number(id)
  if (!Number.isSafeInteger(numericId) || numericId <= 0) notFound()

  const supabase = await createClient(null)
  const { data: visit, error } = await supabase
    .from('kunjungan')
    .select('id,nama_opd,tanggal,pejabat,topik,notulen_text,notulen_pdf_name')
    .eq('id', numericId)
    .single()

  if (error || !visit) notFound()

  const date = new Intl.DateTimeFormat('id-ID', { dateStyle: 'long', timeZone: 'Asia/Makassar' })
    .format(new Date(`${visit.tanggal}T00:00:00+08:00`))
  const pdf = buildPdf(
    `Notulensi - ${visit.nama_opd}`,
    [
      `Tanggal: ${date}`,
      `Pejabat/Narasumber: ${visit.pejabat || '-'}`,
      `Topik: ${visit.topik}`,
      visit.notulen_pdf_name ? `Sumber awal: ${visit.notulen_pdf_name}` : 'Sumber awal: ringkasan sistem',
      'Dokumen ini adalah tampilan terolah dari notulensi yang tersimpan di sistem.',
    ],
    visit.notulen_text || '',
  )

  return new Response(pdf, {
    status: 200,
    headers: {
      'content-type': 'application/pdf',
      'content-disposition': `inline; filename="notulensi-${visit.id}.pdf"`,
      'cache-control': 'private, max-age=300',
    },
  })
}
