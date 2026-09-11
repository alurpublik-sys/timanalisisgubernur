-- Avoid per-row auth.uid() re-evaluation in profiles SELECT RLS.
drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles
for select to authenticated
using (user_id = (select auth.uid()) or private.has_role(array['admin']::text[]));
