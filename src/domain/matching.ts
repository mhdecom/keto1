import { availabilityCompatibility, describeSharedSlots, sharedSlots } from './availability';
import { distanceKm, proximityScore } from './geo';
import { estimateLevel, levelCompatibility, levelLabel } from './level';
import { INTENSITIES, type Intensity, type Player, type Surface } from './types';

/**
 * Relative importance of each signal. Level and availability dominate because
 * they are the two reasons a tennis pairing actually fails in practice: a
 * mismatched level makes the hit pointless, and a mismatched calendar means it
 * never happens at all. Everything else is preference.
 */
export const MATCH_WEIGHTS = {
  level: 0.32,
  availability: 0.24,
  location: 0.18,
  format: 0.12,
  intensity: 0.08,
  surface: 0.06,
} as const;

export type MatchFactor = keyof typeof MATCH_WEIGHTS;

export interface ScoreBreakdown {
  level: number;
  availability: number;
  location: number;
  format: number;
  intensity: number;
  surface: number;
}

export interface MatchCandidate {
  player: Player;
  /** Weighted total from 0 to 1. */
  score: number;
  breakdown: ScoreBreakdown;
  distanceKm: number;
  sharedVenueIds: string[];
  sharedSlotCount: number;
  /** Short, human readable justifications shown on the card. */
  reasons: string[];
  /** The one thing that fits worst, shown so the score is not a black box. */
  caveat: string | null;
  /** True only when both sides explicitly opted into dating. */
  datingEnabled: boolean;
}

export function ageFromBirthYear(birthYear: number, now = new Date()): number {
  return now.getFullYear() - birthYear;
}

function overlapRatio<T>(a: readonly T[], b: readonly T[], neutral = 0.5): number {
  if (a.length === 0 || b.length === 0) return neutral;
  const right = new Set(b);
  const shared = a.filter((item) => right.has(item)).length;
  return shared / Math.min(a.length, b.length);
}

function intensityCompatibility(a: Intensity, b: Intensity): number {
  const delta = Math.abs(INTENSITIES.indexOf(a) - INTENSITIES.indexOf(b));
  return 1 - delta / (INTENSITIES.length - 1);
}

function surfaceCompatibility(a: Surface[], b: Surface[]): number {
  return overlapRatio(a, b, 0.5);
}

/**
 * Hard filters. These are stated user preferences, not scoring inputs, so we
 * exclude rather than down-rank: showing someone outside their declared age or
 * gender preference is a bug, not a weak suggestion.
 */
export function passesHardFilters(viewer: Player, other: Player, now = new Date()): boolean {
  if (viewer.id === other.id) return false;

  if (!viewer.seeking.includes(other.gender)) return false;
  if (!other.seeking.includes(viewer.gender)) return false;

  const viewerAge = ageFromBirthYear(viewer.birthYear, now);
  const otherAge = ageFromBirthYear(other.birthYear, now);
  if (otherAge < viewer.ageMin || otherAge > viewer.ageMax) return false;
  if (viewerAge < other.ageMin || viewerAge > other.ageMax) return false;

  // Respect the tighter of the two travel radiuses rather than averaging them.
  const km = distanceKm(viewer, other);
  if (km > Math.min(viewer.radiusKm, other.radiusKm)) return false;

  return true;
}

const FACTOR_LABELS: Record<MatchFactor, string> = {
  level: 'Spielstärke',
  availability: 'Zeiten',
  location: 'Ort',
  format: 'Spielform',
  intensity: 'Anspruch',
  surface: 'Belag',
};

const FORMAT_LABELS: Record<string, string> = {
  singles: 'Einzel',
  doubles: 'Doppel',
  mixed: 'Mixed',
  rally: 'Einspielen',
  matchPractice: 'Matchtraining',
};

export function scoreCandidate(
  viewer: Player,
  other: Player,
  venueNames: Record<string, string> = {},
  now = new Date(),
): MatchCandidate {
  const breakdown: ScoreBreakdown = {
    level: levelCompatibility(viewer.level, other.level),
    availability: availabilityCompatibility(viewer.availability, other.availability),
    location: 0,
    format: overlapRatio(viewer.formats, other.formats, 0.3),
    intensity: intensityCompatibility(viewer.intensity, other.intensity),
    surface: surfaceCompatibility(viewer.surfaces, other.surfaces),
  };

  const km = distanceKm(viewer, other);
  const nearby = proximityScore(km);
  const sharedVenueIds = viewer.venueIds.filter((id) => other.venueIds.includes(id));
  const bothHaveVenues = viewer.venueIds.length > 0 && other.venueIds.length > 0;
  const venueOverlap = bothHaveVenues
    ? sharedVenueIds.length / Math.min(viewer.venueIds.length, other.venueIds.length)
    : null;

  // A shared home court beats raw proximity, but living close by still counts:
  // it is what makes a spontaneous "court free in an hour?" realistic.
  breakdown.location = venueOverlap === null ? nearby : venueOverlap * 0.65 + nearby * 0.35;

  const score = (Object.keys(MATCH_WEIGHTS) as MatchFactor[]).reduce(
    (total, factor) => total + MATCH_WEIGHTS[factor] * breakdown[factor],
    0,
  );

  const slotCount = sharedSlots(viewer.availability, other.availability);

  // --- Explanations -------------------------------------------------------
  const reasons: string[] = [];

  if (breakdown.level >= 0.75) {
    reasons.push(`Level passt (${levelLabel(other.level)})`);
  } else if (breakdown.level >= 0.45) {
    const viewerStrength = estimateLevel(viewer.level).strength;
    const otherStrength = estimateLevel(other.level).strength;
    reasons.push(otherStrength > viewerStrength ? 'Etwas stärker' : 'Etwas schwächer');
  }

  if (slotCount > 0) {
    const slots = describeSharedSlots(viewer.availability, other.availability, 2);
    reasons.push(
      slotCount === 1
        ? `Gemeinsam: ${slots[0]}`
        : `${slotCount} gemeinsame Zeitfenster (${slots.join(', ')})`,
    );
  }

  if (sharedVenueIds.length > 0) {
    const name = venueNames[sharedVenueIds[0]] ?? sharedVenueIds[0];
    reasons.push(
      sharedVenueIds.length === 1 ? `Beide auf ${name}` : `${sharedVenueIds.length} gemeinsame Anlagen`,
    );
  } else if (km <= 2) {
    reasons.push(`Nur ${km < 1 ? '<1' : km.toFixed(1)} km entfernt`);
  }

  const sharedFormats = viewer.formats.filter((format) => other.formats.includes(format));
  if (sharedFormats.length > 0) {
    reasons.push(sharedFormats.map((format) => FORMAT_LABELS[format] ?? format).join(' · '));
  }

  // Surface the weakest meaningful factor so the user can judge for themselves.
  let caveat: string | null = null;
  const weakest = (Object.keys(MATCH_WEIGHTS) as MatchFactor[])
    .filter((factor) => breakdown[factor] < 0.4)
    .sort((a, b) => MATCH_WEIGHTS[b] * (1 - breakdown[b]) - MATCH_WEIGHTS[a] * (1 - breakdown[a]))[0];
  if (weakest) {
    caveat = `${FACTOR_LABELS[weakest]} passt weniger gut`;
  }

  return {
    player: other,
    score,
    breakdown,
    distanceKm: km,
    sharedVenueIds,
    sharedSlotCount: slotCount,
    reasons: reasons.slice(0, 4),
    caveat,
    datingEnabled: viewer.intent === 'openToDating' && other.intent === 'openToDating',
  };
}

/**
 * Builds the swipe deck: filter on stated preferences, score the rest, and
 * return them strongest first. The deck is ranked rather than random — with a
 * small user base in one city, a random deck burns the few good matches there
 * are on a bored thumb.
 */
export function buildDeck(
  viewer: Player,
  others: Player[],
  options: {
    excludePlayerIds?: Iterable<string>;
    venueNames?: Record<string, string>;
    now?: Date;
    /** Candidates below this score are dropped entirely. */
    minScore?: number;
  } = {},
): MatchCandidate[] {
  const excluded = new Set(options.excludePlayerIds ?? []);
  const now = options.now ?? new Date();
  const minScore = options.minScore ?? 0.2;

  return others
    .filter((other) => !excluded.has(other.id) && passesHardFilters(viewer, other, now))
    .map((other) => scoreCandidate(viewer, other, options.venueNames ?? {}, now))
    .filter((candidate) => candidate.score >= minScore)
    .sort((a, b) => b.score - a.score);
}

/** Percentage shown on the card. */
export function scoreToPercent(score: number): number {
  return Math.round(score * 100);
}
