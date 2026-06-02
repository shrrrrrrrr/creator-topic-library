-- v1.1 Supabase schema for creator-topic-library.
-- This migration adds database tables only. Existing localStorage app logic is not changed.

create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  username text not null,
  nickname text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_username_not_blank check (length(trim(username)) > 0)
);

create unique index if not exists profiles_username_unique_idx
on public.profiles (lower(username));

create table if not exists public.user_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  theme_mode text not null default 'system',
  accent_color text not null default 'blue',
  toolbox_wallpaper_url text,
  remember_login_preference boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint user_settings_theme_mode_check check (theme_mode in ('system', 'light', 'dark')),
  constraint user_settings_accent_color_check check (
    accent_color in ('red', 'orange', 'yellow', 'green', 'cyan', 'blue', 'purple', 'light', 'dark')
  )
);

create table if not exists public.topics (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  headings jsonb not null default '[]'::jsonb,
  description text not null default '',
  tag_ids uuid[] not null default '{}',
  status text not null default 'draft',
  reference_links jsonb not null default '[]'::jsonb,
  material_links jsonb not null default '[]'::jsonb,
  latest_score_record_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint topics_title_not_blank check (length(trim(title)) > 0),
  constraint topics_status_check check (status in ('draft', 'planned', 'in_progress', 'completed', 'reviewed'))
);

create index if not exists topics_user_id_idx on public.topics (user_id);
create index if not exists topics_status_idx on public.topics (status);
create index if not exists topics_created_at_idx on public.topics (created_at desc);

create table if not exists public.tags (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  color text not null,
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint tags_name_not_blank check (length(trim(name)) > 0),
  constraint tags_color_not_blank check (length(trim(color)) > 0)
);

create index if not exists tags_user_id_idx on public.tags (user_id);
create unique index if not exists tags_user_name_unique_idx
on public.tags (user_id, lower(name));

create table if not exists public.score_templates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  color text not null,
  description text,
  criteria jsonb not null default '[]'::jsonb,
  bonus_items jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint score_templates_name_not_blank check (length(trim(name)) > 0),
  constraint score_templates_color_not_blank check (length(trim(color)) > 0)
);

create index if not exists score_templates_user_id_idx on public.score_templates (user_id);

create table if not exists public.score_records (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  topic_id uuid not null references public.topics(id) on delete cascade,
  template_id uuid references public.score_templates(id) on delete set null,
  criterion_scores jsonb not null default '[]'::jsonb,
  bonus_item_ids text[] not null default '{}',
  custom_bonus_items jsonb not null default '[]'::jsonb,
  total_score numeric(8, 2) not null default 0,
  level text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint score_records_level_check check (level in ('S', 'A', 'B', 'C', 'D')),
  constraint score_records_total_score_check check (total_score >= 0)
);

create index if not exists score_records_user_id_idx on public.score_records (user_id);
create index if not exists score_records_topic_id_idx on public.score_records (topic_id);
create index if not exists score_records_template_id_idx on public.score_records (template_id);

create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  topic_id uuid references public.topics(id) on delete set null,
  title text not null,
  body text not null default '',
  headings jsonb not null default '[]'::jsonb,
  content_blocks jsonb not null default '[]'::jsonb,
  image_links jsonb not null default '[]'::jsonb,
  normal_links jsonb not null default '[]'::jsonb,
  data_dashboard_links jsonb not null default '[]'::jsonb,
  platform text not null default '',
  published_at timestamptz,
  read_or_play_count integer not null default 0,
  like_count integer not null default 0,
  comment_count integer not null default 0,
  favorite_count integer not null default 0,
  share_count integer not null default 0,
  follower_growth integer not null default 0,
  conversion_result text not null default '',
  summary text not null default '',
  next_improvement text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint reviews_title_not_blank check (length(trim(title)) > 0),
  constraint reviews_read_or_play_count_check check (read_or_play_count >= 0),
  constraint reviews_like_count_check check (like_count >= 0),
  constraint reviews_comment_count_check check (comment_count >= 0),
  constraint reviews_favorite_count_check check (favorite_count >= 0),
  constraint reviews_share_count_check check (share_count >= 0)
);

create index if not exists reviews_user_id_idx on public.reviews (user_id);
create index if not exists reviews_topic_id_idx on public.reviews (topic_id);
create index if not exists reviews_created_at_idx on public.reviews (created_at desc);

create table if not exists public.toolbox_icons (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  url text not null,
  cover_type text not null default 'color',
  cover_color text,
  cover_image_url text,
  x integer not null default 0,
  y integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint toolbox_icons_name_not_blank check (length(trim(name)) > 0),
  constraint toolbox_icons_url_not_blank check (length(trim(url)) > 0),
  constraint toolbox_icons_cover_type_check check (cover_type in ('color', 'image'))
);

create index if not exists toolbox_icons_user_id_idx on public.toolbox_icons (user_id);

create table if not exists public.active_devices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  device_id text not null,
  device_name text not null default '',
  user_agent text not null default '',
  last_seen_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  constraint active_devices_device_id_not_blank check (length(trim(device_id)) > 0)
);

create index if not exists active_devices_user_id_idx on public.active_devices (user_id);
create unique index if not exists active_devices_user_device_unique_idx
on public.active_devices (user_id, device_id);

create table if not exists public.version_notes (
  version text primary key,
  title text not null,
  content text not null,
  created_at timestamptz not null default now(),
  constraint version_notes_version_not_blank check (length(trim(version)) > 0),
  constraint version_notes_title_not_blank check (length(trim(title)) > 0)
);

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

drop trigger if exists user_settings_set_updated_at on public.user_settings;
create trigger user_settings_set_updated_at
before update on public.user_settings
for each row execute function public.set_updated_at();

drop trigger if exists topics_set_updated_at on public.topics;
create trigger topics_set_updated_at
before update on public.topics
for each row execute function public.set_updated_at();

drop trigger if exists tags_set_updated_at on public.tags;
create trigger tags_set_updated_at
before update on public.tags
for each row execute function public.set_updated_at();

drop trigger if exists score_templates_set_updated_at on public.score_templates;
create trigger score_templates_set_updated_at
before update on public.score_templates
for each row execute function public.set_updated_at();

drop trigger if exists score_records_set_updated_at on public.score_records;
create trigger score_records_set_updated_at
before update on public.score_records
for each row execute function public.set_updated_at();

drop trigger if exists reviews_set_updated_at on public.reviews;
create trigger reviews_set_updated_at
before update on public.reviews
for each row execute function public.set_updated_at();

drop trigger if exists toolbox_icons_set_updated_at on public.toolbox_icons;
create trigger toolbox_icons_set_updated_at
before update on public.toolbox_icons
for each row execute function public.set_updated_at();

alter table public.profiles enable row level security;
alter table public.user_settings enable row level security;
alter table public.topics enable row level security;
alter table public.tags enable row level security;
alter table public.score_templates enable row level security;
alter table public.score_records enable row level security;
alter table public.reviews enable row level security;
alter table public.toolbox_icons enable row level security;
alter table public.active_devices enable row level security;
alter table public.version_notes enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
drop policy if exists "profiles_insert_own" on public.profiles;
drop policy if exists "profiles_update_own" on public.profiles;
drop policy if exists "profiles_delete_own" on public.profiles;

drop policy if exists "user_settings_select_own" on public.user_settings;
drop policy if exists "user_settings_insert_own" on public.user_settings;
drop policy if exists "user_settings_update_own" on public.user_settings;
drop policy if exists "user_settings_delete_own" on public.user_settings;

drop policy if exists "topics_select_own" on public.topics;
drop policy if exists "topics_insert_own" on public.topics;
drop policy if exists "topics_update_own" on public.topics;
drop policy if exists "topics_delete_own" on public.topics;

drop policy if exists "tags_select_own" on public.tags;
drop policy if exists "tags_insert_own" on public.tags;
drop policy if exists "tags_update_own" on public.tags;
drop policy if exists "tags_delete_own" on public.tags;

drop policy if exists "score_templates_select_own" on public.score_templates;
drop policy if exists "score_templates_insert_own" on public.score_templates;
drop policy if exists "score_templates_update_own" on public.score_templates;
drop policy if exists "score_templates_delete_own" on public.score_templates;

drop policy if exists "score_records_select_own" on public.score_records;
drop policy if exists "score_records_insert_own" on public.score_records;
drop policy if exists "score_records_update_own" on public.score_records;
drop policy if exists "score_records_delete_own" on public.score_records;

drop policy if exists "reviews_select_own" on public.reviews;
drop policy if exists "reviews_insert_own" on public.reviews;
drop policy if exists "reviews_update_own" on public.reviews;
drop policy if exists "reviews_delete_own" on public.reviews;

drop policy if exists "toolbox_icons_select_own" on public.toolbox_icons;
drop policy if exists "toolbox_icons_insert_own" on public.toolbox_icons;
drop policy if exists "toolbox_icons_update_own" on public.toolbox_icons;
drop policy if exists "toolbox_icons_delete_own" on public.toolbox_icons;

drop policy if exists "active_devices_select_own" on public.active_devices;
drop policy if exists "active_devices_insert_own" on public.active_devices;
drop policy if exists "active_devices_update_own" on public.active_devices;
drop policy if exists "active_devices_delete_own" on public.active_devices;

drop policy if exists "version_notes_select_authenticated" on public.version_notes;

create policy "profiles_select_own"
on public.profiles for select
using (auth.uid() = user_id);

create policy "profiles_insert_own"
on public.profiles for insert
with check (auth.uid() = user_id);

create policy "profiles_update_own"
on public.profiles for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "profiles_delete_own"
on public.profiles for delete
using (auth.uid() = user_id);

create policy "user_settings_select_own"
on public.user_settings for select
using (auth.uid() = user_id);

create policy "user_settings_insert_own"
on public.user_settings for insert
with check (auth.uid() = user_id);

create policy "user_settings_update_own"
on public.user_settings for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "user_settings_delete_own"
on public.user_settings for delete
using (auth.uid() = user_id);

create policy "topics_select_own"
on public.topics for select
using (auth.uid() = user_id);

create policy "topics_insert_own"
on public.topics for insert
with check (auth.uid() = user_id);

create policy "topics_update_own"
on public.topics for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "topics_delete_own"
on public.topics for delete
using (auth.uid() = user_id);

create policy "tags_select_own"
on public.tags for select
using (auth.uid() = user_id);

create policy "tags_insert_own"
on public.tags for insert
with check (auth.uid() = user_id);

create policy "tags_update_own"
on public.tags for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "tags_delete_own"
on public.tags for delete
using (auth.uid() = user_id);

create policy "score_templates_select_own"
on public.score_templates for select
using (auth.uid() = user_id);

create policy "score_templates_insert_own"
on public.score_templates for insert
with check (auth.uid() = user_id);

create policy "score_templates_update_own"
on public.score_templates for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "score_templates_delete_own"
on public.score_templates for delete
using (auth.uid() = user_id);

create policy "score_records_select_own"
on public.score_records for select
using (auth.uid() = user_id);

create policy "score_records_insert_own"
on public.score_records for insert
with check (auth.uid() = user_id);

create policy "score_records_update_own"
on public.score_records for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "score_records_delete_own"
on public.score_records for delete
using (auth.uid() = user_id);

create policy "reviews_select_own"
on public.reviews for select
using (auth.uid() = user_id);

create policy "reviews_insert_own"
on public.reviews for insert
with check (auth.uid() = user_id);

create policy "reviews_update_own"
on public.reviews for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "reviews_delete_own"
on public.reviews for delete
using (auth.uid() = user_id);

create policy "toolbox_icons_select_own"
on public.toolbox_icons for select
using (auth.uid() = user_id);

create policy "toolbox_icons_insert_own"
on public.toolbox_icons for insert
with check (auth.uid() = user_id);

create policy "toolbox_icons_update_own"
on public.toolbox_icons for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "toolbox_icons_delete_own"
on public.toolbox_icons for delete
using (auth.uid() = user_id);

create policy "active_devices_select_own"
on public.active_devices for select
using (auth.uid() = user_id);

create policy "active_devices_insert_own"
on public.active_devices for insert
with check (auth.uid() = user_id);

create policy "active_devices_update_own"
on public.active_devices for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "active_devices_delete_own"
on public.active_devices for delete
using (auth.uid() = user_id);

create policy "version_notes_select_authenticated"
on public.version_notes for select
to authenticated
using (true);
