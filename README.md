# Anwar Hafid Strategic Center (AH Center)

Migrasi penuh AH Center dari Google Apps Script + Google Sheets menjadi aplikasi full-stack modern.

## Arsitektur

- Next.js App Router + TypeScript
- Supabase PostgreSQL
- Supabase Auth + Row Level Security
- Server Components + Server Actions
- GitHub CI untuk typecheck dan production build
- Target deployment: Vercel

## Modul

- Dashboard Strategis
- Kunjungan OPD
- Isu Strategis
- Policy Brief / Rekomendasi
- Media Monitor
- Agenda & Tugas
- Tim Analisis
- Kinerja & Honor
- Pengaturan & Master Data

## Kinerja & Honor

Mesin evaluasi mempertahankan aturan aplikasi lama:

- Hadir = faktor 1
- Izin = faktor 0,5
- Tidak Hadir = faktor 0
- Kunjungan OPD mengecualikan anggota sesuai Master Agenda
- agenda `Semua Tim` mewajibkan seluruh anggota relevan
- kontribusi berpoin hanya dihitung selesai
- Kunjungan OPD dan Rapat Internal dapat menjadi batas bawah evaluasi jika jumlah agenda inti memenuhi minimum
- rekomendasi honor bulan berjalan disembunyikan
- periode lampau dapat difinalisasi sebagai snapshot
- snapshot final dapat dibuka kembali untuk koreksi dan difinalisasi ulang

## Environment

Salin `.env.example` menjadi `.env.local`:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://suiiaiuxkhdsqufswpfv.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<publishable-key>
APP_TIMEZONE=Asia/Makassar
```

Jangan commit secret/service-role key ke repository.

## Local Development

```bash
npm install
npm run dev
```

Verifikasi sebelum merge:

```bash
npm run typecheck
npm run build
```

## Database

Supabase project ref: `suiiaiuxkhdsqufswpfv`.

Core data lama dipetakan dari Google Sheets menjadi tabel PostgreSQL, termasuk kunjungan, isu strategis, rekomendasi, media, agenda, tim, master agenda, master kontribusi, absensi agenda, kontribusi kerja, pengaturan kinerja, dan snapshot finalisasi honor.

## Git Flow

Pengembangan aktif dilakukan pada branch `feat/ah-center-fullstack`. PR ke `main` tidak boleh di-merge sebelum CI hijau dan verifikasi fungsi selesai.
