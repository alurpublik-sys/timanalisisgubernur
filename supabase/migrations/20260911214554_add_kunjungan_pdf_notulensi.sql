alter table public.kunjungan
  add column if not exists notulen_pdf_path text,
  add column if not exists notulen_pdf_name text;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('kunjungan-notulensi', 'kunjungan-notulensi', true, 10485760, array['application/pdf']::text[])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists ah_kunjungan_notulensi_insert on storage.objects;
create policy ah_kunjungan_notulensi_insert
on storage.objects
for insert
to anon
with check (
  bucket_id = 'kunjungan-notulensi'
  and storage.extension(name) = 'pdf'
);

drop policy if exists ah_kunjungan_notulensi_select on storage.objects;
create policy ah_kunjungan_notulensi_select
on storage.objects
for select
to anon
using (bucket_id = 'kunjungan-notulensi');

grant select, insert, update on table public.kunjungan to anon;
