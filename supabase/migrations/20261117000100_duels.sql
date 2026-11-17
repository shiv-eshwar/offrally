create schema if not exists club;
revoke all on schema club from public, anon, authenticated;
create table club.rounds (
  code text primary key,
  minutes integer not null check (minutes in (1,5,15,25)),
  created timestamptz not null default now(),
  started timestamptz,
  host uuid not null,
  guest uuid,
  host_name text not null,
  guest_name text,
  host_ms bigint not null default 0,
  guest_ms bigint not null default 0,
  host_check timestamptz,
  guest_check timestamptz
);
create index on club.rounds(host,created desc);
alter table club.rounds enable row level security;
revoke all on club.rounds from public, anon, authenticated;

create function public.club_round(action text, invite text default '', nickname text default '', duration integer default 5)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  actor uuid := auth.uid();
  t timestamptz;
  r club.rounds;
  deadline timestamptz;
  previous timestamptz;
  credit integer := 0;
  mine boolean;
begin
  if actor is null then raise exception 'Sign in first.'; end if;
  if action not in ('create','join','look','beat','rest') or action is null then raise exception 'Unknown action.'; end if;
  if action in ('create','join') and (nickname is null or length(trim(nickname)) not between 1 and 20) then raise exception 'Use a name of 1 to 20 characters.'; end if;
  if action='create' then
    if duration is null or duration not in (1,5,15,25) then raise exception 'Choose a supported round length.'; end if;
    perform pg_advisory_xact_lock(hashtextextended(actor::text,0));
    if exists(select 1 from club.rounds where host=actor and created>now()-interval '15 seconds') then raise exception 'Wait a few seconds before creating another room.'; end if;
    insert into club.rounds(code,minutes,host,host_name)
    values(upper(left(replace(gen_random_uuid()::text,'-',''),10)),duration,actor,trim(nickname)) returning * into r;
  else
    select * into r from club.rounds where code=upper(trim(invite)) for update;
    if not found then raise exception 'Room unavailable. Check the code.'; end if;
    if action='join' and actor<>r.host and r.guest is null and r.created>now()-interval '1 day' then
      update club.rounds set guest=actor,guest_name=trim(nickname),started=clock_timestamp() where code=r.code returning * into r;
    end if;
    if actor<>r.host and actor is distinct from r.guest then raise exception 'Room unavailable. Check the code.'; end if;
  end if;
  t:=clock_timestamp();
  mine:=r.host=actor;
  deadline:=r.started+make_interval(mins=>r.minutes);
  if action in ('beat','rest') and deadline is not null then
    previous:=case when mine then r.host_check else r.guest_check end;
    -- Bound unobserved gaps. A late reconnect cannot claim the missing period.
    if previous is not null and t-previous <= interval '8 seconds' then
      credit:=greatest(0,floor(extract(epoch from (least(t,deadline)-previous))*1000))::integer;
    end if;
    if action='rest' or t>=deadline then t:=null; end if;
    if mine then
      update club.rounds set host_ms=least(minutes*60000,host_ms+credit),host_check=t where code=r.code returning * into r;
    else
      update club.rounds set guest_ms=least(minutes*60000,guest_ms+credit),guest_check=t where code=r.code returning * into r;
    end if;
  end if;
  t:=clock_timestamp();
  return jsonb_build_object('code',r.code,'minutes',r.minutes,'host',r.host_name,'guest',r.guest_name,'hostMs',r.host_ms,'guestMs',r.guest_ms,
    'seat',case when mine then 'host' else 'guest' end,'remainingMs',greatest(0,extract(epoch from (deadline-t))*1000),
    'stage',case when r.started is null and r.created<=t-interval '1 day' then 'expired' when r.started is null then 'waiting' when deadline<=t then 'finished' else 'running' end);
end
$$;
revoke all on function public.club_round(text,text,text,integer) from public, anon;
grant execute on function public.club_round(text,text,text,integer) to authenticated;
