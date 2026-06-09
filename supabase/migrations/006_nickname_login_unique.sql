create or replace function public.is_nickname_available(
  nickname_input text,
  current_user_id uuid default null
)
returns boolean
language sql
security definer
set search_path = public
as $$
  select not exists (
    select 1
    from public.profiles
    where lower(trim(coalesce(nickname, ''))) = lower(trim(coalesce(nickname_input, '')))
      and (current_user_id is null or user_id <> current_user_id)
  );
$$;

grant execute on function public.is_nickname_available(text, uuid) to anon;
grant execute on function public.is_nickname_available(text, uuid) to authenticated;

create or replace function public.resolve_login_identifier(login_input text)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  normalized_input text;
  matched_username text;
  nickname_match_count integer;
begin
  normalized_input := lower(trim(coalesce(login_input, '')));

  if normalized_input = '' then
    raise exception 'login identifier is required';
  end if;

  select count(*)
  into nickname_match_count
  from public.profiles
  where lower(trim(coalesce(nickname, ''))) = normalized_input;

  if nickname_match_count > 1 then
    raise exception 'multiple profiles matched this nickname';
  end if;

  if nickname_match_count = 1 then
    select username
    into matched_username
    from public.profiles
    where lower(trim(coalesce(nickname, ''))) = normalized_input
    limit 1;

    return matched_username;
  end if;

  return normalized_input;
end;
$$;

grant execute on function public.resolve_login_identifier(text) to anon;
grant execute on function public.resolve_login_identifier(text) to authenticated;

create or replace function public.prevent_duplicate_profile_nickname()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if lower(trim(coalesce(new.nickname, ''))) = '' then
    raise exception 'nickname is required';
  end if;

  if tg_op = 'UPDATE'
    and lower(trim(coalesce(new.nickname, ''))) = lower(trim(coalesce(old.nickname, '')))
  then
    return new;
  end if;

  if exists (
    select 1
    from public.profiles
    where lower(trim(coalesce(nickname, ''))) = lower(trim(coalesce(new.nickname, '')))
      and user_id <> new.user_id
  ) then
    raise exception 'nickname already exists';
  end if;

  return new;
end;
$$;

drop trigger if exists profiles_prevent_duplicate_nickname on public.profiles;
create trigger profiles_prevent_duplicate_nickname
before insert or update of nickname on public.profiles
for each row
execute function public.prevent_duplicate_profile_nickname();
