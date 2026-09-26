import Link from 'next/link'
import { notFound } from 'next/navigation'
import { AppShell } from '@/components/app-shell'
import { getAuthContext } from '@/lib/auth'
import { SUPABASE_URL } from '@/lib/branding'
import { createClient } from '@/lib/supabase/server'

function notulenUrl(path?: string | null) {
  if (!path) return null
  if (/^https?:\/\//i.test(path)) return path
  if (path.startsWith('/')) return path
  return `${SUPABASE_URL}/storage/v1/object/public/kunjungan-notulensi/${encodeURI(path)}`
}

function dateLabel(value: string) {
  return new Intl.DateTimeFormat('id-ID', { dateStyle: 'full', timeZone: 'Asia/Makassar' }).format(new Date(`${value}T00:00:00+08:00`))
}

export default async function KunjunganDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const numericId = Number(id)
  if (!Number.isSafeInteger(numericId) || numericId <= 0) notFound()

  const [{ user }, supabase] = await Promise.all([getAuthContext(), createClient(null)])
  const [{ data: visit, error }, { data: documents, error: documentError }] = await Promise.all([
    supabase.from('kunjungan').select('*').eq('id', numericId).single(),
    supabase.from('kunjungan_documents').select('*').eq('kunjungan_id', numericId).order('created_at'),
  ])
  if (error || !visit) notFound()
  if (documentError) throw new Error(documentError.message)

  const pdf = notulenUrl(visit.notulen_pdf_path)
  const sourceFiles = [
    ...(pdf ? [{ label: visit.notulen_pdf_name || 'Notulensi PDF', url: pdf, type: 'PDF' }] : []),
    ...(documents ?? []).map((document) => ({ label: document.title || document.file_name, url: notulenUrl(document.file_path) || '#', type: 'PDF' })),
  ]

  return <AppShell active="/kunjungan" title="Detail Kunjungan" adminMode={Boolean(user)} editReturnTo={`/kunjungan/${visit.id}`}>
    <div className="breadcrumb-line"><Link href="/kunjungan">Kunjungan OPD</Link><span>/</span><strong>{visit.nama_opd}</strong></div>

    <section className="visit-detail-hero panel">
      <div>
        <p className="eyebrow">NOTULENSI KUNJUNGAN</p>
        <h2>{visit.nama_opd}</h2>
        <p>{visit.topik}</p>
        <div className="visit-detail-meta">
          <span>{dateLabel(visit.tanggal)}</span>
          <span>{visit.pejabat || 'Pejabat belum dicantumkan'}</span>
          <span>{visit.status}</span>
          {visit.tanggal_estimasi ? <span>Waktu estimasi</span> : null}
        </div>
      </div>
      <Link href="/kunjungan" className="secondary-button">← Kembali</Link>
    </section>

    <section className="visit-detail-grid">
      <article className="panel visit-note-card">
        <div className="panel-head"><div><p className="eyebrow">RINGKASAN</p><h2>Isi Notulensi</h2></div></div>
        {visit.notulen_text ? <div className="visit-note-copy">{visit.notulen_text}</div> : <div className="empty-document-panel compact-empty"><p>Ringkasan teks belum tersedia. Gunakan dokumen sumber di samping bila tersedia.</p></div>}
      </article>

      <aside className="panel visit-source-card">
        <div className="panel-head"><div><p className="eyebrow">DOKUMEN SUMBER</p><h2>Buka Notulensi</h2></div></div>
        <div className="visit-source-list">
          {visit.link_notulen ? <a href={visit.link_notulen} target="_blank" rel="noreferrer" className="visit-source-item"><span className="source-badge source-gdocs">G</span><div><strong>Google Docs</strong><small>Buka dokumen notulensi asli</small></div><i>↗</i></a> : null}
          {sourceFiles.map((file, index) => <a href={file.url} target="_blank" rel="noreferrer" className="visit-source-item" key={index}><span className="source-badge source-pdf">{file.type}</span><div><strong>{file.label}</strong><small>Buka dokumen PDF</small></div><i>↗</i></a>)}
          {!visit.link_notulen && !sourceFiles.length ? <p className="muted-line">Belum ada dokumen sumber yang bisa dibuka.</p> : null}
        </div>
      </aside>
    </section>
  </AppShell>
}
