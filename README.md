# Anwar Hafid Strategic Center (AH Center)

AH Center adalah aplikasi full-stack Next.js + Supabase untuk monitoring kunjungan OPD, analisis isu, media, data 9 BERANI, temuan OPD, referensi informasi publik, dan koordinasi Tim Analisis.

## Arsitektur

- Next.js App Router + TypeScript
- Supabase PostgreSQL + Realtime
- Modul operasional dapat dibuka tanpa login umum
- Pengaturan administrator dilindungi PIN server-side
- Sesi admin memakai token acak di cookie HTTP-only
- Supabase Storage untuk dokumen 9 BERANI, lampiran Temuan OPD, notulensi, foto, dan CV
- GitHub CI menjalankan migration validation, architecture guard, typecheck, build, dan runtime smoke test
- Deployment production melalui Vercel

## Modul

- Dashboard Strategis
- Kunjungan OPD
- Isu Strategis
- Media Monitor
- 9 BERANI
- Temuan OPD
- Informasi & Referensi Konten
- Tim Analisis
- Pengaturan

Policy Brief dan Agenda & Tugas tidak lagi ditampilkan sebagai fitur aplikasi. Tabel lama tetap dipertahankan di database sebagai arsip.

## Knowledge Center

- Satu program 9 BERANI dapat memiliki banyak update dari banyak OPD.
- Satu update dapat menyimpan banyak PDF, Excel, atau Word.
- Excel `.xlsx` dibaca menjadi tabel dinamis; dokumen Word dapat diekstrak menjadi teks.
- Satu OPD dapat memiliki banyak Temuan OPD, dan setiap temuan dapat memiliki banyak lampiran.
- Referensi Konten memiliki status Draft, Perlu Verifikasi, dan Siap Dibagikan.
- Mode Bagikan hanya menampilkan informasi yang berstatus Siap Dibagikan.
- Perubahan Referensi Konten disiarkan melalui Supabase Realtime.

## Environment

```bash
NEXT_PUBLIC_SUPABASE_URL=https://suiiaiuxkhdsqufswpfv.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<sb_publishable_...>
APP_TIMEZONE=Asia/Makassar
```

## Local Development

```bash
npm ci
npm run dev
```

Verifikasi:

```bash
npm run typecheck
npm run build
```

## Database

Supabase project ref: `suiiaiuxkhdsqufswpfv`.

Migration berada di `supabase/migrations/`. Tabel operasional menggunakan RLS dan Pengaturan memakai sesi PIN yang divalidasi di database.
