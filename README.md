# Anwar Hafid Strategic Center (AH Center)

AH Center adalah migrasi full-stack dari Google Apps Script + Google Sheets ke Next.js + Supabase.

## Arsitektur

- Next.js App Router + TypeScript
- Supabase PostgreSQL
- Akses administrator PIN-only
- Tidak memakai Supabase Auth user/email
- Tidak memakai `SUPABASE_SECRET_KEY` di Vercel
- Sesi admin berupa token acak 256-bit di cookie HTTP-only
- Token sesi divalidasi PostgreSQL melalui RLS dan header `x-ah-session`
- PIN hanya disimpan sebagai hash bcrypt di schema private Supabase
- Rate limit global: 5 PIN salah per 15 menit, lalu lock 15 menit
- GitHub CI untuk migration validation, PIN architecture guard, typecheck, dan production build
- Target deployment: Vercel

## Akses Admin

AH Center tidak memakai username, email, atau akun Supabase Auth. Administrator cukup memasukkan PIN 6 digit.

PIN tidak disimpan di repository maupun environment hosting. Verifikasi PIN dilakukan oleh RPC PostgreSQL `ah_admin_login`, lalu database menerbitkan token sesi acak yang berlaku 12 jam. Browser hanya menerima token opaque tersebut melalui cookie HTTP-only, `SameSite=Strict`, dan `Secure` pada production.

Mengubah hash PIN di database otomatis menaikkan `pin_version`, sehingga seluruh sesi lama langsung tidak valid.

## Environment

Aplikasi hanya membutuhkan konfigurasi publik berikut:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://suiiaiuxkhdsqufswpfv.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<sb_publishable_...>
APP_TIMEZONE=Asia/Makassar
```

Tidak ada service-role/secret Supabase, PIN plaintext, atau session signing secret di Vercel.

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

Google Docs untuk notulensi tetap berada di Google Drive; database hanya menyimpan link dokumennya.

## Kinerja & Honor

- Hadir = faktor 1
- Izin = faktor 0,5
- Tidak Hadir = faktor 0
- Kunjungan OPD menghormati pengecualian Master Agenda
- Agenda `Semua Tim` mewajibkan seluruh anggota relevan
- Kontribusi berpoin hanya dihitung bila selesai
- Kunjungan OPD/Rapat Internal dapat menjadi batas bawah evaluasi jika minimum agenda terpenuhi
- Rekomendasi honor bulan berjalan disembunyikan
- Periode lampau dapat difinalisasi sebagai snapshot
- Snapshot dapat dibuka kembali untuk koreksi lalu difinalisasi ulang

## Local Development

Salin `.env.example` menjadi `.env.local`, isi publishable key, lalu:

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

Migration berada di `supabase/migrations/`. CI menolak filename migration yang tidak menggunakan timestamp 14 digit atau memiliki version duplikat.

Tabel konfigurasi PIN, sesi, dan rate-limit berada di schema `private`. Tabel operasional di `public` tetap memakai RLS. Role `anon` hanya dapat membaca/menulis row ketika header `x-ah-session` membawa token sesi yang masih valid.

## Git Flow

Pengembangan aktif berada di branch `feat/ah-center-fullstack`. PR ke `main` belum boleh di-merge sebelum preview Vercel, login PIN, CRUD, Kinerja, dan logout diuji end-to-end.
