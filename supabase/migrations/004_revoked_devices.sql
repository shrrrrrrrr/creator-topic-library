create table if not exists public.revoked_devices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  device_id text not null,
  revoked_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  constraint revoked_devices_device_id_not_blank check (length(trim(device_id)) > 0)
);

create unique index if not exists revoked_devices_user_device_unique_idx
on public.revoked_devices (user_id, device_id);

create index if not exists revoked_devices_user_id_idx
on public.revoked_devices (user_id);

alter table public.revoked_devices enable row level security;

drop policy if exists "revoked_devices_select_own" on public.revoked_devices;
drop policy if exists "revoked_devices_insert_own" on public.revoked_devices;
drop policy if exists "revoked_devices_update_own" on public.revoked_devices;
drop policy if exists "revoked_devices_delete_own" on public.revoked_devices;

create policy "revoked_devices_select_own"
on public.revoked_devices for select
using (auth.uid() = user_id);

create policy "revoked_devices_insert_own"
on public.revoked_devices for insert
with check (auth.uid() = user_id);

create policy "revoked_devices_update_own"
on public.revoked_devices for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "revoked_devices_delete_own"
on public.revoked_devices for delete
using (auth.uid() = user_id);
