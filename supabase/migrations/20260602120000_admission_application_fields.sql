alter table public.admission_applications
add column if not exists bece_index text;

drop policy if exists "Public can view admission document rows" on public.admission_documents;
create policy "Public can view admission document rows"
on public.admission_documents
for select
to anon
using (true);
