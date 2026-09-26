drop policy if exists public_insert on public.media_monitoring;
drop policy if exists public_update on public.media_monitoring;
drop policy if exists public_delete on public.media_monitoring;

create policy public_insert on public.media_monitoring
for insert to anon
with check (public.ah_admin_session_check());

create policy public_update on public.media_monitoring
for update to anon
using (public.ah_admin_session_check())
with check (public.ah_admin_session_check());

create policy public_delete on public.media_monitoring
for delete to anon
using (public.ah_admin_session_check());
