import type { Json } from '@/lib/database.types'
import { SUPABASE_URL } from '@/lib/branding'

type Props = { title: string; type: string; payload: Json }

function object(value: Json | undefined): Record<string, Json> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, Json> : {}
}
function array(value: Json | undefined): Json[] { return Array.isArray(value) ? value : [] }
function text(value: Json | undefined) { return typeof value === 'string' || typeof value === 'number' ? String(value) : '' }
function number(value: Json | undefined) {
  if (typeof value === 'number') return value
  const raw = String(value ?? '').replace(/\s/g, '').replace(/[^0-9,.-]/g, '')
  if (!raw) return 0
  if (/^-?\d{1,3}(?:\.\d{3})+(?:,\d+)?$/.test(raw)) return Number(raw.replace(/\./g, '').replace(',', '.'))
  if (/^-?\d{1,3}(?:,\d{3})+(?:\.\d+)?$/.test(raw)) return Number(raw.replace(/,/g, ''))
  return Number(raw.replace(',', '.')) || 0
}
function formatNumber(value: number) {
  return new Intl.NumberFormat('id-ID', { maximumFractionDigits: 3 }).format(value)
}
function sources(data: Record<string, Json>) {
  const result = [
    ...array(data.sources).map(text),
    text(data.source),
  ].filter(Boolean)
  return [...new Set(result)]
}
function SourceFooter({ data }: { data: Record<string, Json> }) {
  const items = sources(data)
  if (!items.length) return null
  return <div className="processed-source-note"><span>Sumber data</span><strong>{items.join(' · ')}</strong></div>
}
function SectionHead({ title, eyebrow = 'DATA TEROLAH', meta }: { title: string; eyebrow?: string; meta?: string }) {
  return <div className="processed-section-head">
    <div><p className="eyebrow">{eyebrow}</p><h2>{title}</h2></div>
    {meta ? <span>{meta}</span> : null}
  </div>
}
function cell(value: Json | undefined) {
  if (value === null || value === undefined || value === '') return '-'
  if (typeof value === 'boolean') return value ? 'Ya' : 'Tidak'
  if (typeof value === 'number') return formatNumber(value)
  if (typeof value === 'object') return JSON.stringify(value)
  return String(value)
}

export function ProcessedBeraniSection({ title, type, payload }: Props) {
  const data = object(payload)

  if (type === 'kpis') {
    const items = array(data.items).map(object)
    return <section className="processed-section panel premium-processed-section">
      <SectionHead title={title} meta={text(data.subtitle)} />
      <div className="processed-kpi-grid premium-kpi-grid">
        {items.map((item, index) => <article className="processed-kpi premium-kpi" key={index}>
          <span>{text(item.label)}</span>
          <strong>{text(item.value)}</strong>
          {text(item.note) ? <small>{text(item.note)}</small> : null}
          {text(item.secondary) ? <em>{text(item.secondary)}</em> : null}
        </article>)}
      </div>
      <SourceFooter data={data} />
    </section>
  }

  if (type === 'comparison') {
    const items = array(data.items).map(object)
    const previousLabel = text(data.previousLabel) || 'Sebelumnya'
    const currentLabel = text(data.currentLabel) || 'Terbaru'
    const unit = text(data.unit)
    const max = Math.max(1, ...items.flatMap((item) => [number(item.previous), number(item.current)]))
    return <section className="processed-section panel premium-processed-section">
      <SectionHead title={title} eyebrow="PERBANDINGAN" meta={unit} />
      <div className="comparison-legend">
        <span><i className="comparison-dot previous" />{previousLabel}</span>
        <span><i className="comparison-dot current" />{currentLabel}</span>
      </div>
      <div className="comparison-list">
        {items.map((item, index) => {
          const previous = number(item.previous)
          const current = number(item.current)
          const delta = previous ? ((current - previous) / previous) * 100 : null
          return <article className="comparison-row" key={index}>
            <div className="comparison-label">
              <strong>{text(item.label)}</strong>
              {delta !== null ? <small>{delta >= 0 ? '+' : ''}{new Intl.NumberFormat('id-ID',{maximumFractionDigits:1}).format(delta)}%</small> : null}
            </div>
            <div className="comparison-values">
              <div><span>{previousLabel}</span><b>{text(item.previous)}</b><i className="comparison-track"><em className="comparison-fill previous" style={{ width: `${Math.max(previous ? 2 : 0, Math.min(100, (previous / max) * 100))}%` }} /></i></div>
              <div><span>{currentLabel}</span><b>{text(item.current)}</b><i className="comparison-track"><em className="comparison-fill current" style={{ width: `${Math.max(current ? 2 : 0, Math.min(100, (current / max) * 100))}%` }} /></i></div>
            </div>
          </article>
        })}
      </div>
      <SourceFooter data={data} />
    </section>
  }

  if (type === 'bar_chart') {
    const items = array(data.items).map(object)
    const max = Math.max(number(data.max), ...items.map((item) => number(item.value)), 1)
    return <section className="processed-section panel premium-processed-section">
      <SectionHead title={title} eyebrow="PERBANDINGAN DATA" meta={text(data.unit)} />
      <div className="processed-bars premium-bars">
        {items.map((item, index) => {
          const value = number(item.value)
          return <div className="processed-bar-row" key={index}>
            <span className="bar-label">{text(item.label)}</span>
            <div className="bar-track"><i className="bar-fill" style={{ width: `${Math.min(100, (value / max) * 100)}%` }} /></div>
            <strong>{text(item.value) || formatNumber(value)}{text(data.unit)}</strong>
          </div>
        })}
      </div>
      <SourceFooter data={data} />
    </section>
  }

  if (type === 'stat_grid') {
    const items = array(data.items).map(object)
    const hospitals = array(data.hospitals)
    return <section className="processed-section panel premium-processed-section">
      <SectionHead title={title} eyebrow="RINGKASAN PROGRAM" meta={text(data.subtitle)} />
      <div className="processed-stat-grid premium-stat-grid">
        {items.map((item, index) => <article key={index}>
          {text(item.icon) ? <span>{text(item.icon)}</span> : <span>{String(index + 1).padStart(2,'0')}</span>}
          <strong>{text(item.value)}</strong>
          <small>{text(item.label)}</small>
          {text(item.note) ? <em>{text(item.note)}</em> : null}
        </article>)}
      </div>
      {hospitals.length ? <details className="processed-details">
        <summary>Lihat daftar layanan ({hospitals.length})</summary>
        <div className="hospital-chip-grid">{hospitals.map((name,index) => <span key={index}>{text(name)}</span>)}</div>
      </details> : null}
      <SourceFooter data={data} />
    </section>
  }

  if (type === 'trend') {
    const series = array(data.series).map(object)
    return <section className="processed-section panel premium-processed-section">
      <SectionHead title={title} eyebrow="TREN INDIKATOR" />
      <div className="trend-grid premium-trend-grid">
        {series.map((serie,index) => <article className="trend-card premium-trend-card" key={index}>
          <h3>{text(serie.label)}</h3>
          <div className="trend-values">{array(serie.values).map((entry,subIndex) => {
            const value = object(entry)
            return <div key={subIndex}><span>{text(value.period)}</span><strong>{text(value.value)}{text(serie.unit)}</strong></div>
          })}</div>
        </article>)}
      </div>
      {text(data.periodNote) ? <p className="processed-note">{text(data.periodNote)}</p> : null}
      <SourceFooter data={data} />
    </section>
  }

  if (type === 'facts') {
    const items = array(data.items).map(object)
    return <section className="processed-section panel premium-processed-section">
      <SectionHead title={title} eyebrow="SOROTAN PROGRAM" />
      <div className="processed-fact-grid premium-fact-grid">
        {items.map((item,index) => <article key={index}>
          <span>{String(index+1).padStart(2,'0')}</span>
          <div><h3>{text(item.title)}</h3><p>{text(item.detail)}</p></div>
        </article>)}
      </div>
      <SourceFooter data={data} />
    </section>
  }

  if (type === 'table') {
    const rawColumns = array(data.columns)
    const columns = rawColumns.map((raw, index) => {
      if (typeof raw === 'string') return { key: raw, label: raw }
      const item = object(raw)
      return { key: text(item.key) || text(item.label) || `col-${index}`, label: text(item.label) || text(item.key) || `Kolom ${index + 1}` }
    })
    const rows = array(data.rows).map(object)
    if (!columns.length || !rows.length) return null
    return <section className="processed-section panel premium-processed-section processed-table-section">
      <SectionHead title={title} eyebrow="DATA RINCI" meta={text(data.subtitle) || `${rows.length} baris`} />
      <div className="processed-table-scroll">
        <table className="processed-premium-table">
          <thead><tr>{columns.map((column) => <th key={column.key}>{column.label}</th>)}</tr></thead>
          <tbody>{rows.map((row,index) => <tr key={index}>{columns.map((column) => <td key={column.key}>{cell(row[column.key])}</td>)}</tr>)}</tbody>
        </table>
      </div>
      <div className="processed-table-mobile">
        {rows.map((row,index) => <article key={index}>
          <strong>{cell(row[columns[0].key])}</strong>
          <dl>{columns.slice(1).map((column) => <div key={column.key}><dt>{column.label}</dt><dd>{cell(row[column.key])}</dd></div>)}</dl>
        </article>)}
      </div>
      <SourceFooter data={data} />
    </section>
  }

  if (type === 'text') {
    const full = text(data.text)
    const preview = full.length > 1400 ? `${full.slice(0,1400).trim()}…` : full
    return <section className="processed-section panel document-text-panel premium-processed-section">
      <SectionHead title={title} eyebrow="TEKS SUMBER TERBACA" meta={text(data.extraction) === 'ocr' ? 'Dibaca melalui OCR' : 'Ekstraksi dokumen'} />
      <div className="processed-text-preview">{preview}</div>
      {full.length > 1400 ? <details className="processed-details processed-text-details">
        <summary>Baca hasil ekstraksi lengkap</summary><div className="processed-text-full">{full}</div>
      </details> : null}
      <SourceFooter data={data} />
    </section>
  }

  if (type === 'image') {
    const path = text(data.path)
    const url = path ? (/^https?:\/\//i.test(path) ? path : `${SUPABASE_URL}/storage/v1/object/public/berani-documents/${encodeURI(path)}`) : ''
    return <section className="processed-section panel document-image-panel premium-processed-section">
      <SectionHead title={title} eyebrow="PREVIEW VISUAL" />
      {url ? <img src={url} alt={text(data.caption)||title} className="processed-image-preview" /> : null}
      <SourceFooter data={data} />
    </section>
  }

  return null
}
