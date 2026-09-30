
-- Align write permissions with the custom PIN-admin session model.
grant delete on public.kunjungan to anon;
grant delete on public.media_monitoring to anon;

-- Legacy operational modules: keep them readable publicly, but protect writes with the same PIN session.
do $$
declare
  t text;
begin
  foreach t in array array['agenda','isu_strategis','rekomendasi']
  loop
    execute format('drop policy if exists public_insert on public.%I', t);
    execute format('drop policy if exists public_update on public.%I', t);
    execute format('drop policy if exists public_delete on public.%I', t);

    execute format(
      'create policy public_insert on public.%I for insert to anon with check (public.ah_admin_session_check())',
      t
    );
    execute format(
      'create policy public_update on public.%I for update to anon using (public.ah_admin_session_check()) with check (public.ah_admin_session_check())',
      t
    );
    execute format(
      'create policy public_delete on public.%I for delete to anon using (public.ah_admin_session_check())',
      t
    );

    execute format('grant select, insert, update, delete on public.%I to anon', t);
  end loop;
end $$;

-- Supabase Storage upload/delete operations may need SELECT visibility for returned object metadata.
drop policy if exists ah_team_assets_select on storage.objects;
create policy ah_team_assets_select
on storage.objects
for select
to anon
using (bucket_id = 'team-assets');

-- Keep notulensi within Supabase limits while allowing files above Vercel's 4.5 MB function payload cap.
update storage.buckets
set file_size_limit = 20971520,
    allowed_mime_types = array['application/pdf']::text[]
where id = 'kunjungan-notulensi';
