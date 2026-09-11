create table if not exists public.admin_pin_attempts (
  fingerprint_hash text primary key,
  attempt_count integer not null default 0 check (attempt_count >= 0),
  window_started_at timestamptz not null default now(),
  blocked_until timestamptz,
  updated_at timestamptz not null default now()
);

alter table public.admin_pin_attempts enable row level security;
revoke all on public.admin_pin_attempts from anon, authenticated;
grant select, insert, update, delete on public.admin_pin_attempts to service_role;

create index if not exists admin_pin_attempts_blocked_until_idx
  on public.admin_pin_attempts (blocked_until)
  where blocked_until is not null;
