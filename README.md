# Anwar Hafid Strategic Center (AH Center)

AH Center adalah aplikasi full-stack Next.js + Supabase untuk monitoring, analisis isu, policy brief, media, agenda, dan koordinasi Tim Analisis.

## Arsitektur

- Next.js App Router + TypeScript
- Supabase PostgreSQL
- Modul operasional dapat dibuka tanpa login umum
- Pengaturan administrator dilindungi PIN server-side
- Sesi admin memakai token acak di cookie HTTP-only
- Supabase Storage untuk aset Tim Analisis
- GitHub CI menjalankan migration validation, architecture guard, typecheck, build, dan runtime smoke test
- Deployment production melalui Vercel

## Modul

- Dashboard Strategis
- Kunjungan OPD
- Isu Strategis
- Policy Brief / Rekomendasi
- Media Monitor
- Agenda & Tugas
- Tim Analisis
- Pengaturan

## UX & Performance

- Navigasi responsive untuk desktop, tablet, dan mobile
- Drawer mobile dengan route feedback yang ringan
- Route prefetch untuk perpindahan fitur yang cepat
- Dashboard memakai view agregat `dashboard_overview` agar tidak mengunduh seluruh row hanya untuk ringkasan statistik
- Foto executive memakai Next.js image optimization
- Animasi menghormati `prefers-reduced-motion`

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
