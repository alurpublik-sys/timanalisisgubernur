'use server'

import { revalidatePath } from 'next/cache'
import { requireActionUser } from '@/lib/auth'

const KUNJUNGAN_NOTULENSI_BUCKET = 'kunjungan-notulensi'
const MAX_PDF_BYTES = 10 * 1024 * 1024

function value(formData: FormData, key: string) { return String(formData.get(key) ?? '').trim() }
function required(formData: FormData, key: string, label: string, max = 5000) { const result=value(formData,key); if(!result) throw new Error(`${label} wajib diisi.`); if(result.length>max) throw new Error(`${label} terlalu panjang.`); return result }
function optional(formData: FormData, key: string, label: string, max = 5000) { const result=value(formData,key); if(result.length>max) throw new Error(`${label} terlalu panjang.`); return result }
function dateValue(formData: FormData, key: string, label: string) { const result=required(formData,key,label,10); if(!/^\d{4}-\d{2}-\d{2}$/.test(result)) throw new Error(`${label} tidak valid.`); const parsed=new Date(`${result}T00:00:00Z`); if(Number.isNaN(parsed.getTime())||parsed.toISOString().slice(0,10)!==result) throw new Error(`${label} tidak valid.`); return result }
function enumValue(formData: FormData,key:string,label:string,allowed:readonly string[],fallback?:string){const result=value(formData,key)||fallback||'';if(!allowed.includes(result))throw new Error(`${label} tidak valid.`);return result}
function optionalUrl(formData:FormData,key:string,label:string){const result=optional(formData,key,label,2048);if(!result)return '';let parsed:URL;try{parsed=new URL(result)}catch{throw new Error(`${label} harus berupa URL yang valid.`)}if(!['http:','https:'].includes(parsed.protocol))throw new Error(`${label} harus menggunakan http atau https.`);return result}
function optionalPdf(formData: FormData, key: string) {
  const entry = formData.get(key)
  if (!(entry instanceof File) || entry.size === 0) return null
  if (entry.size > MAX_PDF_BYTES) throw new Error('File notulensi PDF maksimal 10 MB.')
  if (entry.type !== 'application/pdf' || !entry.name.toLowerCase().endsWith('.pdf')) throw new Error('File notulensi harus berformat PDF.')
  if (entry.name.length > 255) throw new Error('Nama file PDF terlalu panjang.')
  return entry
}
function refresh(...paths:string[]){paths.forEach((path)=>revalidatePath(path))}
async function operationalClient(){return (await requireActionUser(['admin'])).supabase}

export async function createKunjungan(formData:FormData){
  const supabase=await operationalClient()
  const tanggal=dateValue(formData,'tanggal','Tanggal')
  const pdf=optionalPdf(formData,'notulen_pdf')
  let pdfPath:string|null=null

  if(pdf){
    pdfPath=`${tanggal}/${crypto.randomUUID()}.pdf`
    const { error: uploadError }=await supabase.storage.from(KUNJUNGAN_NOTULENSI_BUCKET).upload(pdfPath,pdf,{contentType:'application/pdf',cacheControl:'3600',upsert:false})
    if(uploadError)throw new Error(`Upload PDF gagal: ${uploadError.message}`)
  }

  const payload={
    nama_opd:required(formData,'opd','Nama OPD',300),
    tanggal,
    pejabat:optional(formData,'pejabat','Pejabat',500),
    anggota_tim:optional(formData,'anggota','Anggota tim',1000),
    topik:required(formData,'topik','Topik pembahasan',10000),
    status:enumValue(formData,'status','Status',['Terjadwal','Selesai','Ditunda'],'Terjadwal'),
    link_notulen:optionalUrl(formData,'link_notulen','Link notulensi'),
    notulen_pdf_path:pdfPath,
    notulen_pdf_name:pdf?.name ?? null,
  }
  const{error}=await supabase.from('kunjungan').insert(payload)
  if(error)throw new Error(error.message)
  refresh('/kunjungan','/dashboard')
}
export async function createMedia(formData:FormData){const supabase=await operationalClient();const payload={judul_berita:required(formData,'judul','Judul berita',2000),nama_media:optional(formData,'media','Nama media',500),tanggal:dateValue(formData,'tanggal','Tanggal'),sentimen:enumValue(formData,'sentimen','Sentimen',['Positif','Netral','Negatif']),link_berita:optionalUrl(formData,'link','Link berita')};const{error}=await supabase.from('media_monitoring').insert(payload);if(error)throw new Error(error.message);refresh('/media-monitor','/dashboard')}
