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
create policy "Authenticated staff can manage applications"
on public.admission_applications
for all
to authenticated
using (public.is_njuasco_staff_admin())
with check (public.is_njuasco_staff_admin());

drop policy if exists "Authenticated admins can manage document rows" on public.admission_documents;
create policy "Authenticated staff can manage document rows"
on public.admission_documents
for all
to authenticated
using (public.is_njuasco_staff_admin())
with check (public.is_njuasco_staff_admin());

drop policy if exists "Authenticated admins can manage notifications" on public.admission_notifications;
create policy "Authenticated staff can manage notifications"
on public.admission_notifications
for all
to authenticated
using (public.is_njuasco_staff_admin())
with check (public.is_njuasco_staff_admin());

drop policy if exists "Admins can manage admission documents" on storage.objects;
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
