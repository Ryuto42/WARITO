begin;

-- user_metadata は本人が auth.updateUser() で書き換えられるため、権限判定に使わない
create or replace function public.is_admin()
returns boolean
language sql
stable
set search_path = ''
as $$
  select coalesce((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin', false);
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to anon, authenticated;

alter table public.timetable_presets enable row level security;

create index if not exists idx_timetable_presets_user_id on public.timetable_presets (user_id);

do $$
declare
  p record;
begin
  for p in select policyname from pg_policies where schemaname = 'public' and tablename = 'timetable_presets' loop
    execute format('drop policy if exists %I on public.timetable_presets', p.policyname);
  end loop;
end
$$;

create policy "timetable_presets_select_own"
  on public.timetable_presets
  for select
  to authenticated
  using (auth.uid() = user_id);

create policy "timetable_presets_insert_own"
  on public.timetable_presets
  for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "timetable_presets_update_own"
  on public.timetable_presets
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "timetable_presets_delete_own"
  on public.timetable_presets
  for delete
  to authenticated
  using (auth.uid() = user_id);

revoke all on table public.timetable_presets from anon;
grant select, insert, update, delete on table public.timetable_presets to authenticated;

-- 期限なしの共有は get-shared-timetable で読めなくなるため、作成日から30日に揃える
update public.shared_timetables
   set expires_at = coalesce(created_at, now()) + interval '30 days'
 where expires_at is null;

-- 既存の共有データからもメモを取り除く
update public.shared_timetables
   set data = jsonb_set(data, '{cs}', (select coalesce(jsonb_agg(c - 'm'), '[]'::jsonb) from jsonb_array_elements(data -> 'cs') c))
 where jsonb_typeof(data -> 'cs') = 'array';

alter table public.shared_timetables
  alter column expires_at set default (now() + interval '30 days'),
  alter column expires_at set not null;

commit;
