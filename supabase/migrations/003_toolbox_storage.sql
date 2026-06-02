insert into storage.buckets (id, name, public)
values ('toolbox-assets', 'toolbox-assets', true)
on conflict (id) do update set public = true;

drop policy if exists "toolbox_assets_select_own" on storage.objects;
drop policy if exists "toolbox_assets_insert_own" on storage.objects;
drop policy if exists "toolbox_assets_update_own" on storage.objects;
drop policy if exists "toolbox_assets_delete_own" on storage.objects;

create policy "toolbox_assets_select_own"
on storage.objects for select
to authenticated
using (
  bucket_id = 'toolbox-assets'
  and auth.uid()::text = (storage.foldername(name))[1]
);

create policy "toolbox_assets_insert_own"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'toolbox-assets'
  and auth.uid()::text = (storage.foldername(name))[1]
);

create policy "toolbox_assets_update_own"
on storage.objects for update
to authenticated
using (
  bucket_id = 'toolbox-assets'
  and auth.uid()::text = (storage.foldername(name))[1]
)
with check (
  bucket_id = 'toolbox-assets'
  and auth.uid()::text = (storage.foldername(name))[1]
);

create policy "toolbox_assets_delete_own"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'toolbox-assets'
  and auth.uid()::text = (storage.foldername(name))[1]
);
