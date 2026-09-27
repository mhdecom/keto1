-- Profile photos and workplace.

-- ---------------------------------------------------------------------------
-- Workplace: a second location anchor, not a replacement for home.
--
-- Matching measures the distance from whichever of a player's anchors brings
-- the pair closest together, so someone who lives out of town but works in the
-- centre is matchable for a weekday evening hit. Both columns are nullable
-- because "no fixed workplace" is a real answer (tradespeople, retirees,
-- anyone who would rather not say).
-- ---------------------------------------------------------------------------

alter table public.players
  add column work_neighbourhood text not null default '' check (char_length(work_neighbourhood) <= 80),
  add column work_lat double precision check (work_lat between -90 and 90),
  add column work_lon double precision check (work_lon between -180 and 180),
  -- Either both coordinates or neither; half a location is worse than none.
  add constraint players_work_coords_complete
    check ((work_lat is null) = (work_lon is null));

-- The discovery bounding box stays anchored on home: widening it to cover both
-- anchors in SQL would complicate the query for little gain, and the exact
-- best-anchor distance is computed client-side anyway. Revisit if the radius
-- filter starts hiding good matches who live far out.

-- ---------------------------------------------------------------------------
-- Photos
--
-- Stored in a public bucket: profile pictures are shown to anyone the matching
-- surfaces, so signed URLs would add churn without adding privacy. What is
-- protected is *writing* — a player can only write inside a folder named after
-- their own user id, which the policies below enforce by path.
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'photos',
  'photos',
  true,
  5 * 1024 * 1024,
  array['image/jpeg', 'image/png', 'image/webp', 'image/heic']
)
on conflict (id) do nothing;

create policy photos_read_all on storage.objects
  for select using (bucket_id = 'photos');

create policy photos_insert_own_folder on storage.objects
  for insert with check (
    bucket_id = 'photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy photos_update_own_folder on storage.objects
  for update using (
    bucket_id = 'photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy photos_delete_own_folder on storage.objects
  for delete using (
    bucket_id = 'photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
