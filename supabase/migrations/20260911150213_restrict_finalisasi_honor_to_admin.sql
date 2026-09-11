drop policy if exists finalisasi_honor_insert_editor on public.finalisasi_honor;
drop policy if exists finalisasi_honor_update_editor on public.finalisasi_honor;
drop policy if exists finalisasi_honor_delete_editor on public.finalisasi_honor;

create policy finalisasi_honor_insert_admin on public.finalisasi_honor
for insert to authenticated
with check (private.has_role(array['admin']::text[]));

create policy finalisasi_honor_update_admin on public.finalisasi_honor
for update to authenticated
using (private.has_role(array['admin']::text[]))
with check (private.has_role(array['admin']::text[]));

create policy finalisasi_honor_delete_admin on public.finalisasi_honor
for delete to authenticated
using (private.has_role(array['admin']::text[]));
