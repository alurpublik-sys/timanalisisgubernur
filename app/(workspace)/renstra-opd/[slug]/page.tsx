import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getAuthContext } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'

function formatBytes(value: number | null) {
  if (!value) return null
  const mb = value / 1024 / 1024
  return mb >= 1 ? `${mb.toFixed(1)} MB` : `${Math.round(value / 1024)} KB`
}

function documentLabel(mime: string) {
  if (mime === 'application/pdf') return 'PDF'
  if (mime.includes('wordprocessingml')) return 'DOCX'
  if (mime === 'application/msword') return 'DOC'
  return 'DOKUMEN'
}

export default async function RenstraDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const auth = await getAuthContext()
  const supabase = auth.supabase ?? await createClient(null)

  const { data: renstra, error } = await supabase
    .from('renstra_opd')
    .select('*')
    .eq('slug', slug)
    .eq('active', true)
    .single()

  if (error || !renstra) notFound()

  const names = [...new Set([renstra.opd_name, ...renstra.aliases].map((item) => item.trim()).filter(Boolean))]

  const [
    { data: documents, error: documentError },
    { data: visits },
    { data: references },
  ] = await Promise.all([
    supabase.from('renstra_documents').select('*').eq('renstra_opd_id', renstra.id).order('sort_order').order('id'),
    supabase.from('kunjungan').select('id,nama_opd,tanggal,topik').in('nama_opd', names).order('tanggal', { ascending: false }).limit(6),
    supabase.from('content_references').select('id,opd_name,title,status').in('opd_name', names).order('updated_at', { ascending: false }).limit(6),
  ])

  if (documentError) throw new Error(documentError.message)

  const docs = documents ?? []
  const previewDoc = docs.find((doc) => doc.mime_type === 'application/pdf') ?? docs.find((doc) => doc.is_primary) ?? docs[0]
  const previewUrl = previewDoc?.mime_type === 'application/pdf' && previewDoc.drive_file_id
    ? `https://drive.google.com/file/d/${previewDoc.drive_file_id}/preview`
    : null

  return (
    <>
      <div className="renstra-detail-back"><Link href="/renstra-opd">← Kembali ke Renstra OPD</Link></div>

      <section className="panel renstra-detail-hero">
        <div className="renstra-detail-title">
          <div className="renstra-detail-monogram">{renstra.short_name.slice(0, 4)}</div>
          <div>
            <p className="eyebrow">RENCANA STRATEGIS OPD</p>
            <h2>{renstra.opd_name}</h2>
            <p>{renstra.source_title}</p>
          </div>
        </div>
        <div className="renstra-detail-facts">
          <div><span>Periode</span><strong>{renstra.period_label || 'Belum diverifikasi'}</strong></div>
          <div><span>Dokumen</span><strong>{docs.length}</strong></div>
          <div><span>Sumber</span><strong>Google Drive</strong></div>
        </div>
      </section>

      <section className="renstra-detail-layout">
        <div className="renstra-main-column">
          {previewUrl ? (
            <article className="panel renstra-viewer-panel">
              <div className="panel-head">
                <div><p className="eyebrow">DOKUMEN UTAMA</p><h2>{previewDoc?.title}</h2></div>
                <a href={previewDoc?.source_url} target="_blank" rel="noreferrer">Buka penuh ↗</a>
              </div>
              <iframe className="renstra-pdf-viewer" src={previewUrl} title={previewDoc?.title || 'Renstra PDF'} />
            </article>
          ) : (
            <article className="panel renstra-no-preview">
              <p className="eyebrow">DOKUMEN WORD / MULTI-BAB</p>
              <h2>Dokumen tersedia dalam format Word.</h2>
              <p>Buka bagian dokumen dari daftar di bawah. File asli tetap dipertahankan di Google Drive.</p>
            </article>
          )}

          <article className="panel renstra-documents-panel">
            <div className="panel-head">
              <div><p className="eyebrow">SUMBER ASLI</p><h2>Daftar Dokumen</h2></div>
              <span className="renstra-doc-count">{docs.length}</span>
            </div>
            <div className="renstra-document-list">
              {docs.map((doc, index) => (
                <a href={doc.source_url} target="_blank" rel="noreferrer" className="renstra-document-row" key={doc.id}>
                  <span className="renstra-document-index">{String(index + 1).padStart(2, '0')}</span>
                  <div>
                    <strong>{doc.title}</strong>
                    <small>{documentLabel(doc.mime_type)}{formatBytes(doc.file_size) ? ` · ${formatBytes(doc.file_size)}` : ''}{doc.is_primary ? ' · Dokumen utama' : ''}</small>
                  </div>
                  <b>↗</b>
                </a>
              ))}
            </div>
          </article>
        </div>

        <aside className="renstra-side-column">
          <article className="panel renstra-related-panel">
            <div className="panel-head"><div><p className="eyebrow">DATA TERKAIT</p><h2>Kunjungan OPD</h2></div><Link href="/kunjungan">Semua</Link></div>
            <div className="renstra-related-list">
              {(visits ?? []).map((visit) => (
                <Link href={`/kunjungan/${visit.id}`} key={visit.id}>
                  <strong>{visit.topik}</strong>
                  <span>{visit.tanggal}</span>
                </Link>
              ))}
              {(visits ?? []).length === 0 ? <p>Belum ada kunjungan yang terhubung langsung dengan nama OPD ini.</p> : null}
            </div>
          </article>

          <article className="panel renstra-related-panel">
            <div className="panel-head"><div><p className="eyebrow">BAHAN KOMUNIKASI</p><h2>Referensi Konten</h2></div><Link href="/referensi-konten">Semua</Link></div>
            <div className="renstra-related-list">
              {(references ?? []).map((item) => (
                <Link href={`/referensi-konten?q=${encodeURIComponent(item.title)}`} key={item.id}>
                  <strong>{item.title}</strong>
                  <span>{item.status}</span>
                </Link>
              ))}
              {(references ?? []).length === 0 ? <p>Belum ada referensi konten yang terhubung langsung.</p> : null}
            </div>
          </article>

          <article className="panel renstra-source-card">
            <p className="eyebrow">ARSIP MASTER</p>
            <h2>Sumber dokumen</h2>
            <p>Katalog ini menunjuk ke file asli yang Anda simpan di Google Drive. Arsip ZIP sengaja diabaikan.</p>
            <a className="secondary-button" href={renstra.source_url} target="_blank" rel="noreferrer">Buka sumber asli ↗</a>
          </article>
        </aside>
      </section>
    </>
  )
}
