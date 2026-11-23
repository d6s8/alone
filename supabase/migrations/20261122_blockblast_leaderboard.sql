create table if not exists public.blockblast_daily_scores (
  daily_date date not null check (daily_date >= date '2026-04-20'),
  player_id uuid not null,
  score integer not null check (score between 0 and 10000000),
  updated_at timestamptz not null default now(),
  primary key (daily_date, player_id)
);

create index if not exists blockblast_daily_scores_rank_idx
  on public.blockblast_daily_scores (daily_date, score desc, updated_at asc);

alter table public.blockblast_daily_scores enable row level security;
revoke all on table public.blockblast_daily_scores from public, anon, authenticated;
grant select, insert, update, delete on table public.blockblast_daily_scores to service_role;

create table if not exists public.blockblast_rate_limits (
  ip_hash text primary key check (char_length(ip_hash) = 64),
  window_started_at timestamptz not null default now(),
  request_count integer not null default 1 check (request_count > 0)
);

alter table public.blockblast_rate_limits enable row level security;
revoke all on table public.blockblast_rate_limits from public, anon, authenticated;
grant select, insert, update, delete on table public.blockblast_rate_limits to service_role;

create index if not exists blockblast_rate_limits_window_started_at_idx
  on public.blockblast_rate_limits (window_started_at);

create or replace function public.consume_blockblast_rate_limit(p_ip_hash text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $function$
declare
  current_count integer;
begin
  if p_ip_hash is null or char_length(p_ip_hash) <> 64 then
    return false;
  end if;

  delete from public.blockblast_rate_limits
  where window_started_at < now() - interval '24 hours';

  insert into public.blockblast_rate_limits (ip_hash, window_started_at, request_count)
  values (p_ip_hash, now(), 1)
  on conflict (ip_hash) do update
  set
    window_started_at = case
      when public.blockblast_rate_limits.window_started_at <= now() - interval '1 hour'
        then now()
      else public.blockblast_rate_limits.window_started_at
    end,
    request_count = case
      when public.blockblast_rate_limits.window_started_at <= now() - interval '1 hour'
        then 1
      else public.blockblast_rate_limits.request_count + 1
    end
  returning request_count into current_count;

  return current_count <= 30;
end;
$function$;

revoke all on function public.consume_blockblast_rate_limit(text) from public, anon, authenticated;
grant execute on function public.consume_blockblast_rate_limit(text) to service_role;

create or replace function public.submit_blockblast_daily_score(
  p_daily_date date,
  p_player_id uuid,
  p_score integer
)
returns table (player_id uuid, score integer, updated_at timestamptz)
language plpgsql
security definer
set search_path = ''
as $function$
begin
  if p_daily_date is null
    or p_daily_date <> (now() at time zone 'UTC')::date
    or p_player_id is null
    or p_score is null
    or p_score < 0
    or p_score > 10000000
  then
    raise exception 'Invalid daily BlockBlast score.';
  end if;

  return query
  insert into public.blockblast_daily_scores as existing
    (daily_date, player_id, score)
  values (p_daily_date, p_player_id, p_score)
  on conflict (daily_date, player_id) do update
  set
    score = greatest(existing.score, excluded.score),
    updated_at = now()
  returning existing.player_id, existing.score, existing.updated_at;
end;
$function$;

revoke all on function public.submit_blockblast_daily_score(date, uuid, integer)
  from public, anon, authenticated;
grant execute on function public.submit_blockblast_daily_score(date, uuid, integer)
  to service_role;
