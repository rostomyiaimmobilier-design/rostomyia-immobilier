create table if not exists public.agency_activity_logs (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  agency_user_id uuid not null references auth.users(id) on delete cascade,
  actor_user_id uuid references auth.users(id) on delete set null,
  action text not null,
  previous_status text,
  next_status text,
  details jsonb not null default '{}'::jsonb
);

create index if not exists agency_activity_logs_agency_created_idx
  on public.agency_activity_logs (agency_user_id, created_at desc);

create index if not exists agency_activity_logs_actor_created_idx
  on public.agency_activity_logs (actor_user_id, created_at desc);

create index if not exists agency_activity_logs_action_created_idx
  on public.agency_activity_logs (action, created_at desc);

alter table public.agency_activity_logs enable row level security;

drop policy if exists "agency activity logs admin select" on public.agency_activity_logs;
create policy "agency activity logs admin select"
  on public.agency_activity_logs
  for select
  using (
    exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and p.is_admin = true
    )
  );

drop policy if exists "agency activity logs admin insert" on public.agency_activity_logs;
create policy "agency activity logs admin insert"
  on public.agency_activity_logs
  for insert
  with check (
    exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and p.is_admin = true
    )
  );

drop policy if exists "agency activity logs admin update" on public.agency_activity_logs;
create policy "agency activity logs admin update"
  on public.agency_activity_logs
  for update
  using (
    exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and p.is_admin = true
    )
  )
  with check (
    exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and p.is_admin = true
    )
  );

drop policy if exists "agency activity logs admin delete" on public.agency_activity_logs;
create policy "agency activity logs admin delete"
  on public.agency_activity_logs
  for delete
  using (
    exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and p.is_admin = true
    )
  );

