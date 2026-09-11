-- Production migration version retained for replay compatibility.
-- Supabase project-provisioned rls_auto_enable() must not be callable by client roles.
do $$
begin
  if to_regprocedure('public.rls_auto_enable()') is not null then
    execute 'revoke all on function public.rls_auto_enable() from public, anon, authenticated';
  end if;
end $$;
