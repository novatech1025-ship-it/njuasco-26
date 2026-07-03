create extension if not exists "pgcrypto";

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

alter table public.admission_applications enable row level security;
alter table public.admission_documents enable row level security;
alter table public.admission_notifications enable row level security;

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
