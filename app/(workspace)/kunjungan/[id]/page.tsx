import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getAuthContext } from '@/lib/auth'
import { SUPABASE_URL } from '@/lib/branding'
import { createClient } from '@/lib/supabase/server'
import { getLegacyNotulensiOriginal } from '@/lib/legacy-notulensi-originals'
import { FeatureNotes } from '@/components/feature-notes'
import { updateKunjungan, deleteKunjungan, deleteKunjunganDocument } from '@/lib/actions/core'
import { DirectUploadField } from '@/components/direct-upload-field'
import { PendingSubmitButton } from '@/components/pending-submit-button'

function notulenUrl(path?: string | null) {
  if (!path) return null
  if (/^https?:\/\//i.test(path)) return path
  if (path.startsWith('/')) return path
  return `${SUPABASE_URL}/storage/v1/object/public/kunjungan-notulensi/${encodeURI(path)}`
}

function documentHref(document:{file_path:string|null;source_url:string|null}) {
  if(document.source_url)return document.source_url
  return notulenUrl(document.file_path)
}
function sourceBadge(document:{source_type:string;mime_type:string}) {
  if(document.source_type==='external')return 'LINK'
  return document.mime_type.includes('pdf')?'PDF':'FILE'
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
  const legacyOriginal = getLegacyNotulensiOriginal(visit.id)
  const hasPrimaryPdf = Boolean(pdf || legacyOriginal)
  const sourceFiles=(documents??[]).length
    ? (documents??[]).map((document)=>({id:document.id,label:document.title||document.file_name,url:documentHref(document)||'#',type:sourceBadge(document),note:document.source_type==='legacy_route'?'Arsip notulensi lama':document.source_type==='external'?'Sumber eksternal':'Dokumen tersimpan di Supabase',title:document.title,deletable:!['Google Docs','Notulensi PDF','Notulensi PDF Arsip'].includes(document.title)}))
    : [
      ...(visit.link_notulen?[{id:-1,label:'Google Docs',url:visit.link_notulen,type:'LINK',note:'Buka dokumen notulensi asli',title:'Google Docs',deletable:false}]:[]),
      ...(hasPrimaryPdf?[{id:-2,label:visit.notulen_pdf_name||legacyOriginal?.fileName||'Notulensi PDF',url:`/kunjungan/${visit.id}/notulensi?v=20260928-original`,type:'PDF',note:'Buka file PDF asli arsip yang tersimpan utuh',title:'Notulensi PDF',deletable:false}]:[]),
    ]

  return <>
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
          {visit.tanggal_estimasi ? <span>Waktu estimasi</span> : <span>Tanggal terverifikasi</span>}
          {visit.tanggal_sumber ? <span className="visit-date-source">{visit.tanggal_sumber}</span> : null}
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
          {sourceFiles.map((file)=><div className="visit-source-managed-row" key={file.id}><a href={file.url} target="_blank" rel="noreferrer" className="visit-source-item"><span className={`source-badge ${file.type==='LINK'?'source-gdocs':'source-pdf'}`}>{file.type}</span><div><strong>{file.label}</strong><small>{file.note}</small></div><i>↗</i></a>{user&&file.deletable?<form action={deleteKunjunganDocument}><input type="hidden" name="id" value={file.id}/><PendingSubmitButton className="inline-delete visit-doc-delete" pendingLabel="…">×</PendingSubmitButton></form>:null}</div>)}
          {!sourceFiles.length ? <p className="muted-line">Belum ada dokumen sumber yang bisa dibuka.</p> : null}
        </div>
      </aside>
    </section>
    {user ? <section className="panel visit-edit-panel">
      <details>
        <summary><span>✎</span><div><strong>Edit Kunjungan & Notulensi</strong><small>Ganti data, unggah ulang PDF asli, atau hapus kunjungan.</small></div></summary>
        <form action={updateKunjungan} className="mini-form visit-edit-form">
          <input type="hidden" name="id" value={visit.id} />
          <label>Nama OPD<input name="opd" defaultValue={visit.nama_opd} required /></label>
          <label>Tanggal<input name="tanggal" type="date" defaultValue={visit.tanggal} required /></label>
          <label>Pejabat / Narasumber<input name="pejabat" defaultValue={visit.pejabat || ''} /></label>
          <label>Anggota Tim<input name="anggota" defaultValue={visit.anggota_tim || ''} /></label>
          <label className="settings-field-wide">Topik<textarea name="topik" defaultValue={visit.topik} required /></label>
          <label>Status<select name="status" defaultValue={visit.status}><option>Terjadwal</option><option>Selesai</option><option>Ditunda</option></select></label>
          <label>Google Docs<input name="link_notulen" type="url" defaultValue={visit.link_notulen || ''} /></label>
          <label className="settings-field-wide">Ringkasan Notulensi<textarea name="notulen_text" defaultValue={visit.notulen_text || ''} placeholder="Opsional. Tidak menggantikan file PDF asli." /></label>
          <div className="settings-field-wide"><DirectUploadField kind="kunjungan-pdf" name="notulen_uploads" label="Ganti / unggah PDF utama" accept="application/pdf,.pdf" scope={String(visit.id)} helpText="PDF utama dikirim langsung ke Supabase dan tetap disimpan dalam byte asli." /></div>
          <div className="settings-field-wide"><DirectUploadField kind="kunjungan-pdf" name="kunjungan_documents_uploads" label="Tambah lampiran PDF" accept="application/pdf,.pdf" multiple maxFiles={10} scope={`attachments-${visit.id}`} helpText="Lampiran tambahan tersimpan sebagai dokumen terpisah dan tidak mengganti notulensi utama." /></div>
          {visit.notulen_pdf_path ? <label className="check-row"><input name="remove_pdf" type="checkbox" value="1" /> Hapus PDF tersimpan saat menyimpan perubahan</label> : null}
          <PendingSubmitButton className="secondary-button" pendingLabel="Menyimpan perubahan…">Simpan Perubahan</PendingSubmitButton>
        </form>
        <form action={deleteKunjungan} className="danger-zone-form">
          <input type="hidden" name="id" value={visit.id} />
          <PendingSubmitButton className="danger-button" pendingLabel="Menghapus…">Hapus Kunjungan</PendingSubmitButton>
        </form>
      </details>
    </section> : null}

    <FeatureNotes featureKey="kunjungan" entityKey={String(visit.id)} returnPath={`/kunjungan/${visit.id}`} adminMode={Boolean(user)} title="Catatan Kunjungan" description="Catatan khusus untuk kunjungan ini. Bisa ditambah, diedit, dan dihapus oleh admin." />
  </>
}
