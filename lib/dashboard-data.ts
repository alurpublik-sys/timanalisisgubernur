import 'server-only'
import { unstable_cache } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export type DashboardProgram = {
  id:number
  name:string
  slug:string
  summary:string|null
  sort_order:number
}

export type DashboardPayload = {
  overview:Record<string,number|null>
  renstra_count:number
  reference_count:number
  pending_references:number
  programs:DashboardProgram[]
  updated_program_ids:number[]
  recent_berani:Array<{id:number;program_id:number;title:string;period_label:string|null;row_count:number;created_at:string}>
  recent_visits:Array<{id:number;nama_opd:string;tanggal:string;topik:string;tanggal_estimasi:boolean;status:string}>
  recent_references:Array<{id:number;opd_name:string;title:string;status:string;updated_at:string}>
  negative_media:Array<{id:number;judul_berita:string;nama_media:string|null;tanggal:string;link_berita:string|null;issue_category:string}>
}

export const getDashboardPublicPayload = unstable_cache(
  async (): Promise<DashboardPayload> => {
    const supabase = await createClient(null)
    const { data, error } = await supabase.rpc('dashboard_public_payload')
    if (error) throw new Error(`Gagal memuat command center: ${error.message}`)
    return (data ?? {}) as unknown as DashboardPayload
  },
  ['dashboard-public-payload-v1'],
  { revalidate: 20, tags: ['dashboard-public'] },
)
