create table if not exists public.njosa_members (
  id text primary key,
  value jsonb not null,
  created_at timestamptz not null default now()
);

alter table public.njosa_members enable row level security;

drop policy if exists "Anyone can submit NJOSA registration" on public.njosa_members;
create policy "Anyone can submit NJOSA registration"
on public.njosa_members
for insert
to anon, authenticated
with check (jsonb_typeof(value) = 'object');

drop policy if exists "NJOSA staff can read registrations" on public.njosa_members;
create policy "NJOSA staff can read registrations"
on public.njosa_members
for select
to authenticated
using (public.is_njuasco_staff_admin());

drop policy if exists "NJOSA staff can update registrations" on public.njosa_members;
create policy "NJOSA staff can update registrations"
on public.njosa_members
for update
to authenticated
using (public.is_njuasco_staff_admin())
with check (public.is_njuasco_staff_admin());

drop policy if exists "NJOSA staff can delete registrations" on public.njosa_members;
create policy "NJOSA staff can delete registrations"
on public.njosa_members
for delete
to authenticated
using (public.is_njuasco_staff_admin());
