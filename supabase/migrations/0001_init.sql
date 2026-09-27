-- Tinder Tennis — initial schema.
--
-- Design notes:
--   * The matching score is NOT computed here. It lives in src/domain/matching.ts
--     so there is one tested implementation rather than two that drift apart.
--     Postgres does the coarse, privacy-relevant filtering; the client scores
--     the shortlist it is allowed to see.
--   * Profiles are not world-readable. A player can read their own row and the
--     rows of players they matched with. Discovery goes through a
--     security-definer function that returns only candidates who pass both
--     sides' stated preferences — so nobody can enumerate the user base.
--   * Enumerated values are text + CHECK rather than Postgres enums: adding a
--     surface or a play format should not require an ALTER TYPE migration.

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- players
-- ---------------------------------------------------------------------------

create table public.players (
  id                uuid primary key references auth.users (id) on delete cascade,
  first_name        text        not null check (char_length(first_name) between 1 and 40),
  birth_year        int         not null check (birth_year between 1920 and extract(year from now())::int - 18),
  gender            text        not null check (gender in ('female', 'male', 'other')),
  photos            text[]      not null default '{}',
  bio               text        not null default '' check (char_length(bio) <= 600),
  neighbourhood     text        not null default '',
  lat               double precision not null check (lat between -90 and 90),
  lon               double precision not null check (lon between -180 and 180),
  radius_km         int         not null default 10 check (radius_km between 1 and 100),

  -- level
  classification    text        check (classification in
                      ('N1','N2','N3','N4','R1','R2','R3','R4','R5','R6','R7','R8','R9')),
  years_playing     int         not null default 0 check (years_playing between 0 and 80),
  interclub         text        not null default 'none'
                      check (interclub in ('none','active','league1to3','league4plus')),
  rally_consistency text        not null default 'under5'
                      check (rally_consistency in ('under5','from5to10','from10to20','over20')),
  self_rating       numeric(2,1) check (self_rating between 1.0 and 7.0),

  -- play style
  formats           text[]      not null default '{}',
  intensity         text        not null default 'casual'
                      check (intensity in ('casual','ambitious','competitive')),
  surfaces          text[]      not null default '{}',
  backhand          text        not null default 'twoHanded'
                      check (backhand in ('oneHanded','twoHanded')),
  strengths         text[]      not null default '{}',
  weaknesses        text[]      not null default '{}',

  -- availability as a 21 bit mask (7 days x 3 blocks)
  availability      int         not null default 0 check (availability between 0 and 2097151),
  venue_ids         text[]      not null default '{}',

  -- intent
  intent            text        not null default 'tennisOnly'
                      check (intent in ('tennisOnly','openToDating','competitionOnly')),
  seeking           text[]      not null default '{female,male,other}',
  age_min           int         not null default 18 check (age_min >= 18),
  age_max           int         not null default 99 check (age_max <= 120),

  has_court_access  boolean     not null default false,
  languages         text[]      not null default '{de}',
  -- Soft-hide without deleting: paused profiles never appear in discovery.
  is_paused         boolean     not null default false,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),

  constraint players_age_range_valid check (age_max >= age_min)
);

create index players_discovery_idx on public.players (gender, is_paused);
create index players_location_idx on public.players (lat, lon);

-- ---------------------------------------------------------------------------
-- swipes
-- ---------------------------------------------------------------------------

create table public.swipes (
  id             uuid primary key default gen_random_uuid(),
  from_player_id uuid not null references public.players (id) on delete cascade,
  to_player_id   uuid not null references public.players (id) on delete cascade,
  direction      text not null check (direction in ('like', 'pass')),
  created_at     timestamptz not null default now(),
  constraint swipes_no_self check (from_player_id <> to_player_id),
  constraint swipes_once unique (from_player_id, to_player_id)
);

create index swipes_incoming_idx on public.swipes (to_player_id, direction);

-- ---------------------------------------------------------------------------
-- matches
-- ---------------------------------------------------------------------------

-- player_a is always the lexicographically smaller uuid. That makes the pair
-- uniquely representable, so a race between two simultaneous likes cannot
-- create two rows for the same match.
create table public.matches (
  id             uuid primary key default gen_random_uuid(),
  player_a       uuid not null references public.players (id) on delete cascade,
  player_b       uuid not null references public.players (id) on delete cascade,
  dating_enabled boolean not null default false,
  created_at     timestamptz not null default now(),
  constraint matches_ordered check (player_a < player_b),
  constraint matches_unique_pair unique (player_a, player_b)
);

create index matches_player_a_idx on public.matches (player_a);
create index matches_player_b_idx on public.matches (player_b);

-- ---------------------------------------------------------------------------
-- messages
-- ---------------------------------------------------------------------------

create table public.messages (
  id         uuid primary key default gen_random_uuid(),
  match_id   uuid not null references public.matches (id) on delete cascade,
  sender_id  uuid not null references public.players (id) on delete cascade,
  body       text not null check (char_length(body) between 1 and 2000),
  created_at timestamptz not null default now()
);

create index messages_thread_idx on public.messages (match_id, created_at);

-- ---------------------------------------------------------------------------
-- open play requests
-- ---------------------------------------------------------------------------

create table public.play_requests (
  id           uuid primary key default gen_random_uuid(),
  player_id    uuid not null references public.players (id) on delete cascade,
  play_date    date not null,
  time_block   text not null check (time_block in ('morning','midday','evening')),
  venue_id     text,
  format       text not null check (format in ('singles','doubles','mixed','rally','matchPractice')),
  note         text not null default '' check (char_length(note) <= 400),
  min_strength int not null default 0 check (min_strength between 0 and 100),
  max_strength int not null default 100 check (max_strength between 0 and 100),
  created_at   timestamptz not null default now(),
  constraint play_requests_strength_range check (max_strength >= min_strength)
);

create index play_requests_upcoming_idx on public.play_requests (play_date, time_block);

create table public.play_request_responses (
  request_id uuid not null references public.play_requests (id) on delete cascade,
  player_id  uuid not null references public.players (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (request_id, player_id)
);

-- ---------------------------------------------------------------------------
-- safety: blocks and reports
--
-- Not optional. An app that lets strangers arrange to meet in person needs
-- both, and the App Store review guidelines for anything with a dating aspect
-- require them explicitly.
-- ---------------------------------------------------------------------------

create table public.blocks (
  blocker_id uuid not null references public.players (id) on delete cascade,
  blocked_id uuid not null references public.players (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  constraint blocks_no_self check (blocker_id <> blocked_id)
);

create table public.reports (
  id             uuid primary key default gen_random_uuid(),
  reporter_id    uuid not null references public.players (id) on delete cascade,
  reported_id    uuid not null references public.players (id) on delete cascade,
  reason         text not null check (reason in
                   ('harassment','fakeProfile','inappropriatePhotos','noShow','underage','other')),
  detail         text not null default '' check (char_length(detail) <= 1000),
  status         text not null default 'open' check (status in ('open','reviewing','resolved')),
  created_at     timestamptz not null default now(),
  constraint reports_no_self check (reporter_id <> reported_id)
);

create index reports_open_idx on public.reports (status, created_at);

-- ---------------------------------------------------------------------------
-- helpers
-- ---------------------------------------------------------------------------

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger players_touch_updated_at
  before update on public.players
  for each row execute function public.touch_updated_at();

-- True when the current user is matched with the given player.
create or replace function public.is_matched_with(other uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.matches
    where (player_a = auth.uid() and player_b = other)
       or (player_b = auth.uid() and player_a = other)
  );
$$;

-- ---------------------------------------------------------------------------
-- discovery
--
-- Returns candidates who pass BOTH sides' stated preferences. Security definer
-- so it can look at rows the caller cannot select directly — the point is that
-- the caller gets a filtered shortlist instead of read access to everybody.
--
-- Distance is filtered with a cheap latitude/longitude bounding box; the exact
-- great-circle distance and the weighted score are computed on the client by
-- the same code the unit tests cover.
-- ---------------------------------------------------------------------------

create or replace function public.discover_candidates(limit_count int default 100)
returns setof public.players
language sql
stable
security definer
set search_path = public
as $$
  with me as (
    select * from public.players where id = auth.uid()
  )
  select p.*
  from public.players p, me
  where p.id <> me.id
    and not p.is_paused
    -- mutual gender preference
    and p.gender = any (me.seeking)
    and me.gender = any (p.seeking)
    -- mutual age range
    and (extract(year from now())::int - p.birth_year) between me.age_min and me.age_max
    and (extract(year from now())::int - me.birth_year) between p.age_min and p.age_max
    -- bounding box on the tighter of the two radiuses (1 deg lat ~ 111 km)
    and abs(p.lat - me.lat) <= least(p.radius_km, me.radius_km) / 111.0
    and abs(p.lon - me.lon)
          <= least(p.radius_km, me.radius_km) / (111.0 * greatest(cos(radians(me.lat)), 0.01))
    -- not already decided on
    and not exists (
      select 1 from public.swipes s
      where s.from_player_id = me.id and s.to_player_id = p.id
    )
    -- not blocked in either direction
    and not exists (
      select 1 from public.blocks b
      where (b.blocker_id = me.id and b.blocked_id = p.id)
         or (b.blocker_id = p.id and b.blocked_id = me.id)
    )
  limit limit_count;
$$;

-- ---------------------------------------------------------------------------
-- swiping
--
-- One transaction: record the swipe, and create the match if the other side
-- already liked back. Doing this in a function rather than two client calls
-- removes the window where a mutual like produces no match, or two.
-- ---------------------------------------------------------------------------

create or replace function public.record_swipe(target uuid, dir text)
returns public.matches
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  me uuid := auth.uid();
  reciprocated boolean;
  result public.matches;
  a uuid;
  b uuid;
  both_open boolean;
begin
  if me is null then
    raise exception 'not authenticated';
  end if;
  if me = target then
    raise exception 'cannot swipe on yourself';
  end if;
  if dir not in ('like', 'pass') then
    raise exception 'invalid direction: %', dir;
  end if;

  insert into public.swipes (from_player_id, to_player_id, direction)
  values (me, target, dir)
  on conflict (from_player_id, to_player_id)
    do update set direction = excluded.direction, created_at = now();

  if dir <> 'like' then
    return null;
  end if;

  select exists (
    select 1 from public.swipes s
    where s.from_player_id = target and s.to_player_id = me and s.direction = 'like'
  ) into reciprocated;

  if not reciprocated then
    return null;
  end if;

  a := least(me, target);
  b := greatest(me, target);

  -- Dating is only unlocked when both sides explicitly chose it.
  select bool_and(p.intent = 'openToDating')
  from public.players p
  where p.id in (me, target)
  into both_open;

  insert into public.matches (player_a, player_b, dating_enabled)
  values (a, b, coalesce(both_open, false))
  on conflict (player_a, player_b) do update set player_a = excluded.player_a
  returning * into result;

  return result;
end;
$$;

-- ---------------------------------------------------------------------------
-- Row level security
-- ---------------------------------------------------------------------------

alter table public.players                enable row level security;
alter table public.swipes                 enable row level security;
alter table public.matches                enable row level security;
alter table public.messages               enable row level security;
alter table public.play_requests          enable row level security;
alter table public.play_request_responses enable row level security;
alter table public.blocks                 enable row level security;
alter table public.reports                enable row level security;

-- players: own row, plus the profiles of people you matched with.
create policy players_select_own on public.players
  for select using (id = auth.uid());
create policy players_select_matched on public.players
  for select using (public.is_matched_with(id));
create policy players_insert_own on public.players
  for insert with check (id = auth.uid());
create policy players_update_own on public.players
  for update using (id = auth.uid()) with check (id = auth.uid());
create policy players_delete_own on public.players
  for delete using (id = auth.uid());

-- swipes: you can see and make your own. You can never see who passed on you.
create policy swipes_select_own on public.swipes
  for select using (from_player_id = auth.uid());
create policy swipes_insert_own on public.swipes
  for insert with check (from_player_id = auth.uid());

-- matches: readable by either participant; only created by record_swipe().
create policy matches_select_participant on public.matches
  for select using (player_a = auth.uid() or player_b = auth.uid());
create policy matches_delete_participant on public.matches
  for delete using (player_a = auth.uid() or player_b = auth.uid());

-- messages: only inside your own matches, and only as yourself.
create policy messages_select_participant on public.messages
  for select using (
    exists (
      select 1 from public.matches m
      where m.id = messages.match_id
        and (m.player_a = auth.uid() or m.player_b = auth.uid())
    )
  );
create policy messages_insert_participant on public.messages
  for insert with check (
    sender_id = auth.uid()
    and exists (
      select 1 from public.matches m
      where m.id = messages.match_id
        and (m.player_a = auth.uid() or m.player_b = auth.uid())
    )
  );

-- play requests: public within the app, because that is the point of them.
-- Past requests stay readable so a thread keeps its context.
create policy play_requests_select_all on public.play_requests
  for select using (auth.uid() is not null);
create policy play_requests_insert_own on public.play_requests
  for insert with check (player_id = auth.uid());
create policy play_requests_update_own on public.play_requests
  for update using (player_id = auth.uid()) with check (player_id = auth.uid());
create policy play_requests_delete_own on public.play_requests
  for delete using (player_id = auth.uid());

create policy prr_select_visible on public.play_request_responses
  for select using (
    player_id = auth.uid()
    or exists (
      select 1 from public.play_requests r
      where r.id = play_request_responses.request_id and r.player_id = auth.uid()
    )
  );
create policy prr_insert_own on public.play_request_responses
  for insert with check (player_id = auth.uid());
create policy prr_delete_own on public.play_request_responses
  for delete using (player_id = auth.uid());

-- blocks: entirely private to the blocker.
create policy blocks_select_own on public.blocks
  for select using (blocker_id = auth.uid());
create policy blocks_insert_own on public.blocks
  for insert with check (blocker_id = auth.uid());
create policy blocks_delete_own on public.blocks
  for delete using (blocker_id = auth.uid());

-- reports: write-only from the client. A reporter can see what they filed;
-- nobody can see that they were reported.
create policy reports_select_own on public.reports
  for select using (reporter_id = auth.uid());
create policy reports_insert_own on public.reports
  for insert with check (reporter_id = auth.uid());

-- Discovery and swiping are reached through the functions, not the tables.
grant execute on function public.discover_candidates(int) to authenticated;
grant execute on function public.record_swipe(uuid, text) to authenticated;
grant execute on function public.is_matched_with(uuid) to authenticated;
