-- Preserve multiple historical finalization snapshots while keeping a readable row code.
alter table public.finalisasi_honor
  drop constraint if exists finalisasi_honor_finalization_id_tim_id_key;
alter table public.finalisasi_honor drop column if exists kode;
alter table public.finalisasi_honor
  add column kode text generated always as ('FIN-' || lpad(id::text, 4, '0')) stored unique;
