create policy admin_pin_attempts_deny_public
on public.admin_pin_attempts
for all
to anon, authenticated
using (false)
with check (false);
