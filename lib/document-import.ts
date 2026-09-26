import 'server-only'
import { inflateRawSync } from 'node:zlib'

export type ImportedDocument = {
  sheetName: string | null
  columns: string[]
  rows: Record<string, string | number | boolean | null>[]
  extractedText: string | null
}

function decodeXml(value: string) {
  return value
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&')
}

function findEndOfCentralDirectory(buffer: Buffer) {
  const min = Math.max(0, buffer.length - 65557)
  for (let offset = buffer.length - 22; offset >= min; offset -= 1) {
    if (buffer.readUInt32LE(offset) === 0x06054b50) return offset
  }
  throw new Error('Arsip dokumen tidak valid.')
}

function readZip(buffer: Buffer): Map<string, Buffer> {
  const eocd = findEndOfCentralDirectory(buffer)
  const count = buffer.readUInt16LE(eocd + 10)
  let cursor = buffer.readUInt32LE(eocd + 16)
  const result = new Map<string, Buffer>()

  for (let index = 0; index < count; index += 1) {
    if (buffer.readUInt32LE(cursor) !== 0x02014b50) throw new Error('Struktur arsip dokumen tidak didukung.')
    const method = buffer.readUInt16LE(cursor + 10)
    const compressedSize = buffer.readUInt32LE(cursor + 20)
    const fileNameLength = buffer.readUInt16LE(cursor + 28)
    const extraLength = buffer.readUInt16LE(cursor + 30)
    const commentLength = buffer.readUInt16LE(cursor + 32)
    const localOffset = buffer.readUInt32LE(cursor + 42)
    const name = buffer.subarray(cursor + 46, cursor + 46 + fileNameLength).toString('utf8')

    if (buffer.readUInt32LE(localOffset) !== 0x04034b50) throw new Error('Arsip dokumen tidak valid.')
    const localNameLength = buffer.readUInt16LE(localOffset + 26)
    const localExtraLength = buffer.readUInt16LE(localOffset + 28)
    const dataStart = localOffset + 30 + localNameLength + localExtraLength
    const compressed = buffer.subarray(dataStart, dataStart + compressedSize)
    let data: Buffer
    if (method === 0) data = Buffer.from(compressed)
    else if (method === 8) data = inflateRawSync(compressed)
    else throw new Error(`Metode kompresi dokumen tidak didukung (${method}).`)

    result.set(name.replace(/^\//, ''), data)
    cursor += 46 + fileNameLength + extraLength + commentLength
  }
  return result
}

function columnIndex(reference: string) {
  const letters = reference.match(/^[A-Z]+/i)?.[0]?.toUpperCase() || 'A'
  let result = 0
  for (const char of letters) result = result * 26 + (char.charCodeAt(0) - 64)
  return result - 1
}

function textNodes(xml: string) {
  return [...xml.matchAll(/<t\b[^>]*>([\s\S]*?)<\/t>/g)].map((match) => decodeXml(match[1])).join('')
}

function parseSharedStrings(xml?: Buffer) {
  if (!xml) return [] as string[]
  return [...xml.toString('utf8').matchAll(/<si\b[^>]*>([\s\S]*?)<\/si>/g)].map((match) => textNodes(match[1]))
}

function firstSheetPath(entries: Map<string, Buffer>) {
  const workbook = entries.get('xl/workbook.xml')?.toString('utf8')
  const relationships = entries.get('xl/_rels/workbook.xml.rels')?.toString('utf8')
  if (workbook && relationships) {
    const sheet = workbook.match(/<sheet\b[^>]*name="([^"]+)"[^>]*r:id="([^"]+)"[^>]*\/?\s*>/)
    if (sheet) {
      const relation = [...relationships.matchAll(/<Relationship\b([^>]*)\/?\s*>/g)]
        .map((match) => match[1])
        .find((attrs) => new RegExp(`Id="${sheet[2]}"`).test(attrs))
      const target = relation?.match(/Target="([^"]+)"/)?.[1]
      if (target) {
        const normalized = target.startsWith('/') ? target.slice(1) : `xl/${target.replace(/^\.\//, '')}`
        return { name: decodeXml(sheet[1]), path: normalized.replace(/\/\.\//g, '/') }
      }
    }
  }
  return { name: 'Sheet1', path: 'xl/worksheets/sheet1.xml' }
}

function parseWorksheet(xml: string, sharedStrings: string[]) {
  const rows: Array<Array<string | number | boolean | null>> = []
  for (const rowMatch of xml.matchAll(/<row\b[^>]*>([\s\S]*?)<\/row>/g)) {
    const row: Array<string | number | boolean | null> = []
    for (const cellMatch of rowMatch[1].matchAll(/<c\b([^>]*)>([\s\S]*?)<\/c>/g)) {
      const attrs = cellMatch[1]
      const body = cellMatch[2]
      const ref = attrs.match(/\br="([^"]+)"/)?.[1] || 'A1'
      const type = attrs.match(/\bt="([^"]+)"/)?.[1] || ''
      const raw = body.match(/<v>([\s\S]*?)<\/v>/)?.[1] ?? ''
      let value: string | number | boolean | null = null
      if (type === 's') value = sharedStrings[Number(raw)] ?? ''
      else if (type === 'inlineStr') value = textNodes(body)
      else if (type === 'b') value = raw === '1'
      else if (type === 'str') value = decodeXml(raw)
      else if (raw !== '') {
        const numeric = Number(raw)
        value = Number.isFinite(numeric) ? numeric : decodeXml(raw)
      }
      row[columnIndex(ref)] = value
    }
    rows.push(row)
  }
  return rows
}

function normalizeHeader(value: unknown, index: number, seen: Map<string, number>) {
  const base = String(value ?? '').replace(/\s+/g, ' ').trim() || `Kolom ${index + 1}`
  const count = (seen.get(base) ?? 0) + 1
  seen.set(base, count)
  return count === 1 ? base : `${base} (${count})`
}

function detectHeader(rows: Array<Array<unknown>>) {
  const candidates = rows.slice(0, 30).map((row, index) => ({
    index,
    score: row.filter((value) => value !== null && value !== undefined && String(value).trim() !== '').length,
  }))
  candidates.sort((a, b) => b.score - a.score || a.index - b.index)
  return candidates[0]?.index ?? 0
}

function parseXlsx(buffer: Buffer): ImportedDocument {
  const entries = readZip(buffer)
  const sharedStrings = parseSharedStrings(entries.get('xl/sharedStrings.xml'))
  const sheet = firstSheetPath(entries)
  const worksheet = entries.get(sheet.path)
  if (!worksheet) throw new Error('Sheet pertama Excel tidak ditemukan.')

  const matrix = parseWorksheet(worksheet.toString('utf8'), sharedStrings)
  if (!matrix.length) return { sheetName: sheet.name, columns: [], rows: [], extractedText: null }
  const headerIndex = detectHeader(matrix)
  const rawHeader = matrix[headerIndex] || []
  const maxColumns = Math.min(Math.max(rawHeader.length, ...matrix.slice(headerIndex + 1).map((row) => row.length)), 60)
  const seen = new Map<string, number>()
  const columns = Array.from({ length: maxColumns }, (_, index) => normalizeHeader(rawHeader[index], index, seen))

  const dataRows = matrix
    .slice(headerIndex + 1)
    .filter((row) => row.some((value) => value !== null && value !== undefined && String(value).trim() !== ''))
    .slice(0, 5000)
    .map((row) => Object.fromEntries(columns.map((column, index) => [column, row[index] ?? null])))

  return { sheetName: sheet.name, columns, rows: dataRows, extractedText: null }
}

function parseDocx(buffer: Buffer): ImportedDocument {
  const entries = readZip(buffer)
  const xml = entries.get('word/document.xml')?.toString('utf8')
  if (!xml) throw new Error('Isi dokumen Word tidak ditemukan.')
  const paragraphs = [...xml.matchAll(/<w:p\b[^>]*>([\s\S]*?)<\/w:p>/g)]
    .map((match) => textNodes(match[1]).replace(/\s+/g, ' ').trim())
    .filter(Boolean)
  return {
    sheetName: null,
    columns: [],
    rows: [],
    extractedText: paragraphs.join('\n').slice(0, 30000) || null,
  }
}

export async function importDocument(file: File): Promise<ImportedDocument> {
  const name = file.name.toLowerCase()
  const buffer = Buffer.from(await file.arrayBuffer())
  if (name.endsWith('.xlsx')) return parseXlsx(buffer)
  if (name.endsWith('.docx')) return parseDocx(buffer)
  return { sheetName: null, columns: [], rows: [], extractedText: null }
}
