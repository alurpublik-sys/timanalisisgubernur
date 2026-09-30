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

function textSegments(text: string) {
  return text
    .replace(/\r/g, '\n')
    .replace(/\[HALAMAN\s+\d+\]/gi, '\n')
    .split(/\n+|(?<=[.!?])\s+(?=[A-Z0-9])/)
    .map((line) => line.replace(/\s+/g, ' ').trim())
    .filter((line) => line.length >= 12)
}

function metricNumber(raw: string) {
  let value = raw.replace(/[^0-9,.-]/g, '')
  if (!value) return 0
  const dots = (value.match(/\./g) || []).length
  const commas = (value.match(/,/g) || []).length

  if (dots && commas) {
    if (value.lastIndexOf(',') > value.lastIndexOf('.')) value = value.replace(/\./g, '').replace(',', '.')
    else value = value.replace(/,/g, '')
  } else if (dots > 1 || (dots === 1 && /\.\d{3}(?:\D|$)/.test(value))) {
    value = value.replace(/\./g, '')
  } else if (commas > 1 || (commas === 1 && /,\d{3}(?:\D|$)/.test(value))) {
    value = value.replace(/,/g, '')
  } else {
    value = value.replace(',', '.')
  }

  return Number(value) || 0
}

function metricUnit(raw: string) {
  const source = raw.toLowerCase()
  if (/rp\.?/.test(source)) return 'rupiah'
  const match = source.match(/%|orang|jiwa|siswa|sekolah|paket|km|unit|perahu|kapal|mesin|kelompok|nelayan|hektare|ha|ton|kg|umkm|penerima/)
  return match?.[0] || 'angka'
}

function metricMagnitude(raw: string) {
  let value = metricNumber(raw)
  const source = raw.toLowerCase()
  if (/miliar/.test(source)) value *= 1_000_000_000
  else if (/juta/.test(source)) value *= 1_000_000
  return value
}

function genericMetricSections(input: Input): AutoBeraniSection[] {
  const text = input.imported.extractedText || ''
  if (!text) return []

  const segments = textSegments(text)
  const metricItems: Array<Record<string, Json>> = []
  const chartCandidates: Array<{ label: string; value: number; unit: string }> = []
  const seen = new Set<string>()
  const tokenPattern = /(Rp\.?\s*[\d.,]+(?:\s*(?:miliar|juta|M))?|[\d.,]+\s*(?:%|orang|jiwa|siswa|sekolah|paket|km|unit|perahu|kapal|mesin|kelompok|nelayan|hektare|ha|ton|kg|UMKM|penerima))\b/i

  for (const segment of segments) {
    if (metricItems.length >= 8) break
    const match = segment.match(tokenPattern)
    if (!match || match.index === undefined) continue

    const before = segment.slice(0, match.index).replace(/[·:|\-–—]+$/g, '').trim()
    const after = segment.slice(match.index + match[0].length).replace(/^[·:|\-–—]+/g, '').trim()
    let label = before.slice(-96).trim() || after.slice(0, 96).trim()
    label = label.replace(/^(dan|dengan|sebesar|sebanyak|mencapai|total)\s+/i, '').trim()
    if (label.length < 4) label = `Data dari ${input.fileName.replace(/\.[^.]+$/, '')}`
    label = label.slice(0, 90)

    const key = `${label.toLowerCase()}|${match[0].toLowerCase()}`
    if (seen.has(key)) continue
    seen.add(key)

    metricItems.push({
      label,
      value: decimalToken(match[0]),
      note: 'Terbaca otomatis dari dokumen sumber',
      source: input.fileName,
    })

    const numeric = metricMagnitude(match[0])
    if (numeric > 0) chartCandidates.push({ label, value: numeric, unit: metricUnit(match[0]) })
  }

  const result: AutoBeraniSection[] = []
  if (metricItems.length) {
    result.push({
      section_key: `auto:${input.programSlug}:metrics`,
      title: 'Sorotan Data Terbaru',
      section_type: 'kpis',
      payload: { subtitle: 'Angka utama yang berhasil dibaca otomatis', items: metricItems, source: input.fileName },
      sort_order: 100,
    })
  }

  const groups = new Map<string, Array<{ label: string; value: number }>>()
  for (const item of chartCandidates) {
    if (item.unit === 'rupiah' || item.unit === 'angka') continue
    const list = groups.get(item.unit) ?? []
    list.push({ label: item.label, value: item.value })
    groups.set(item.unit, list)
  }
  const bestGroup = [...groups.entries()]
    .filter(([, items]) => items.length >= 2)
    .sort((a, b) => b[1].length - a[1].length)[0]

  if (bestGroup) {
    const [unit, items] = bestGroup
    result.push({
      section_key: `auto:${input.programSlug}:generic-chart:${unit}`,
      title: 'Perbandingan Angka dalam Dokumen',
      section_type: 'bar_chart',
      payload: { unit: unit === '%' ? '%' : ` ${unit}`, items: items.slice(0, 8), source: input.fileName },
      sort_order: 180,
    })
  }

  const facts = segments
    .filter((line) => line.length >= 35 && line.length <= 320)
    .filter((line) => !/^\s*(daftar|lampiran|halaman)\b/i.test(line))
    .slice(0, 6)
    .map((line, index) => ({ title: `Poin ${index + 1}`, detail: line, source: input.fileName }))

  if (facts.length) {
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
