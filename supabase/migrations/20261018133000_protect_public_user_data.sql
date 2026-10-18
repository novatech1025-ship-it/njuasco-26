-- Keep private site-content collections available to authenticated staff only.
drop policy if exists "Public can read site content" on public.site_content;
create policy "Public can read approved site content"
on public.site_content
for select
to anon, authenticated
using (
  key in (
    'news',
    'team',
    'departments',
    'houses',
    'clubs',
    'facilities',
    'gallery',
    'documents',
    'homepageSlides',
    'merchandise',
    'teachers',
    'njosaEvents',
    'njosaCareers',
    'njosaLeaders',
    'njosaSettings'
  )
);

-- Application references are served through the restricted admission-status function.
drop policy if exists "Public can check application by reference" on public.admission_applications;
drop policy if exists "Public can view admission document rows" on public.admission_documents;

create or replace function public.is_submitted_admission_application(p_application_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.admission_applications
    where id = p_application_id
      and status = 'submitted'
  );
$$;

revoke all on function public.is_submitted_admission_application(uuid) from public;
grant execute on function public.is_submitted_admission_application(uuid) to anon, authenticated;

drop policy if exists "Public can submit admission document rows" on public.admission_documents;
create policy "Public can submit admission document rows"
on public.admission_documents
for insert
to anon
with check (
  public.is_submitted_admission_application(application_id)
  and left(storage_path, length(application_id::text) + 1) = application_id::text || '/'
  and length(file_name) between 1 and 255
  and file_size between 1 and 20971520
);
