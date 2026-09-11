# Anwar Hafid Strategic Center (AH Center)

AH Center adalah migrasi full-stack dari Google Apps Script + Google Sheets ke Next.js + Supabase.

## Arsitektur

- Next.js App Router + TypeScript
- Supabase PostgreSQL
- Akses administrator PIN-only
- Supabase secret key hanya di server
- Cookie sesi HTTP-only yang ditandatangani
- Rate limit percobaan PIN
- GitHub CI untuk migration validation, typecheck, dan production build
- Target deployment: Vercel

## Akses Admin

AH Center tidak memakai username, email, atau akun Supabase Auth untuk login aplikasi. Administrator cukup memasukkan satu PIN.

Nilai PIN **tidak boleh disimpan di repository**. Konfigurasikan di environment server:

```bash
ADMIN_PIN=<pin-admin>
AH_SESSION_SECRET=<random-secret-minimal-32-karakter>
SUPABASE_SECRET_KEY=<sb_secret_...>
```

Untuk deployment utama, `ADMIN_PIN` diisi dengan PIN yang sudah ditetapkan pemilik aplikasi. Secret Supabase hanya boleh berada di backend/server dan tidak boleh memakai prefix `NEXT_PUBLIC_`.

Sesi admin berlaku 12 jam, disimpan dalam cookie HTTP-only, `SameSite=Strict`, dan ditandatangani HMAC. Percobaan PIN salah dibatasi 5 kali per 15 menit untuk fingerprint perangkat/jaringan yang sama, lalu dikunci sementara 15 menit.

## Environment

```bash
NEXT_PUBLIC_SUPABASE_URL=https://suiiaiuxkhdsqufswpfv.supabase.co
SUPABASE_SECRET_KEY=<sb_secret_...>
ADMIN_PIN=<pin-admin>
AH_SESSION_SECRET=<random-secret-minimal-32-karakter>
APP_TIMEZONE=Asia/Makassar
```

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

```bash
npm install
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

Tabel `admin_pin_attempts` digunakan hanya untuk rate limiting login PIN. Akses `anon` dan `authenticated` dicabut; akses aplikasi dilakukan oleh secret key server-side.

## Git Flow

Pengembangan aktif berada di branch `feat/ah-center-fullstack`. PR ke `main` belum boleh di-merge sebelum environment production, login PIN end-to-end, dan preview Vercel terverifikasi.
