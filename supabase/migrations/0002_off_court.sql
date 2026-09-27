-- Off-court profile: profession, interests, and what happens after the match.
--
-- A separate axis from `intent`. Wanting a drink or a professional
-- conversation after playing is unrelated to dating and applies identically
-- between two men, two women, or any other pairing — which is exactly why it
-- could not be folded into the existing intent column.

alter table public.players
  add column profession text not null default '' check (char_length(profession) <= 80),
  add column industry   text not null default 'other' check (industry in (
    'tech', 'finance', 'health', 'pharma', 'science', 'law', 'consulting',
    'marketing', 'education', 'engineering', 'creative', 'publicSector',
    'hospitality', 'trades', 'retail', 'entrepreneur', 'student', 'retired',
    'other'
  )),
  add column interests  text[] not null default '{}',
  -- Empty means "just tennis", which is a valid answer, not a missing one.
  add column after_play text[] not null default '{}';

-- Discovery filters on profession and interests only for display, never as a
-- hard filter, so no index is needed on them yet. Industry gets one because a
-- "same field" lookup is the likeliest future filter.
create index players_industry_idx on public.players (industry);

-- discover_candidates() returns `setof public.players`, so it picks the new
-- columns up automatically; no change needed there.
