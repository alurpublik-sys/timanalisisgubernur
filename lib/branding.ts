export const APP_NAME = 'Anwar Hafid Strategic Center'
export const APP_SHORT_NAME = 'AH Center'
export const ANWAR_HAFID_PHOTO = 'https://ppid.sultengprov.go.id/wp-content/uploads/2025/10/FOTO-GUBERNUR-1-768x768.png'
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
  return source || null
}
