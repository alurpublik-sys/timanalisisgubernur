'use server'

import { revalidatePath } from 'next/cache'
import { requireActionUser } from '@/lib/auth'
import { directUploadsFromForm } from '@/lib/direct-uploads'

const KUNJUNGAN_NOTULENSI_BUCKET = 'kunjungan-notulensi'
const MAX_PDF_BYTES = 20 * 1024 * 1024

function value(formData: FormData, key: string) { return String(formData.get(key) ?? '').trim() }
function required(formData: FormData, key: string, label: string, max = 5000) { const result=value(formData,key); if(!result) throw new Error(`${label} wajib diisi.`); if(result.length>max) throw new Error(`${label} terlalu panjang.`); return result }
function optional(formData: FormData, key: string, label: string, max = 5000) { const result=value(formData,key); if(result.length>max) throw new Error(`${label} terlalu panjang.`); return result }
function dateValue(formData: FormData, key: string, label: string) { const result=required(formData,key,label,10); if(!/^\d{4}-\d{2}-\d{2}$/.test(result)) throw new Error(`${label} tidak valid.`); const parsed=new Date(`${result}T00:00:00Z`); if(Number.isNaN(parsed.getTime())||parsed.toISOString().slice(0,10)!==result) throw new Error(`${label} tidak valid.`); return result }
function enumValue(formData: FormData,key:string,label:string,allowed:readonly string[],fallback?:string){const result=value(formData,key)||fallback||'';if(!allowed.includes(result))throw new Error(`${label} tidak valid.`);return result}
function optionalUrl(formData:FormData,key:string,label:string){const result=optional(formData,key,label,2048);if(!result)return '';let parsed:URL;try{parsed=new URL(result)}catch{throw new Error(`${label} harus berupa URL yang valid.`)}if(!['http:','https:'].includes(parsed.protocol))throw new Error(`${label} harus menggunakan http atau https.`);return result}
async function optionalPdf(formData: FormData, key: string) {
  const entry = formData.get(key)
  if (!(entry instanceof File) || entry.size === 0) return null
  if (entry.size > MAX_PDF_BYTES) throw new Error('File notulensi PDF maksimal 10 MB.')
  if (!entry.name.toLowerCase().endsWith('.pdf')) throw new Error('File notulensi harus berformat PDF.')
  if (entry.name.length > 255) throw new Error('Nama file PDF terlalu panjang.')
  const signature = new Uint8Array(await entry.slice(0, 5).arrayBuffer())
  const header = String.fromCharCode(...signature)
  if (header !== '%PDF-') throw new Error('File tidak terbaca sebagai PDF yang valid.')
  return entry
}
function refresh(...paths:string[]){paths.forEach((path)=>revalidatePath(path))}
async function operationalClient(){return (await requireActionUser(['admin'])).supabase}

async function syncKunjunganPrimaryDocuments(
  supabase: Awaited<ReturnType<typeof operationalClient>>,
  visitId: number,
  link: string,
  pdfPath: string | null,
  pdfName: string | null,
) {
  const { error: deleteError } = await supabase.from('kunjungan_documents').delete().eq('kunjungan_id', visitId).in('title', ['Google Docs', 'Notulensi PDF'])
  if (deleteError) throw new Error(deleteError.message)
  const rows: Array<{
    kunjungan_id:number;title:string;file_path:string|null;file_name:string;mime_type:string;source_type:string;source_url:string|null
  }> = []
  if (link) rows.push({kunjungan_id:visitId,title:'Google Docs',file_path:null,file_name:'Google Docs',mime_type:'text/html',source_type:'external',source_url:link})
  if (pdfPath) rows.push({kunjungan_id:visitId,title:'Notulensi PDF',file_path:pdfPath,file_name:pdfName||'Notulensi.pdf',mime_type:'application/pdf',source_type:'storage',source_url:null})
  if (rows.length) {
    const { error } = await supabase.from('kunjungan_documents').insert(rows)
    if (error) throw new Error(error.message)
  }
}

export async function createKunjungan(formData:FormData){
  const supabase=await operationalClient()
  const tanggal=dateValue(formData,'tanggal','Tanggal')
  const directPdf=directUploadsFromForm(formData,'notulen_uploads','kunjungan-pdf')[0]??null
  const pdf=await optionalPdf(formData,'notulen_pdf')
  let pdfPath:string|null=directPdf?.path??null,pdfName:string|null=directPdf?.fileName??null
  if(pdf&&directPdf)throw new Error('PDF terunggah ganda. Pilih ulang file lalu simpan kembali.')
  if(pdf){pdfPath=`${tanggal}/${crypto.randomUUID()}.pdf`;pdfName=pdf.name;const{error:e}=await supabase.storage.from(KUNJUNGAN_NOTULENSI_BUCKET).upload(pdfPath,pdf,{contentType:'application/pdf',cacheControl:'3600',upsert:false});if(e)throw new Error(`Upload PDF gagal: ${e.message}`)}
  const link=optionalUrl(formData,'link_notulen','Link notulensi')
  const payload={nama_opd:required(formData,'opd','Nama OPD',300),tanggal,pejabat:optional(formData,'pejabat','Pejabat',500),anggota_tim:optional(formData,'anggota','Anggota tim',1000),topik:required(formData,'topik','Topik pembahasan',10000),status:enumValue(formData,'status','Status',['Terjadwal','Selesai','Ditunda'],'Terjadwal'),link_notulen:link,notulen_pdf_path:pdfPath,notulen_pdf_name:pdfName}
  const{data,error}=await supabase.from('kunjungan').insert(payload).select('id').single()
  if(error||!data){if(pdfPath)await supabase.storage.from(KUNJUNGAN_NOTULENSI_BUCKET).remove([pdfPath]);throw new Error(error?.message||'Kunjungan gagal disimpan.')}
  try{await syncKunjunganPrimaryDocuments(supabase,data.id,link,pdfPath,pdfName)}catch(e){await supabase.from('kunjungan').delete().eq('id',data.id);if(pdfPath)await supabase.storage.from(KUNJUNGAN_NOTULENSI_BUCKET).remove([pdfPath]);throw e}
  refresh('/kunjungan','/dashboard','/pengaturan')
}
export async function createMedia(formData:FormData){
 const supabase=await operationalClient(),title=required(formData,'judul','Judul berita',2000),tanggal=dateValue(formData,'tanggal','Tanggal'),link=optionalUrl(formData,'link','Link berita')
 const raw=value(formData,'berani_program_id'),programId=raw?Number(raw):null;if(programId!==null&&(!Number.isSafeInteger(programId)||programId<=0))throw new Error('Program BERANI tidak valid.')
 if(link){const{data,error}=await supabase.from('media_monitoring').select('id').eq('link_berita',link).limit(1).maybeSingle();if(error)throw new Error(error.message);if(data)throw new Error('Berita dengan link yang sama sudah ada di Media Monitor.')}
 const{data:dup,error:dupError}=await supabase.from('media_monitoring').select('id').eq('judul_berita',title).eq('tanggal',tanggal).limit(1).maybeSingle();if(dupError)throw new Error(dupError.message);if(dup)throw new Error('Judul berita yang sama pada tanggal tersebut sudah tercatat.')
 const payload={judul_berita:title,nama_media:optional(formData,'media','Nama media',500)||null,tanggal,sentimen:enumValue(formData,'sentimen','Sentimen',['Positif','Netral','Negatif'],'Netral'),link_berita:link||null,issue_category:enumValue(formData,'issue_category','Kategori isu',['Pemerintahan','Ekonomi','Infrastruktur','Sosial','Pendidikan','Kesehatan','Pangan','Lingkungan','Politik','Lainnya'],'Lainnya'),opd_name:optional(formData,'opd_name','OPD terkait',300)||null,berani_program_id:programId}
 const{error}=await supabase.from('media_monitoring').insert(payload);if(error)throw new Error(error.message);refresh('/media-monitor','/dashboard')
}


export async function updateKunjungan(formData: FormData) {
  const supabase = await operationalClient()
  const id = Number(required(formData,'id','ID kunjungan',20))
  if (!Number.isSafeInteger(id) || id <= 0) throw new Error('ID kunjungan tidak valid.')

  const { data: current, error: currentError } = await supabase
    .from('kunjungan')
    .select('id,notulen_pdf_path,notulen_pdf_name')
    .eq('id', id)
    .single()
  if (currentError || !current) throw new Error(currentError?.message || 'Kunjungan tidak ditemukan.')

  const tanggal = dateValue(formData,'tanggal','Tanggal')
  const directPdf = directUploadsFromForm(formData,'notulen_uploads','kunjungan-pdf')[0] ?? null
  const pdf = await optionalPdf(formData,'notulen_pdf')
  const removePdf = value(formData,'remove_pdf') === '1'
  const attachmentUploads = directUploadsFromForm(formData,'kunjungan_documents_uploads','kunjungan-pdf')
  let nextPath = current.notulen_pdf_path
  let nextName = current.notulen_pdf_name
  let uploadedPath: string | null = null

  if (pdf && directPdf) throw new Error('PDF terunggah ganda. Pilih ulang file lalu simpan kembali.')
  if (directPdf) {
    uploadedPath = directPdf.path
    nextPath = directPdf.path
    nextName = directPdf.fileName
  } else if (pdf) {
    uploadedPath = `${tanggal}/${crypto.randomUUID()}.pdf`
    const { error: uploadError } = await supabase.storage
      .from(KUNJUNGAN_NOTULENSI_BUCKET)
      .upload(uploadedPath, pdf, { contentType:'application/pdf', cacheControl:'3600', upsert:false })
    if (uploadError) throw new Error(`Upload PDF gagal: ${uploadError.message}`)
    nextPath = uploadedPath
    nextName = pdf.name
  } else if (removePdf) {
    nextPath = null
    nextName = null
  }

  const payload = {
    nama_opd: required(formData,'opd','Nama OPD',300),
    tanggal,
    pejabat: optional(formData,'pejabat','Pejabat',500),
    anggota_tim: optional(formData,'anggota','Anggota tim',1000),
    topik: required(formData,'topik','Topik pembahasan',10000),
    status: enumValue(formData,'status','Status',['Terjadwal','Selesai','Ditunda'],'Terjadwal'),
    link_notulen: optionalUrl(formData,'link_notulen','Link notulensi'),
    notulen_text: optional(formData,'notulen_text','Ringkasan notulensi',30000),
    notulen_pdf_path: nextPath,
    notulen_pdf_name: nextName,
    updated_at: new Date().toISOString(),
  }

  const { error } = await supabase.from('kunjungan').update(payload).eq('id', id)
  if (error) {
    const failedPaths=[uploadedPath,...attachmentUploads.map((item)=>item.path)].filter((item):item is string=>Boolean(item))
    if (failedPaths.length) await supabase.storage.from(KUNJUNGAN_NOTULENSI_BUCKET).remove(failedPaths)
    throw new Error(error.message)
  }

  await syncKunjunganPrimaryDocuments(supabase,id,payload.link_notulen,nextPath,nextName)

  if (attachmentUploads.length) {
    const attachmentRows=attachmentUploads.map((item)=>({
      kunjungan_id:id,title:item.fileName,file_path:item.path,file_name:item.fileName,mime_type:item.mimeType||'application/pdf',
      file_size:item.size,source_type:'storage',source_url:null,
    }))
    const {error:attachmentError}=await supabase.from('kunjungan_documents').insert(attachmentRows)
    if(attachmentError){await supabase.storage.from(KUNJUNGAN_NOTULENSI_BUCKET).remove(attachmentUploads.map((item)=>item.path));throw new Error(attachmentError.message)}
  }

  const oldPath = current.notulen_pdf_path
  if (oldPath && oldPath !== nextPath && (pdf || directPdf || removePdf)) {
    await supabase.storage.from(KUNJUNGAN_NOTULENSI_BUCKET).remove([oldPath])
  }

  refresh('/kunjungan', `/kunjungan/${id}`, '/dashboard', '/pengaturan')
}

export async function deleteKunjunganDocument(formData:FormData){
  const supabase=await operationalClient()
  const id=Number(required(formData,'id','ID dokumen',20))
  if(!Number.isSafeInteger(id)||id<=0)throw new Error('ID dokumen tidak valid.')
  const{data,error}=await supabase.from('kunjungan_documents').select('id,kunjungan_id,file_path,source_type,title').eq('id',id).single()
  if(error||!data)throw new Error(error?.message||'Dokumen tidak ditemukan.')
  if(['Google Docs','Notulensi PDF','Notulensi PDF Arsip'].includes(data.title))throw new Error('Dokumen utama dikelola dari form Edit Kunjungan.')
  if(data.source_type==='storage'&&data.file_path){const{error:storageError}=await supabase.storage.from(KUNJUNGAN_NOTULENSI_BUCKET).remove([data.file_path]);if(storageError)throw new Error(storageError.message)}
  const{error:deleteError}=await supabase.from('kunjungan_documents').delete().eq('id',id);if(deleteError)throw new Error(deleteError.message)
  refresh('/kunjungan',`/kunjungan/${data.kunjungan_id}`)
}

export async function deleteKunjungan(formData: FormData) {
  const supabase = await operationalClient()
  const id = Number(required(formData,'id','ID kunjungan',20))
  if (!Number.isSafeInteger(id) || id <= 0) throw new Error('ID kunjungan tidak valid.')

  const [{ data: current, error: currentError }, { data: documents, error: docsError }] = await Promise.all([
    supabase.from('kunjungan').select('id,notulen_pdf_path').eq('id', id).single(),
    supabase.from('kunjungan_documents').select('file_path').eq('kunjungan_id', id),
  ])
  if (currentError || !current) throw new Error(currentError?.message || 'Kunjungan tidak ditemukan.')
  if (docsError) throw new Error(docsError.message)

  const { error: docDeleteError } = await supabase.from('kunjungan_documents').delete().eq('kunjungan_id', id)
  if (docDeleteError) throw new Error(docDeleteError.message)
  const { error } = await supabase.from('kunjungan').delete().eq('id', id)
  if (error) throw new Error(error.message)

  const paths = [current.notulen_pdf_path, ...(documents ?? []).map((item) => item.file_path)].filter((item): item is string => Boolean(item))
  if (paths.length) await supabase.storage.from(KUNJUNGAN_NOTULENSI_BUCKET).remove(paths)

  refresh('/kunjungan','/dashboard','/pengaturan')
}
