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

  select username
  into matched_username
  from public.profiles
  where lower(username) = normalized_input
  limit 1;

  if matched_username is not null then
    return matched_username;
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
