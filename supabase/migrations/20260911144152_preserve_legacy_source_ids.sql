-- Preserve source spreadsheet identifiers without changing normalized PostgreSQL IDs.
-- Production row data is intentionally NOT committed to this public repository.

alter table public.tim_analisis add column if not exists legacy_id text;
alter table public.kunjungan add column if not exists legacy_id text;
alter table public.isu_strategis add column if not exists legacy_id text;
alter table public.rekomendasi add column if not exists legacy_id text;
alter table public.media_monitoring add column if not exists legacy_id text;
alter table public.agenda add column if not exists legacy_id text;
alter table public.kontribusi_kerja add column if not exists legacy_id text;

create unique index if not exists kunjungan_legacy_id_uidx
  on public.kunjungan(legacy_id) where legacy_id is not null;
create unique index if not exists isu_strategis_legacy_id_uidx
  on public.isu_strategis(legacy_id) where legacy_id is not null;
create unique index if not exists rekomendasi_legacy_id_uidx
  on public.rekomendasi(legacy_id) where legacy_id is not null;
create unique index if not exists media_monitoring_legacy_id_uidx
  on public.media_monitoring(legacy_id) where legacy_id is not null;
create unique index if not exists agenda_legacy_id_uidx
  on public.agenda(legacy_id) where legacy_id is not null;
create unique index if not exists kontribusi_kerja_legacy_id_uidx
  on public.kontribusi_kerja(legacy_id) where legacy_id is not null;
