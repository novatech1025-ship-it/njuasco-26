-- Replace legacy site_settings (id/address/phone columns) with CMS key/value store.

alter table if exists public.site_settings rename to site_settings_legacy;

create table public.site_settings (
  key text primary key,
  value jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

drop trigger if exists site_settings_updated_at on public.site_settings;
create trigger site_settings_updated_at
before update on public.site_settings
for each row execute function public.set_updated_at();

alter table public.site_settings enable row level security;

drop policy if exists "Public can read site settings" on public.site_settings;
create policy "Public can read site settings"
on public.site_settings
for select
to anon, authenticated
using (true);

drop policy if exists "Public can upsert site settings" on public.site_settings;
drop policy if exists "Authenticated staff can manage site settings" on public.site_settings;
create policy "Authenticated staff can manage site settings"
on public.site_settings
for all
to authenticated
using (public.is_njuasco_staff_admin())
with check (public.is_njuasco_staff_admin());

do $$
begin
  alter publication supabase_realtime add table public.site_settings;
exception
  when duplicate_object then null;
end $$;

notify pgrst, 'reload schema';
