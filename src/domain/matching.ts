import { affinity, type AffinityResult } from './affinity';
import { availabilityCompatibility, describeSharedSlots, sharedSlots } from './availability';
import { distanceKm, proximityScore } from './geo';
import { AFTER_PLAY_LABELS, INDUSTRY_LABELS, INTEREST_LABELS } from './labels';
import { estimateLevel, levelCompatibility, levelLabel } from './level';
import { INTENSITIES, type Intensity, type Player, type Surface } from './types';

/**
 * Relative importance of each signal. Level and availability dominate because
 * they are the two reasons a tennis pairing actually fails in practice: a
 * mismatched level makes the hit pointless, and a mismatched calendar means it
 * never happens at all. Everything else is preference.
 *
 * `affinity` covers everything off the court — profession, interests, and what
 * each side wants after the match. It is weighted below the three tennis
 * fundamentals but above the remaining preferences, because a good contact you
 * cannot actually play with is still not a tennis partner, while a decent hit
 * with someone worth staying for is the thing this app exists to produce.
 *
 * Note that affinity scores a perfect 1 when *neither* side wants anything
 * beyond the court: two people who just want to hit balls agree completely, so
 * their interests never get weighed against them.
 */
export const MATCH_WEIGHTS = {
  level: 0.28,
  availability: 0.22,
  location: 0.16,
  affinity: 0.12,
  format: 0.1,
  intensity: 0.07,
  surface: 0.05,
} as const;

export type MatchFactor = keyof typeof MATCH_WEIGHTS;

export interface ScoreBreakdown {
  level: number;
  availability: number;
  location: number;
  affinity: number;
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
  /** Everything off the court: interests, profession, what happens afterwards. */
  offCourt: AffinityResult;
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
  affinity: 'Neben dem Platz',
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
  const offCourt = affinity(viewer, other);

  const breakdown: ScoreBreakdown = {
    level: levelCompatibility(viewer.level, other.level),
    availability: availabilityCompatibility(viewer.availability, other.availability),
    location: 0,
    affinity: offCourt.score,
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

  // Off-court reasons come before the play formats: knowing you both ski, or
  // both work in pharma, is what turns a hitting partner into a contact.
  if (offCourt.sameIndustry) {
    reasons.push(`Beide in ${INDUSTRY_LABELS[other.industry]}`);
  } else if (offCourt.sharedInterests.length >= 2) {
    // One example only: naming two blows past the width of a card chip, and
    // the exact list is one tap away on the full profile anyway.
    const example = INTEREST_LABELS[offCourt.sharedInterests[0]];
    reasons.push(`${offCourt.sharedInterests.length} gemeinsame Interessen (${example})`);
  } else if (offCourt.sharedInterests.length === 1) {
    reasons.push(`Beide: ${INTEREST_LABELS[offCourt.sharedInterests[0]]}`);
  } else if (offCourt.sharedAfterPlay.length > 0) {
    reasons.push(`Beide offen für ${AFTER_PLAY_LABELS[offCourt.sharedAfterPlay[0]]}`);
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
  if (weakest === 'affinity' && offCourt.mismatched) {
    // Generic wording would be misleading here: nothing is wrong with either
    // profile, the two just want different amounts of contact.
    caveat =
      other.afterPlay.length > 0
        ? `${other.firstName} sucht mehr als nur Tennis`
        : `${other.firstName} will nur spielen`;
  } else if (weakest) {
    caveat = `${FACTOR_LABELS[weakest]} passt weniger gut`;
  }

  return {
    player: other,
    score,
    breakdown,
    distanceKm: km,
    sharedVenueIds,
    sharedSlotCount: slotCount,
    offCourt,
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
