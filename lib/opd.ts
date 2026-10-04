import 'server-only'
import { unstable_cache } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export type OpdOption = {
  display_name: string
  official_name: string
  acronym: string | null
  entity_type: string
  sort_order: number
}

export const getOpdCatalog = unstable_cache(
  async (): Promise<OpdOption[]> => {
    const supabase = await createClient(null)
    const { data, error } = await supabase
      .from('opd_master')
      .select('display_name,official_name,acronym,entity_type,sort_order')
      .eq('active', true)
      .order('sort_order')

    if (error) throw new Error(`Gagal memuat master OPD: ${error.message}`)
    return data ?? []
  },
  ['opd-master-catalog-v1'],
  { revalidate: 600, tags: ['opd-master'] },
)

export async function getOpdNames() {
  return (await getOpdCatalog()).map((item) => item.display_name)
}
