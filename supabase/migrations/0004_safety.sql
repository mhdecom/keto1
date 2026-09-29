-- Account deletion, blocking, and photo moderation.
--
-- These three are what the App Store review guidelines require of an app that
-- gets strangers to meet in person: 5.1.1(v) deletion, 1.2 reporting, blocking
-- and a moderation process.

-- ---------------------------------------------------------------------------
-- Account deletion (Guideline 5.1.1 v)
--
-- Everything hangs off auth.users by "on delete cascade", so removing that one
-- row takes the profile, swipes, matches, messages, requests, blocks and
-- reports with it. Storage objects are not covered by the cascade, so they are
-- removed explicitly first.
--
-- Security definer because a user may not delete from auth.users directly. The
-- function must be created by a role that can (postgres / the SQL editor).
-- ---------------------------------------------------------------------------

-- Reports filed *against* an account are kept when it is deleted: erasing the
-- record of why someone was reported would defeat the point of having reports.
-- The column is nulled instead, so nothing personal survives.
alter table public.reports
  alter column reported_id drop not null;

alter table public.reports
  drop constraint if exists reports_reported_id_fkey;

alter table public.reports
  add constraint reports_reported_id_fkey
    foreign key (reported_id) references public.players (id) on delete set null;

create or replace function public.delete_own_account()
returns void
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  me uuid := auth.uid();
begin
  if me is null then
    raise exception 'not authenticated';
  end if;

  delete from storage.objects
  where bucket_id = 'photos'
    and (storage.foldername(name))[1] = me::text;

  update public.reports set reported_id = null where reported_id = me;

  delete from auth.users where id = me;
end;
$$;

-- ---------------------------------------------------------------------------
-- Blocking (Guideline 1.2)
--
-- One call: record the block and tear down the match, so the thread disappears
-- for both sides instead of sitting there unanswered. The blocked person is
-- never told, which is the point of a block.
-- ---------------------------------------------------------------------------

create or replace function public.block_player(target uuid)
returns void
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  me uuid := auth.uid();
begin
  if me is null then
    raise exception 'not authenticated';
  end if;
  if me = target then
    raise exception 'cannot block yourself';
  end if;

  insert into public.blocks (blocker_id, blocked_id)
  values (me, target)
  on conflict do nothing;

  delete from public.matches
  where player_a = least(me, target) and player_b = greatest(me, target);
end;
$$;

-- discover_candidates already filters blocks in both directions.

-- ---------------------------------------------------------------------------
-- Photo moderation (Guideline 1.2: a method for filtering objectionable
-- content)
--
-- Photos appear immediately and are reviewed afterwards. At the scale this app
-- starts at, a queue a human works through is a real moderation process, and
-- it is honest about what it is. Automated pre-screening plugs into the same
-- table: a classifier writes auto_verdict before a human ever sees the row.
-- Until a provider is chosen, that stays a documented seam rather than a
-- pretend implementation.
-- ---------------------------------------------------------------------------

create table public.photo_rejections (
  player_id  uuid not null references public.players (id) on delete cascade,
  url        text not null,
  created_at timestamptz not null default now(),
  primary key (player_id, url)
);

alter table public.photo_rejections enable row level security;

-- Visible to its owner, so the app can say why a picture disappeared.
create policy photo_rejections_select_own on public.photo_rejections
  for select using (player_id = auth.uid());

create table public.photo_reviews (
  id           uuid primary key default gen_random_uuid(),
  player_id    uuid not null references public.players (id) on delete cascade,
  url          text not null,
  status       text not null default 'pending'
                 check (status in ('pending', 'approved', 'rejected')),
  auto_verdict text check (auto_verdict in ('clean', 'suspect', 'blocked')),
  auto_score   numeric(4, 3) check (auto_score between 0 and 1),
  reviewed_at  timestamptz,
  created_at   timestamptz not null default now(),
  constraint photo_reviews_unique unique (player_id, url)
);

create index photo_reviews_queue_idx on public.photo_reviews (status, created_at);

alter table public.photo_reviews enable row level security;

-- Only the owner sees the state of their own pictures. Reviewers work through
-- the service role, not through this policy.
create policy photo_reviews_select_own on public.photo_reviews
  for select using (player_id = auth.uid());

-- Queues every newly added photo and drops rows for photos removed again.
create or replace function public.sync_photo_reviews()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.photo_reviews (player_id, url)
  select new.id, url from unnest(new.photos) as url
  on conflict (player_id, url) do nothing;

  delete from public.photo_reviews
  where player_id = new.id and not (url = any (new.photos));

  return new;
end;
$$;

create trigger players_sync_photo_reviews
  after insert or update of photos on public.players
  for each row execute function public.sync_photo_reviews();

-- Rejecting a photo removes it from the profile in the same step. The verdict
-- goes to photo_rejections, which outlives the queue row the trigger deletes.
create or replace function public.reject_photo(review_id uuid)
returns void
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  target public.photo_reviews;
begin
  select * into target from public.photo_reviews where id = review_id;
  if not found then
    raise exception 'unknown review %', review_id;
  end if;

  insert into public.photo_rejections (player_id, url)
  values (target.player_id, target.url)
  on conflict do nothing;

  update public.players
  set photos = array_remove(photos, target.url)
  where id = target.player_id;
end;
$$;

create or replace function public.approve_photo(review_id uuid)
returns void
language sql
volatile
security definer
set search_path = public
as $$
  update public.photo_reviews
  set status = 'approved', reviewed_at = now()
  where id = review_id;
$$;

-- What a reviewer works through. Queried with the service role.
create or replace view public.moderation_queue as
  select
    r.id,
    r.player_id,
    r.url,
    r.status,
    r.auto_verdict,
    r.auto_score,
    r.created_at,
    p.first_name,
    p.birth_year,
    (select count(*) from public.reports rep
       where rep.reported_id = r.player_id and rep.status <> 'resolved') as open_reports
  from public.photo_reviews r
  join public.players p on p.id = r.player_id
  where r.status = 'pending'
  order by
    -- Anything already reported, or flagged by a classifier, jumps the queue.
    (select count(*) from public.reports rep
       where rep.reported_id = r.player_id and rep.status <> 'resolved') desc,
    (r.auto_verdict = 'blocked') desc,
    (r.auto_verdict = 'suspect') desc,
    r.created_at asc;

-- A report about pictures pulls that person's photos back to the front of the
-- queue instead of waiting for a reviewer to work down to them.
create or replace function public.escalate_photo_report()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.reason = 'inappropriatePhotos' and new.reported_id is not null then
    update public.photo_reviews
    set status = 'pending', reviewed_at = null
    where player_id = new.reported_id;
  end if;
  return new;
end;
$$;

create trigger reports_escalate_photos
  after insert on public.reports
  for each row execute function public.escalate_photo_report();

grant execute on function public.delete_own_account() to authenticated;
grant execute on function public.block_player(uuid) to authenticated;
