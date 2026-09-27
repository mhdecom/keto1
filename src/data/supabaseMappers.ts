import type {
  BackhandStyle,
  Gender,
  Intensity,
  Intent,
  InterclubLevel,
  Match,
  Message,
  Player,
  PlayFormat,
  PlayRequest,
  RallyConsistency,
  Skill,
  Surface,
  SwissClassification,
  TimeBlock,
} from '../domain/types';

/** Shape of a row in `public.players`. */
export interface PlayerRow {
  id: string;
  first_name: string;
  birth_year: number;
  gender: string;
  photos: string[];
  bio: string;
  neighbourhood: string;
  lat: number;
  lon: number;
  radius_km: number;
  classification: string | null;
  years_playing: number;
  interclub: string;
  rally_consistency: string;
  self_rating: number | string | null;
  formats: string[];
  intensity: string;
  surfaces: string[];
  backhand: string;
  strengths: string[];
  weaknesses: string[];
  availability: number;
  venue_ids: string[];
  intent: string;
  seeking: string[];
  age_min: number;
  age_max: number;
  has_court_access: boolean;
  languages: string[];
  created_at: string;
}

export interface MatchRow {
  id: string;
  player_a: string;
  player_b: string;
  dating_enabled: boolean;
  created_at: string;
}

export interface MessageRow {
  id: string;
  match_id: string;
  sender_id: string;
  body: string;
  created_at: string;
}

export interface PlayRequestRow {
  id: string;
  player_id: string;
  play_date: string;
  time_block: string;
  venue_id: string | null;
  format: string;
  note: string;
  min_strength: number;
  max_strength: number;
  created_at: string;
  play_request_responses?: Array<{ player_id: string }> | null;
}

export function rowToPlayer(row: PlayerRow): Player {
  return {
    id: row.id,
    firstName: row.first_name,
    birthYear: row.birth_year,
    gender: row.gender as Gender,
    photos: row.photos ?? [],
    bio: row.bio ?? '',
    neighbourhood: row.neighbourhood ?? '',
    lat: row.lat,
    lon: row.lon,
    radiusKm: row.radius_km,
    level: {
      classification: (row.classification as SwissClassification | null) ?? null,
      yearsPlaying: row.years_playing,
      interclub: row.interclub as InterclubLevel,
      rallyConsistency: row.rally_consistency as RallyConsistency,
      // numeric(2,1) arrives as a string over the wire.
      selfRating: row.self_rating === null ? null : Number(row.self_rating),
    },
    formats: (row.formats ?? []) as PlayFormat[],
    intensity: row.intensity as Intensity,
    surfaces: (row.surfaces ?? []) as Surface[],
    backhand: row.backhand as BackhandStyle,
    strengths: (row.strengths ?? []) as Skill[],
    weaknesses: (row.weaknesses ?? []) as Skill[],
    availability: row.availability,
    venueIds: row.venue_ids ?? [],
    intent: row.intent as Intent,
    seeking: (row.seeking ?? []) as Gender[],
    ageMin: row.age_min,
    ageMax: row.age_max,
    hasCourtAccess: row.has_court_access,
    languages: row.languages ?? [],
    createdAt: row.created_at,
  };
}

/** Column payload for insert/update. `id` and `created_at` are handled separately. */
export function playerToRow(player: Player): Omit<PlayerRow, 'created_at'> {
  return {
    id: player.id,
    first_name: player.firstName,
    birth_year: player.birthYear,
    gender: player.gender,
    photos: player.photos,
    bio: player.bio,
    neighbourhood: player.neighbourhood,
    lat: player.lat,
    lon: player.lon,
    radius_km: player.radiusKm,
    classification: player.level.classification,
    years_playing: player.level.yearsPlaying,
    interclub: player.level.interclub,
    rally_consistency: player.level.rallyConsistency,
    self_rating: player.level.selfRating,
    formats: player.formats,
    intensity: player.intensity,
    surfaces: player.surfaces,
    backhand: player.backhand,
    strengths: player.strengths,
    weaknesses: player.weaknesses,
    availability: player.availability,
    venue_ids: player.venueIds,
    intent: player.intent,
    seeking: player.seeking,
    age_min: player.ageMin,
    age_max: player.ageMax,
    has_court_access: player.hasCourtAccess,
    languages: player.languages,
  };
}

export function rowToMatch(row: MatchRow): Match {
  return {
    id: row.id,
    playerIds: [row.player_a, row.player_b],
    createdAt: row.created_at,
    datingEnabled: row.dating_enabled,
  };
}

export function rowToMessage(row: MessageRow): Message {
  return {
    id: row.id,
    matchId: row.match_id,
    senderId: row.sender_id,
    body: row.body,
    createdAt: row.created_at,
  };
}

export function rowToPlayRequest(row: PlayRequestRow): PlayRequest {
  return {
    id: row.id,
    playerId: row.player_id,
    date: row.play_date,
    timeBlock: row.time_block as TimeBlock,
    venueId: row.venue_id,
    format: row.format as PlayFormat,
    note: row.note ?? '',
    minStrength: row.min_strength,
    maxStrength: row.max_strength,
    createdAt: row.created_at,
    respondentIds: (row.play_request_responses ?? []).map((response) => response.player_id),
  };
}
