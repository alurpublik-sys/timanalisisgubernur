# Tim Analisis dan Komunikasi Strategis (Independen)

Aplikasi full-stack Next.js + Supabase untuk monitoring kunjungan OPD, media, data 9 BERANI, temuan OPD, referensi informasi publik, dan koordinasi tim analisis-komunikasi strategis.

## Arsitektur

- Next.js App Router + TypeScript
- Supabase PostgreSQL + Realtime
- Dashboard, Kunjungan OPD, Media Monitor, 9 BERANI, Referensi Konten, dan Tim Analisis dapat dibaca tanpa login umum
- Temuan OPD hanya dapat dibuka setelah PIN administrator tervalidasi
- Mode edit administrator dilindungi PIN server-side dan berlaku lintas fitur
- Sesi admin memakai token acak di cookie HTTP-only
- Supabase Storage untuk dokumen 9 BERANI, lampiran Temuan OPD, notulensi, foto, dan CV
- GitHub CI menjalankan migration validation, architecture guard, typecheck, build, dan runtime smoke test
- Deployment production melalui Vercel

## Modul

- Dashboard Strategis
- Kunjungan OPD
- Media Monitor
- 9 BERANI
- Temuan OPD
- Informasi & Referensi Konten
- Tim Analisis
- Pengaturan

Policy Brief, Agenda & Tugas, dan Isu Strategis tidak lagi ditampilkan sebagai fitur aplikasi. Tabel lama tetap dipertahankan sebagai arsip database.

## 9 BERANI Knowledge Center

- Satu program 9 BERANI dapat memiliki banyak update dari banyak OPD.
- Satu update dapat menyimpan banyak PDF, Excel, Word, PowerPoint, CSV, dan foto.
- Excel/CSV disajikan sebagai tabel responsif; Word/PowerPoint serta PDF bertulisan diekstrak menjadi panel ringkasan; foto ditampilkan sebagai preview.
- Update BERANI dapat memiliki panel data terolah seperti KPI, perbandingan wilayah, tren indikator, fakta kunci, dan kapasitas layanan.
- Tabel memiliki mode kartu pada layar portrait/mobile agar tetap nyaman dibaca.
- Satu OPD dapat memiliki banyak Temuan OPD dan banyak lampiran pada setiap temuan.
- Referensi Konten memiliki status Draft, Perlu Verifikasi, dan Siap Dibagikan serta disiarkan melalui Supabase Realtime.

## Brand

Nama aplikasi: **Tim Analisis dan Komunikasi Strategis (Independen)**.

Favicon/app icon menggunakan identitas TKS + 9 BERANI. Open Graph image tersedia untuk preview saat link dibagikan.

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

Migration berada di `supabase/migrations/`. Operasi tulis Kunjungan OPD, Media Monitor, 9 BERANI, Temuan OPD, Referensi Konten, dan Pengaturan memakai sesi PIN yang divalidasi di database.
