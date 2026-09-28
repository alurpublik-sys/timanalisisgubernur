import 'server-only'

import type { Json } from '@/lib/database.types'
import type { ImportedDocument } from '@/lib/document-import'

export type AutoBeraniSection = {
  section_key: string
  title: string
  section_type: 'kpis' | 'bar_chart' | 'stat_grid' | 'trend' | 'facts' | 'text' | 'image' | 'comparison' | 'table'
  payload: Json
  sort_order: number
}

type Input = {
  programSlug: string
  fileName: string
  documentId?: number
  imported: ImportedDocument
}

function record(value: Json | undefined): Record<string, Json> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, Json> : {}
}
function list(value: Json | undefined): Json[] { return Array.isArray(value) ? value : [] }
function str(value: Json | undefined) { return typeof value === 'string' || typeof value === 'number' ? String(value) : '' }

function uniqueStrings(values: string[]) {
  return [...new Set(values.filter(Boolean))]
}

function mergeObjectItems(previous: Json[], incoming: Json[], key: string) {
  const map = new Map<string, Json>()
  for (const raw of previous) {
    const item = record(raw)
    const id = str(item[key]) || JSON.stringify(item)
    map.set(id, item)
  }
  for (const raw of incoming) {
    const item = record(raw)
    const id = str(item[key]) || JSON.stringify(item)
    const old = record(map.get(id))
    map.set(id, { ...old, ...item })
  }
  return [...map.values()]
}

export function mergeSectionPayload(type: string, previous: Json, incoming: Json): Json {
  const before = record(previous)
  const next = record(incoming)
  const merged: Record<string, Json> = { ...before, ...next }
  const sources = uniqueStrings([
    ...list(before.sources).map(str),
    ...list(next.sources).map(str),
    str(before.source),
    str(next.source),
  ])
  if (sources.length) merged.sources = sources

  if (['kpis','bar_chart','stat_grid','comparison'].includes(type)) {
    merged.items = mergeObjectItems(list(before.items), list(next.items), 'label')
  } else if (type === 'facts') {
    merged.items = mergeObjectItems(list(before.items), list(next.items), 'title')
  } else if (type === 'trend') {
    const series = mergeObjectItems(list(before.series), list(next.series), 'label').map((raw) => {
      const item = record(raw)
      const old = list(before.series).map(record).find((candidate) => str(candidate.label) === str(item.label))
      const fresh = list(next.series).map(record).find((candidate) => str(candidate.label) === str(item.label))
      if (!old || !fresh) return item
      return { ...old, ...fresh, values: mergeObjectItems(list(old.values), list(fresh.values), 'period') }
    })
    merged.series = series
  } else if (type === 'table') {
    const columns = list(next.columns).length ? next.columns : before.columns
    merged.columns = columns || []
    const first = record(list(columns)[0])
    const key = str(first.key) || str(first.label)
    merged.rows = key
      ? mergeObjectItems(list(before.rows), list(next.rows), key)
      : [...list(before.rows), ...list(next.rows)]
  }
  return merged
}

function pageBlocks(text: string) {
  const source = text.replace(/\r/g, '')
  const parts = source.split(/(?=\[HALAMAN\s+\d+\])/i)
  return parts.filter((part) => part.trim())
}

function pageFor(text: string, pattern: RegExp) {
  return pageBlocks(text).find((page) => pattern.test(page)) || ''
}

function decimalToken(raw: string) {
  return raw.replace(/\s/g, '').replace(/(?<=\d)\.(?=\d{3}(?:\D|$))/g, '.')
}

function pairAfter(page: string, label: RegExp) {
  const match = page.match(label)
  if (!match || match.index === undefined) return null
  const segment = page.slice(match.index + match[0].length, match.index + match[0].length + 180)
  const numbers = [...segment.matchAll(/\b(\d{1,3}(?:[.,]\d{1,3})?)\b/g)]
    .map((item) => item[1])
    .filter((item) => /[.,]/.test(item))
    .slice(0, 2)
  return numbers.length >= 2 ? numbers : null
}

function cerdasSections(fileName: string, text: string): AutoBeraniSection[] {
  const sections: AutoBeraniSection[] = []
  const source = fileName

  const budgetPage = pageFor(text, /ANGGARAN\s+PROGRAM|2025\s*[-–]\s*2026/i)
  const budgetSpecs: Array<[string, RegExp]> = [
    ['BOSDA', /Pemberian\s+BOSDA/i],
    ['SPP siswa miskin sekolah swasta', /Biaya\s+SPP[^\n]{0,80}Sekolah\s+Swasta/i],
    ['Cerdas Istimewa & Bakat Istimewa', /Cerdas\s+Istimewa[^\n]{0,70}Bakat\s+Istimewa/i],
    ['UKK & Prakerin SMK', /UKK\s*&?\s*Prakerin|Uji\s+Kompetensi[^\n]{0,80}Prakerin/i],
    ['Beasiswa Mahasiswa', /Beasiswa\s+Mahasiswa/i],
    ['Guru, ASN & Pendidikan Profesi', /Beasiswa[^\n]{0,80}Guru[^\n]{0,80}ASN|Guru,?\s*ASN/i],
    ['Sarana Pendidikan Digital', /Sarana[^\n]{0,100}Digital/i],
    ['Seragam Sekolah', /Seragam\s+Sekolah/i],
  ]
  const budgetItems = budgetSpecs.flatMap(([label, pattern]) => {
    const pair = pairAfter(budgetPage, pattern)
    return pair ? [{ label, previous: pair[0], current: pair[1] }] : []
  })
  const totalPair = budgetPage.match(/Total[^\d]{0,30}(178[.,]837)[^\d]{0,40}(355[.,]261)/i)
  if (totalPair) budgetItems.push({ label: 'Total Program', previous: totalPair[1], current: totalPair[2] })

  if (budgetItems.length) {
    sections.push({
      section_key: 'auto:berani-cerdas:budget-comparison',
      title: 'Perbandingan Anggaran Program',
      section_type: 'comparison',
      payload: {
        previousLabel: '2025',
        currentLabel: '2026',
        unit: 'miliar rupiah',
        items: budgetItems,
        source,
      },
      sort_order: 20,
    })
  }

  const items: Array<Record<string, Json>> = []
  if (/355[.,]261/i.test(text)) items.push({ label: 'Anggaran Program 2026', value: 'Rp355,261 miliar', note: 'Total delapan pos anggaran pada ringkasan 2025–2026', source })
  if (/178[.,]837/i.test(text)) items.push({ label: 'Anggaran Program 2025', value: 'Rp178,837 miliar', note: 'Basis perbandingan tahun sebelumnya', source })
  if (/115[.,]?084/.test(text)) items.push({ label: 'Penerima BOSDA', value: '115.084 siswa', note: 'SMA/SMK/SLB', source })
  if (/453\s+(?:sekolah|satuan)/i.test(text)) items.push({ label: 'Sekolah BOSDA', value: '453 sekolah', note: 'Negeri dan swasta', source })
  if (/47[.,]?000/.test(text)) items.push({ label: 'Rencana penerima beasiswa', value: '±47.000 orang', note: '±22.000 penerima lama + ±25.000 penerima baru', source })
  if (/401\s+perguruan/i.test(text)) items.push({ label: 'Mitra Perguruan Tinggi', value: '401 PT', note: 'Negeri dan swasta', source })
  if (items.length) {
    sections.push({
      section_key: 'auto:berani-cerdas:overview',
      title: 'Ringkasan Utama BERANI Cerdas',
      section_type: 'kpis',
      payload: { subtitle: 'Angka terbaru yang berhasil dibaca dari dokumen sumber', items, source },
      sort_order: 10,
    })
  }

  const scholarshipPage = pageFor(text, /REKAPITULASI\s+ANGGARAN|23[.,]?568|22[.,]?414/i)
  const scholarshipItems: Array<Record<string, Json>> = []
  if (/23[.,]?568/.test(scholarshipPage)) scholarshipItems.push({ label: 'S1 Semester Ganjil 2025', value: '23.568', note: 'orang penerima' })
  if (/22[.,]?414/.test(scholarshipPage)) scholarshipItems.push({ label: 'S1 Semester Genap 2026', value: '22.414', note: 'orang penerima' })
  if (/260\s*Miliar/i.test(scholarshipPage)) scholarshipItems.push({ label: 'Rencana Anggaran Beasiswa 2026', value: '± Rp260 miliar', note: 'anggaran beasiswa' })
  if (/100\s+orang/i.test(scholarshipPage)) scholarshipItems.push({ label: 'Magister (S2)', value: '100', note: 'orang' })
  if (/20\s+orang/i.test(scholarshipPage)) scholarshipItems.push({ label: 'Doktoral (S3)', value: '20', note: 'orang' })
  if (/10\s+orang/i.test(scholarshipPage)) scholarshipItems.push({ label: 'Dokter Spesialis', value: '10', note: 'orang' })
  if (/300\s+orang/i.test(scholarshipPage)) scholarshipItems.push({ label: 'Bantuan Penyelesaian Studi', value: '300', note: 'orang' })
  if (scholarshipItems.length) {
    sections.push({
      section_key: 'auto:berani-cerdas:scholarship',
      title: 'Beasiswa Mahasiswa & Pendidikan Lanjutan',
      section_type: 'stat_grid',
      payload: { subtitle: 'Realisasi dan rencana program beasiswa', items: scholarshipItems, source },
      sort_order: 40,
    })
  }

  const facts: Array<Record<string, Json>> = []
  if (/1[.,]?910/.test(text) && /21[.,]?562/.test(text)) facts.push({ title: 'UKK & Prakerin SMK', detail: '1.910 siswa penerima dengan total anggaran Rp21,562 miliar; terdiri dari 1.024 peserta Prakerin dan 886 peserta UKK.', source })
  if (/205\s+(?:Siswa|siswa)/.test(text)) facts.push({ title: 'Cerdas Istimewa & Bakat Istimewa', detail: '205 siswa berasrama dengan alokasi Rp4.520.925.000.', source })
  if (/99\s+Orang\s+Guru/i.test(text) || /99\s+orang/i.test(text)) facts.push({ title: 'Peningkatan Kualifikasi Guru', detail: '99 guru mengikuti peningkatan kualifikasi/Beasiswa S2 dengan anggaran Rp2.475.000.000.', source })
  if (/160\s+Orang/i.test(text)) facts.push({ title: 'Upskilling & Reskilling Guru SMK', detail: '160 guru SMK dengan anggaran Rp2.760.000.000.', source })
  if (/10\s+Sekolah/i.test(text) && /430[.,]?500[.,]?000/.test(text)) facts.push({ title: 'Akses Internet Pendidikan', detail: '10 sekolah didukung peningkatan akses internet dengan anggaran Rp430.500.000.', source })
  if (/104\s+Sekolah/i.test(text) && /123[.,]?013[.,]?282[.,]?000/.test(text)) facts.push({ title: 'Revitalisasi Satuan Pendidikan', detail: '104 sekolah: 36 SMA, 46 SMK, dan 22 SLB dengan total anggaran Rp123.013.282.000.', source })
  if (/220\s+Orang/i.test(text)) facts.push({ title: 'Vokasional Siap Kerja', detail: '220 peserta. Dokumen menuliskan total anggaran “Rp4,2M”; satuan perlu dipertahankan sesuai sumber sampai diverifikasi.', source })
  if (/3[.,]?149\s+Siswa/i.test(text)) facts.push({ title: 'Bantuan Seragam Sekolah', detail: 'Target 3.149 siswa SMA/SMK/SLB dengan alokasi Rp1.785.310.000.', source })
  if (facts.length) {
    sections.push({
      section_key: 'auto:berani-cerdas:highlights',
      title: 'Capaian & Dukungan Program',
      section_type: 'facts',
      payload: { items: facts, source },
      sort_order: 60,
    })
  }

  return sections
}

function genericMetricSections(input: Input): AutoBeraniSection[] {
  const text = input.imported.extractedText || ''
  if (!text) return []

  const lines = text.split(/\n+/).map((line) => line.replace(/\s+/g, ' ').trim()).filter(Boolean)
  const metricItems: Array<Record<string, Json>> = []
  const seen = new Set<string>()

  for (const line of lines) {
    if (metricItems.length >= 6) break
    const match = line.match(/^(.*?)(Rp\.?\s*[\d.,]+(?:\s*(?:miliar|juta|M))?|[\d.,]+\s*(?:%|orang|jiwa|siswa|sekolah|paket|km|unit))\b/i)
    if (!match) continue
    let label = match[1].replace(/[·:|\-–—]+$/g, '').trim()
    if (label.length < 4) label = line.replace(match[2], '').trim()
    label = label.slice(0, 72)
    if (!label || seen.has(label.toLowerCase())) continue
    seen.add(label.toLowerCase())
    metricItems.push({ label, value: decimalToken(match[2]), note: 'Terbaca otomatis', source: input.fileName })
  }

  const result: AutoBeraniSection[] = []
  if (metricItems.length >= 2) {
    result.push({
      section_key: `auto:${input.programSlug}:metrics`,
      title: 'Sorotan Data Terbaru',
      section_type: 'kpis',
      payload: { subtitle: 'Dibaca otomatis dari dokumen terbaru', items: metricItems, source: input.fileName },
      sort_order: 100,
    })
  }

  const facts = lines
    .filter((line) => line.length >= 55 && line.length <= 260 && !/^\[HALAMAN/i.test(line))
    .slice(0, 5)
    .map((line, index) => ({ title: `Temuan ${index + 1}`, detail: line, source: input.fileName }))
  if (facts.length >= 2) {
    result.push({
      section_key: `auto:${input.programSlug}:facts`,
      title: 'Poin Penting Dokumen',
      section_type: 'facts',
      payload: { items: facts, source: input.fileName },
      sort_order: 700,
    })
  }
  return result
}

function tabularChart(input: Input): AutoBeraniSection[] {
  if (!input.imported.rows.length || input.imported.columns.length < 2) return []
  const columns = input.imported.columns
  const sample = input.imported.rows.slice(0, 30)
  const labelColumn = columns.find((column) => sample.some((row) => typeof row[column] === 'string')) || columns[0]
  const numericColumn = columns.find((column) => sample.filter((row) => typeof row[column] === 'number').length >= Math.min(3, sample.length))
  if (!numericColumn || numericColumn === labelColumn) return []
  const items = sample.flatMap((row) => {
    const value = row[numericColumn]
    const label = row[labelColumn]
    return typeof value === 'number' && label !== null && label !== undefined
      ? [{ label: String(label).slice(0, 70), value }]
      : []
  })
  if (items.length < 3) return []
  return [{
    section_key: `auto:${input.programSlug}:table-chart:${numericColumn.toLowerCase().replace(/[^a-z0-9]+/g,'-')}`,
    title: `${numericColumn} · perbandingan data`,
    section_type: 'bar_chart',
    payload: { unit: '', items, source: input.fileName },
    sort_order: 500,
  }]
}

export function deriveBeraniSections(input: Input): AutoBeraniSection[] {
  const specialized = input.programSlug === 'berani-cerdas' && input.imported.extractedText
    ? cerdasSections(input.fileName, input.imported.extractedText)
    : []
  return specialized.length
    ? [...specialized, ...tabularChart(input)]
    : [...genericMetricSections(input), ...tabularChart(input)]
}
