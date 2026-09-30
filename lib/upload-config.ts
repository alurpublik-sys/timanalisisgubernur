export type UploadKind =
  | 'kunjungan-pdf'
  | 'team-photo'
  | 'team-cv'
  | 'finding-document'
  | 'berani-document'

export type DirectUploadDescriptor = {
  kind: UploadKind
  bucket: string
  path: string
  fileName: string
  mimeType: string
  size: number
}

export const DIRECT_UPLOAD_MAX_FILES = 10
