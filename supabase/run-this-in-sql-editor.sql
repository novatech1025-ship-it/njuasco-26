create extension if not exists "pgcrypto";

-- If an old legacy site_settings table exists (id/address/phone columns), rename it first.
do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'site_settings'
      and column_name = 'id'
  ) and not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'site_settings'
      and column_name = 'key'
  ) then
    alter table public.site_settings rename to site_settings_legacy;
  end if;
end $$;

create table if not exists public.site_settings (
  key text primary key,
  value jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists public.site_content (
  key text primary key,
  value jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists public.admission_applications (
  id uuid primary key default gen_random_uuid(),
  ref text not null unique,
  first_name text,
  last_name text,
  name text not null,
  dob date,
  gender text,
  address text,
  phone text,
  previous_school text,
  bece_index text,
  bece_year integer,
  aggregate integer,
  programme text not null,
  guardian_name text,
  guardian_relation text,
  guardian_phone text,
  guardian_email text,
  guardian_occupation text,
  status text not null default 'submitted' check (status in ('submitted', 'under_review', 'approved', 'rejected')),
  stage text not null default 'Application submitted',
  decision_note text,
  decision_date date,
  timeline jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.admission_documents (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.admission_applications(id) on delete cascade,
  document_type text not null,
  label text not null,
  file_name text not null,
  mime_type text,
  file_size integer,
  storage_path text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.admission_notifications (
  id uuid primary key default gen_random_uuid(),
  application_id uuid references public.admission_applications(id) on delete set null,
  channel text not null check (channel in ('email', 'sms', 'system')),
  recipient text not null,
  subject text,
  message text not null,
  provider_status text not null default 'queued',
  provider_response jsonb,
  created_at timestamptz not null default now()
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists admission_applications_updated_at on public.admission_applications;
create trigger admission_applications_updated_at
before update on public.admission_applications
for each row execute function public.set_updated_at();

drop trigger if exists site_settings_updated_at on public.site_settings;
create trigger site_settings_updated_at
before update on public.site_settings
for each row execute function public.set_updated_at();

drop trigger if exists site_content_updated_at on public.site_content;
create trigger site_content_updated_at
before update on public.site_content
for each row execute function public.set_updated_at();

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'admission-documents',
  'admission-documents',
  false,
  20971520,
  array[
    'application/pdf',
    'image/jpeg',
    'image/png',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ]
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'site-assets',
  'site-assets',
  true,
  15728640,
  array[
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif',
    'image/svg+xml',
    'application/pdf'
  ]
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

alter table public.site_settings enable row level security;
alter table public.site_content enable row level security;
alter table public.admission_applications enable row level security;
alter table public.admission_documents enable row level security;
alter table public.admission_notifications enable row level security;

drop policy if exists "Public can read site settings" on public.site_settings;
create policy "Public can read site settings"
on public.site_settings
for select
to anon, authenticated
using (true);

drop policy if exists "Public can upsert site settings" on public.site_settings;
create policy "Public can upsert site settings"
on public.site_settings
for all
to anon, authenticated
using (true)
with check (true);

drop policy if exists "Public can read site content" on public.site_content;
create policy "Public can read site content"
on public.site_content
for select
to anon, authenticated
using (true);

drop policy if exists "Public can upsert site content" on public.site_content;
create policy "Public can upsert site content"
on public.site_content
for all
to anon, authenticated
using (true)
with check (true);

drop policy if exists "Public can submit applications" on public.admission_applications;
create policy "Public can submit applications"
on public.admission_applications
for insert
to anon
with check (status = 'submitted');

drop policy if exists "Public can check application by reference" on public.admission_applications;
create policy "Public can check application by reference"
on public.admission_applications
for select
to anon
using (true);

drop policy if exists "Public can view admission document rows" on public.admission_documents;
create policy "Public can view admission document rows"
on public.admission_documents
for select
to anon
using (true);

drop policy if exists "Public can upload admission documents" on storage.objects;
create policy "Public can upload admission documents"
on storage.objects
for insert
to anon
with check (bucket_id = 'admission-documents');

drop policy if exists "Admins can manage admission documents" on storage.objects;
create policy "Admins can manage admission documents"
on storage.objects
for all
to authenticated
using (bucket_id = 'admission-documents')
with check (bucket_id = 'admission-documents');

drop policy if exists "Public can read site assets" on storage.objects;
create policy "Public can read site assets"
on storage.objects
for select
to anon, authenticated
using (bucket_id = 'site-assets');

drop policy if exists "Public can upload site assets" on storage.objects;
create policy "Public can upload site assets"
on storage.objects
for insert
to anon, authenticated
with check (bucket_id = 'site-assets');

drop policy if exists "Authenticated admins can manage applications" on public.admission_applications;
create policy "Authenticated admins can manage applications"
on public.admission_applications
for all
to authenticated
using (true)
with check (true);

drop policy if exists "Authenticated admins can manage document rows" on public.admission_documents;
create policy "Authenticated admins can manage document rows"
on public.admission_documents
for all
to authenticated
using (true)
with check (true);

drop policy if exists "Authenticated admins can manage notifications" on public.admission_notifications;
create policy "Authenticated admins can manage notifications"
on public.admission_notifications
for all
to authenticated
using (true)
with check (true);

create or replace function public.njuasco_auth_email()
returns text
language sql
stable
as $$
  select lower(coalesce(auth.jwt() ->> 'email', ''));
$$;

create or replace function public.is_njuasco_full_admin()
returns boolean
language sql
stable
as $$
  select public.njuasco_auth_email() in ('info@njuasco.edu.gh', 'novatech1025@gmail.com');
$$;

create or replace function public.is_njuasco_staff_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_njuasco_full_admin()
    or exists (
      select 1
      from public.site_content sc
      cross join lateral jsonb_array_elements(sc.value) profile
      where sc.key = 'subadmins'
        and coalesce((profile ->> 'active')::boolean, true) = true
        and lower(coalesce(profile ->> 'email', profile ->> 'username', '')) = public.njuasco_auth_email()
    );
$$;

drop policy if exists "Public can upsert site settings" on public.site_settings;
drop policy if exists "Authenticated staff can manage site settings" on public.site_settings;
create policy "Authenticated staff can manage site settings"
on public.site_settings
for all
to authenticated
using (public.is_njuasco_staff_admin())
with check (public.is_njuasco_staff_admin());

drop policy if exists "Public can upsert site content" on public.site_content;
drop policy if exists "Authenticated staff can manage site content" on public.site_content;
create policy "Authenticated staff can manage site content"
on public.site_content
for all
to authenticated
using (
  public.is_njuasco_full_admin()
  or (key <> 'subadmins' and public.is_njuasco_staff_admin())
)
with check (
  public.is_njuasco_full_admin()
  or (key <> 'subadmins' and public.is_njuasco_staff_admin())
);

drop policy if exists "Authenticated admins can manage applications" on public.admission_applications;
drop policy if exists "Authenticated staff can manage applications" on public.admission_applications;
create policy "Authenticated staff can manage applications"
on public.admission_applications
for all
to authenticated
using (public.is_njuasco_staff_admin())
with check (public.is_njuasco_staff_admin());

drop policy if exists "Authenticated admins can manage document rows" on public.admission_documents;
drop policy if exists "Authenticated staff can manage document rows" on public.admission_documents;
create policy "Authenticated staff can manage document rows"
on public.admission_documents
for all
to authenticated
using (public.is_njuasco_staff_admin())
with check (public.is_njuasco_staff_admin());

drop policy if exists "Authenticated admins can manage notifications" on public.admission_notifications;
drop policy if exists "Authenticated staff can manage notifications" on public.admission_notifications;
create policy "Authenticated staff can manage notifications"
on public.admission_notifications
for all
to authenticated
using (public.is_njuasco_staff_admin())
with check (public.is_njuasco_staff_admin());

drop policy if exists "Admins can manage admission documents" on storage.objects;
drop policy if exists "Authenticated staff can manage admission documents" on storage.objects;
create policy "Authenticated staff can manage admission documents"
on storage.objects
for all
to authenticated
using (bucket_id = 'admission-documents' and public.is_njuasco_staff_admin())
with check (bucket_id = 'admission-documents' and public.is_njuasco_staff_admin());

drop policy if exists "Public can upload site assets" on storage.objects;
drop policy if exists "Authenticated staff can upload site assets" on storage.objects;
create policy "Authenticated staff can upload site assets"
on storage.objects
for insert
to authenticated
with check (bucket_id = 'site-assets' and public.is_njuasco_staff_admin());

drop policy if exists "Authenticated staff can update site assets" on storage.objects;
create policy "Authenticated staff can update site assets"
on storage.objects
for update
to authenticated
using (bucket_id = 'site-assets' and public.is_njuasco_staff_admin())
with check (bucket_id = 'site-assets' and public.is_njuasco_staff_admin());

drop policy if exists "Authenticated staff can delete site assets" on storage.objects;
create policy "Authenticated staff can delete site assets"
on storage.objects
for delete
to authenticated
using (bucket_id = 'site-assets' and public.is_njuasco_staff_admin());

drop policy if exists "Sub-admins can update own subadmin profile flags" on public.site_content;
create policy "Sub-admins can update own subadmin profile flags"
on public.site_content
for update
to authenticated
using (key = 'subadmins' and public.is_njuasco_staff_admin())
with check (key = 'subadmins' and public.is_njuasco_staff_admin());

do $$
begin
  alter publication supabase_realtime add table public.site_settings;
exception
  when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.site_content;
exception
  when duplicate_object then null;
end $$;
