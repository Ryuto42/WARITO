begin;

create or replace function public.is_admin()
returns boolean
language sql
stable
as $$
  select coalesce((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin', false)
      or coalesce((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin', false);
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to anon, authenticated;

alter table public.classes enable row level security;
alter table public.grades enable row level security;
alter table public.shared_timetables enable row level security;
alter table public.class_grade_stats enable row level security;

alter table public.shared_timetables
  add column if not exists user_id uuid references auth.users(id) on delete cascade,
  add column if not exists expires_at timestamptz default (now() + interval '30 days'),
  add column if not exists created_at timestamptz default now();

alter table public.shared_timetables
  alter column user_id set default auth.uid(),
  alter column created_at set default now(),
  alter column expires_at set default (now() + interval '30 days');

create index if not exists idx_classes_user_id on public.classes (user_id);
create index if not exists idx_grades_user_id on public.grades (user_id);
create index if not exists idx_shared_timetables_user_id on public.shared_timetables (user_id);
create index if not exists idx_shared_timetables_expires_at on public.shared_timetables (expires_at);

do $$
declare
  p record;
begin
  for p in select policyname from pg_policies where schemaname = 'public' and tablename = 'classes' loop
    execute format('drop policy if exists %I on public.classes', p.policyname);
  end loop;

  for p in select policyname from pg_policies where schemaname = 'public' and tablename = 'grades' loop
    execute format('drop policy if exists %I on public.grades', p.policyname);
  end loop;

  for p in select policyname from pg_policies where schemaname = 'public' and tablename = 'shared_timetables' loop
    execute format('drop policy if exists %I on public.shared_timetables', p.policyname);
  end loop;

  for p in select policyname from pg_policies where schemaname = 'public' and tablename = 'class_grade_stats' loop
    execute format('drop policy if exists %I on public.class_grade_stats', p.policyname);
  end loop;
end
$$;

create policy "classes_select_own"
  on public.classes
  for select
  to authenticated
  using (auth.uid() = user_id);

create policy "classes_insert_own"
  on public.classes
  for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "classes_update_own"
  on public.classes
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "classes_delete_own"
  on public.classes
  for delete
  to authenticated
  using (auth.uid() = user_id);

create policy "grades_select_own"
  on public.grades
  for select
  to authenticated
  using (auth.uid() = user_id);

create policy "grades_insert_own"
  on public.grades
  for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "grades_update_own"
  on public.grades
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "grades_delete_own"
  on public.grades
  for delete
  to authenticated
  using (auth.uid() = user_id);

create policy "shared_timetables_owner_manage"
  on public.shared_timetables
  for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "class_grade_stats_read_authenticated"
  on public.class_grade_stats
  for select
  to authenticated
  using (true);

create policy "class_grade_stats_admin_insert"
  on public.class_grade_stats
  for insert
  to authenticated
  with check (public.is_admin());

create policy "class_grade_stats_admin_update"
  on public.class_grade_stats
  for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "class_grade_stats_admin_delete"
  on public.class_grade_stats
  for delete
  to authenticated
  using (public.is_admin());

create or replace function public.create_shared_timetable(payload jsonb)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  new_id uuid;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;

  insert into public.shared_timetables (user_id, data)
  values (auth.uid(), payload)
  returning id into new_id;

  return new_id;
end;
$$;

create or replace function public.get_shared_timetable(p_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  payload jsonb;
begin
  select data
    into payload
    from public.shared_timetables
   where id = p_id
     and coalesce(expires_at > now(), true)
   limit 1;

  return payload;
end;
$$;

create or replace function public.delete_user()
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;

  delete from public.shared_timetables where user_id = auth.uid();
  delete from public.grades where user_id = auth.uid();
  delete from public.classes where user_id = auth.uid();
  delete from auth.users where id = auth.uid();
end;
$$;

revoke all on function public.create_shared_timetable(jsonb) from public;
revoke all on function public.get_shared_timetable(uuid) from public;
revoke all on function public.delete_user() from public;

grant execute on function public.create_shared_timetable(jsonb) to authenticated;
grant execute on function public.get_shared_timetable(uuid) to anon, authenticated;
grant execute on function public.delete_user() to authenticated;

commit;
