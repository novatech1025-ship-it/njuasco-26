-- NJUASCO site-assets bucket for houses, gallery, media, documents, school uploads.
-- Folders used by the app (inside site-assets): houses/, gallery/, media/, documents/, school/, homepageSlides/, uploads/

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

drop policy if exists "Public can read site assets" on storage.objects;
create policy "Public can read site assets"
on storage.objects
for select
to anon, authenticated
using (bucket_id = 'site-assets');

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

-- Let sub-admins update only the subadmins site_content row after first password setup.
drop policy if exists "Sub-admins can update own subadmin profile flags" on public.site_content;
create policy "Sub-admins can update own subadmin profile flags"
on public.site_content
for update
to authenticated
using (
  key = 'subadmins'
  and public.is_njuasco_staff_admin()
)
with check (
  key = 'subadmins'
  and public.is_njuasco_staff_admin()
);
