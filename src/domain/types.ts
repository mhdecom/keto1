/**
 * Domain model for Tinder Tennis.
 *
 * Everything in `src/domain` is pure TypeScript with no React Native or
 * Supabase imports, so the matching logic can be unit tested in isolation.
 */

// ---------------------------------------------------------------------------
// Level
// ---------------------------------------------------------------------------

/**
 * Swiss Tennis classification. N1 is the strongest, R9 the weakest classified
 * player. Anyone without a licence is `unclassified` and gets estimated from
 * the self-assessment fields instead.
 */
export const SWISS_CLASSIFICATIONS = [
  'N1',
  'N2',
  'N3',
  'N4',
  'R1',
  'R2',
  'R3',
  'R4',
  'R5',
  'R6',
  'R7',
  'R8',
  'R9',
] as const;

export type SwissClassification = (typeof SWISS_CLASSIFICATIONS)[number];

/**
 * How many balls the player can keep in the court in a cooperative cross-court
 * rally. A crude question, but the single best strength proxy we have for
 * players without a classification.
 */
export const RALLY_CONSISTENCY = ['under5', 'from5to10', 'from10to20', 'over20'] as const;
export type RallyConsistency = (typeof RALLY_CONSISTENCY)[number];

export const INTERCLUB_LEVELS = ['none', 'active', 'league1to3', 'league4plus'] as const;
export type InterclubLevel = (typeof INTERCLUB_LEVELS)[number];

export interface LevelProfile {
  /** Official classification, or null when unclassified. */
  classification: SwissClassification | null;
  /** Years of playing experience, self reported. */
  yearsPlaying: number;
  /** Interclub / team experience. */
  interclub: InterclubLevel;
  rallyConsistency: RallyConsistency;
  /** Optional NTRP-style self rating from 1.0 (never held a racket) to 7.0. */
  selfRating: number | null;
}

// ---------------------------------------------------------------------------
// Play style
// ---------------------------------------------------------------------------

export const PLAY_FORMATS = ['singles', 'doubles', 'mixed', 'rally', 'matchPractice'] as const;
export type PlayFormat = (typeof PLAY_FORMATS)[number];

export const INTENSITIES = ['casual', 'ambitious', 'competitive'] as const;
export type Intensity = (typeof INTENSITIES)[number];

export const SURFACES = ['clay', 'hard', 'indoor', 'carpet'] as const;
export type Surface = (typeof SURFACES)[number];

/** Technical and physical attributes a player can flag as a strength or a weakness. */
export const SKILLS = [
  'forehand',
  'backhand',
  'serve',
  'return',
  'volley',
  'slice',
  'topspin',
  'footwork',
  'stamina',
  'mental',
  'consistency',
  'tactics',
] as const;
export type Skill = (typeof SKILLS)[number];

export const BACKHAND_STYLES = ['oneHanded', 'twoHanded'] as const;
export type BackhandStyle = (typeof BACKHAND_STYLES)[number];

// ---------------------------------------------------------------------------
// Intent (this is what separates "find a hitting partner" from dating)
// ---------------------------------------------------------------------------

export const INTENTS = ['tennisOnly', 'openToDating', 'competitionOnly'] as const;
export type Intent = (typeof INTENTS)[number];

export const GENDERS = ['female', 'male', 'other'] as const;
export type Gender = (typeof GENDERS)[number];

// ---------------------------------------------------------------------------
// Availability
// ---------------------------------------------------------------------------

/** Monday = 0 … Sunday = 6. */
export const DAY_LABELS = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'] as const;

/** Three coarse blocks per day. Finer granularity only invites empty grids. */
export const TIME_BLOCKS = ['morning', 'midday', 'evening'] as const;
export type TimeBlock = (typeof TIME_BLOCKS)[number];

export const TIME_BLOCK_LABELS: Record<TimeBlock, string> = {
  morning: 'Früh (6–11)',
  midday: 'Mittag (11–17)',
  evening: 'Abend (17–22)',
};

/**
 * A weekly availability grid encoded as a 21 bit mask (7 days x 3 blocks).
 * Bit index is `day * 3 + blockIndex`.
 */
export type AvailabilityMask = number;

// ---------------------------------------------------------------------------
// Venues
// ---------------------------------------------------------------------------

export interface Venue {
  id: string;
  name: string;
  /** Operator, e.g. "Sportamt Stadt Zürich". */
  operator: string;
  courts: number;
  surface: Surface;
  lat: number;
  lon: number;
  /** Booking system the venue is reachable through, if any. */
  provider: 'gotcourts' | 'eversports' | 'courtsonline' | 'none';
  /** Provider specific slug used to build a deep link. */
  providerRef?: string;
  floodlight: boolean;
  yearRound: boolean;
}

// ---------------------------------------------------------------------------
// Player
// ---------------------------------------------------------------------------

export interface Player {
  id: string;
  firstName: string;
  birthYear: number;
  gender: Gender;
  photos: string[];
  bio: string;
  /** Home district / neighbourhood, free text for display only. */
  neighbourhood: string;
  lat: number;
  lon: number;
  /** Maximum travel distance in kilometres. */
  radiusKm: number;

  level: LevelProfile;
  formats: PlayFormat[];
  intensity: Intensity;
  surfaces: Surface[];
  backhand: BackhandStyle;
  strengths: Skill[];
  weaknesses: Skill[];

  availability: AvailabilityMask;
  venueIds: string[];

  intent: Intent;
  /** Which genders this player wants to be matched with. */
  seeking: Gender[];
  ageMin: number;
  ageMax: number;

  /** Has a club membership / can bring a court. */
  hasCourtAccess: boolean;
  languages: string[];
  createdAt: string;
}

/** A profile under construction during onboarding. */
export type PlayerDraft = Partial<Omit<Player, 'id' | 'createdAt'>>;

// ---------------------------------------------------------------------------
// Swipes, matches, chat
// ---------------------------------------------------------------------------

export type SwipeDirection = 'like' | 'pass';

export interface Swipe {
  id: string;
  fromPlayerId: string;
  toPlayerId: string;
  direction: SwipeDirection;
  createdAt: string;
}

export interface Match {
  id: string;
  playerIds: [string, string];
  createdAt: string;
  /** True only when both sides declared `openToDating`. */
  datingEnabled: boolean;
}

export interface Message {
  id: string;
  matchId: string;
  senderId: string;
  body: string;
  createdAt: string;
}

// ---------------------------------------------------------------------------
// Open play requests — the cold start answer
// ---------------------------------------------------------------------------

export interface PlayRequest {
  id: string;
  playerId: string;
  /** ISO date, e.g. "2026-09-28". */
  date: string;
  timeBlock: TimeBlock;
  venueId: string | null;
  format: PlayFormat;
  note: string;
  /** Acceptable classification window, expressed as strength points. */
  minStrength: number;
  maxStrength: number;
  createdAt: string;
  respondentIds: string[];
}
