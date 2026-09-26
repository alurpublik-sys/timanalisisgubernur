export const APP_NAME = 'Tim Analisis dan Komunikasi Strategis (Independen)'
export const APP_SHORT_NAME = 'Tim Analisis Strategis'
export const APP_TAGLINE = 'Data Akurat · Analisis Tajam · Komunikasi Berdampak'
export const GOVERNOR_PHOTO = 'https://commons.wikimedia.org/wiki/Special:Redirect/file/Anwar_Hafid,_Portrait_Governor_of_Central_Sulawesi.png?width=700'
export const VICE_GOVERNOR_PHOTO = 'https://commons.wikimedia.org/wiki/Special:Redirect/file/Reny_Lamadjido,_Wakil_Gubernur_Sulteng.png?width=600'
export const ANWAR_HAFID_PHOTO = GOVERNOR_PHOTO
export const SUPABASE_URL = 'https://suiiaiuxkhdsqufswpfv.supabase.co'
export const TEAM_ASSET_BUCKET = 'team-assets'

export function getStoragePublicUrl(path?: string | null) {
  if (!path) return null
  return `${SUPABASE_URL}/storage/v1/object/public/${TEAM_ASSET_BUCKET}/${encodeURI(path)}`
}

export function driveFileId(url?: string | null) {
  if (!url) return null
  const match = url.match(/\/d\/([a-zA-Z0-9_-]+)/) || url.match(/[?&]id=([a-zA-Z0-9_-]+)/)
  return match?.[1] || null
}

export function getTeamPhotoUrl(row: { photo_path?: string | null; photo_url?: string | null; link_foto?: string | null }) {
  const stored = getStoragePublicUrl(row.photo_path)
  if (stored) return stored
  const source = row.photo_url || row.link_foto
  const id = driveFileId(source)
  if (id) return `https://drive.google.com/thumbnail?id=${id}&sz=w1200`
  if (source?.startsWith('/team/')) return `${source}?v=20260927`
  return source || null
}
