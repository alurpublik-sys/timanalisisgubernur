# AH Center — First Admin Bootstrap

Supabase project: `suiiaiuxkhdsqufswpfv`

## Current security model

- New Supabase Auth users automatically receive a `profiles` row with `role = viewer` and `active = false`.
- `viewer`: read-only.
- `editor`: read + operational CRUD, including attendance and contribution entry.
- `admin`: editor permissions plus access management, master data, performance settings, honor finalization, and reopen actions.
- Accounts without an active profile cannot read AH Center internal data.

## First admin

The project intentionally does not auto-promote the first signup to admin. This prevents an unintended first account from claiming privileged access.

1. Create the intended first account in Supabase Auth using the official project owner/admin email.
2. Confirm the exact Auth user UUID and email.
3. Promote only that verified account by running this in the Supabase SQL editor (replace the placeholder with the verified email):

```sql
update public.profiles
set role = 'admin',
    active = true,
    updated_at = now()
where user_id = (
  select id from auth.users where lower(email) = lower('ADMIN_EMAIL_HERE') limit 1
);
```

4. Verify exactly one row was activated:

```sql
select p.user_id, p.email, p.full_name, p.role, p.active
from public.profiles p
where p.role = 'admin' and p.active = true;
```

5. Log in to AH Center and use **Pengaturan** to activate subsequent users and assign viewer/editor/admin roles.

## Optional team binding

If the admin account also represents a Tim Analisis member, bind it only after confirming the exact person:

```sql
update public.tim_analisis
set user_id = (select id from auth.users where lower(email) = lower('ADMIN_EMAIL_HERE') limit 1),
    updated_at = now()
where nama = 'EXACT_TEAM_MEMBER_NAME';
```

Do not assign an Auth user to a team member by guessing from names or source IDs.
