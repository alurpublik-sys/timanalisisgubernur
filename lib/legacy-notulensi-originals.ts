const LEGACY_NOTULENSI_FILENAMES: Record<number, string> = {
  12: 'NOTULENSI AUDIENSI BKD Sulteng.pdf',
  13: 'NOTULENSI AUDIENSI DINAS PENDIDIKAN.pdf',
  14: 'NOTULENSI AUDIENSI DINSOS SULTENG.pdf',
  15: 'NOTULENSI AUDIENSI Tim Analisis bersama BPBD.pdf',
  16: 'NOTULENSI AUDIENSI TIM BERSAMA BRIDA.pdf',
  17: 'NOTULENSI HASIL WAWANCARA BPKAD SULTENG.pdf',
  18: 'NOTULENSI KESBANGPOL.pdf',
  19: 'Notulensi_Disbunak_Sulteng.pdf',
  20: 'notulensi_pertemuan_bpsdm.pdf',
  21: 'Notulensi_Pertemuan_Dinas_Perpustakaan_dan_Kearsipan_Sulteng.pdf',
}

export function getLegacyNotulensiOriginal(id: number) {
  const fileName = LEGACY_NOTULENSI_FILENAMES[id]
  if (!fileName) return null

  return {
    fileName,
    publicPath: `/notulensi-asli/${id}/${encodeURIComponent(fileName)}`,
  }
}
