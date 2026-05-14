begin;

create or replace function public.is_admin()
returns boolean
language sql
stable
set search_path = ''
as $$
  select coalesce((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin', false)
      or coalesce((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin', false);
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to anon, authenticated;

alter table if exists public.shared_timetables enable row level security;

alter table if exists public.shared_timetables
  add column if not exists user_id uuid references auth.users(id) on delete cascade,
  add column if not exists expires_at timestamptz default (now() + interval '30 days'),
  add column if not exists created_at timestamptz default now();

alter table if exists public.shared_timetables
  alter column user_id set default auth.uid(),
  alter column created_at set default now(),
  alter column expires_at set default (now() + interval '30 days');

drop policy if exists "shared_timetables_owner_manage" on public.shared_timetables;
drop policy if exists "shared_timetables_public_read_unexpired" on public.shared_timetables;
drop policy if exists "shared_timetables_select_own" on public.shared_timetables;
drop policy if exists "shared_timetables_insert_own" on public.shared_timetables;
drop policy if exists "shared_timetables_update_own" on public.shared_timetables;
drop policy if exists "shared_timetables_delete_own" on public.shared_timetables;

create policy "shared_timetables_select_own"
  on public.shared_timetables
  for select
  to authenticated
  using (auth.uid() = user_id);

create policy "shared_timetables_insert_own"
  on public.shared_timetables
  for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "shared_timetables_update_own"
  on public.shared_timetables
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "shared_timetables_delete_own"
  on public.shared_timetables
  for delete
  to authenticated
  using (auth.uid() = user_id);

revoke all on table public.shared_timetables from anon;
grant select, insert, update, delete on table public.shared_timetables to authenticated;

drop function if exists public.create_shared_timetable(jsonb);
drop function if exists public.get_shared_timetable(uuid);
drop function if exists public.delete_user();

commit;
