import {
  SWISS_CLASSIFICATIONS,
  type InterclubLevel,
  type LevelProfile,
  type RallyConsistency,
  type SwissClassification,
} from './types';

/**
 * Internal strength scale from 0 (never played) to 100 (world class). Every
 * level signal is normalised onto this scale so that players with a Swiss
 * Tennis classification and self assessed beginners can be compared at all.
 *
 * The anchors follow the real spread of Swiss Tennis: the gap between R9 and
 * R6 is much larger in practice than the gap between N2 and N1, so the scale
 * is deliberately non-linear at the top.
 */
const CLASSIFICATION_STRENGTH: Record<SwissClassification, number> = {
  N1: 97,
  N2: 93,
  N3: 89,
  N4: 85,
  R1: 79,
  R2: 72,
  R3: 65,
  R4: 58,
  R5: 50,
  R6: 42,
  R7: 34,
  R8: 27,
  R9: 20,
};

const RALLY_BASE: Record<RallyConsistency, number> = {
  under5: 8,
  from5to10: 15,
  from10to20: 23,
  over20: 30,
};

const INTERCLUB_BONUS: Record<InterclubLevel, number> = {
  none: 0,
  active: 6,
  league4plus: 9,
  league1to3: 14,
};

/** Unclassified players are capped below the weakest classified players' range. */
const UNCLASSIFIED_MIN = 4;
const UNCLASSIFIED_MAX = 55;

export interface LevelEstimate {
  /** Position on the 0–100 strength scale. */
  strength: number;
  /**
   * How much we trust `strength`, from 0 to 1. A classification is close to
   * fact; a self assessment is a guess. Matching widens its tolerance when
   * confidence is low instead of pretending to be precise.
   */
  confidence: number;
  /** True when the value was derived rather than taken from a classification. */
  estimated: boolean;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/** Maps a 1.0–7.0 NTRP-style self rating onto the strength scale. */
function selfRatingToStrength(selfRating: number): number {
  const normalised = clamp(selfRating, 1, 7);
  return ((normalised - 1) / 6) * 72;
}

export function estimateLevel(level: LevelProfile): LevelEstimate {
  if (level.classification) {
    return {
      strength: CLASSIFICATION_STRENGTH[level.classification],
      confidence: 0.95,
      estimated: false,
    };
  }

  const fromSignals =
    RALLY_BASE[level.rallyConsistency] +
    clamp(level.yearsPlaying, 0, 12) * 1.1 +
    INTERCLUB_BONUS[level.interclub];

  // A self rating is noisy but it is the player's own read on themselves, so
  // blend it with the derived value rather than letting either dominate.
  const strength =
    level.selfRating === null
      ? fromSignals
      : fromSignals * 0.6 + selfRatingToStrength(level.selfRating) * 0.4;

  let confidence = 0.45;
  if (level.interclub !== 'none') confidence += 0.15;
  if (level.selfRating !== null) confidence += 0.08;
  if (level.yearsPlaying >= 3) confidence += 0.05;

  return {
    strength: clamp(strength, UNCLASSIFIED_MIN, UNCLASSIFIED_MAX),
    confidence: clamp(confidence, 0, 0.8),
    estimated: true,
  };
}

/**
 * Nearest classification for a strength value, used to show an unclassified
 * player as "≈ R7" so both sides have a shared vocabulary.
 */
export function strengthToApproxClassification(strength: number): SwissClassification {
  let best: SwissClassification = 'R9';
  let bestDelta = Infinity;
  for (const classification of SWISS_CLASSIFICATIONS) {
    const delta = Math.abs(CLASSIFICATION_STRENGTH[classification] - strength);
    if (delta < bestDelta) {
      bestDelta = delta;
      best = classification;
    }
  }
  return best;
}

/** Short label for a level badge, e.g. "R6" or "≈ R8". */
export function levelLabel(level: LevelProfile): string {
  if (level.classification) return level.classification;
  const { strength } = estimateLevel(level);
  return `≈ ${strengthToApproxClassification(strength)}`;
}

/**
 * How well two levels fit, from 0 to 1.
 *
 * A Gaussian falloff rather than a hard window: a two-class gap is a worse
 * match than a one-class gap, but it is not worthless — especially when
 * neither side is classified and we are guessing anyway. The tolerance widens
 * as confidence drops, so two unsure beginners are not filtered apart by
 * numbers that were never precise.
 */
export function levelCompatibility(a: LevelProfile, b: LevelProfile): number {
  const left = estimateLevel(a);
  const right = estimateLevel(b);
  const delta = Math.abs(left.strength - right.strength);

  // About two Swiss Tennis classes in the R range. Wide on purpose: one class
  // up or down is not a compromise, it is the most useful hit there is.
  const BASE_TOLERANCE = 14;
  const tolerance = BASE_TOLERANCE / Math.min(left.confidence, right.confidence);

  return Math.exp(-((delta / tolerance) ** 2));
}

/** Strength value for a classification, used to express level windows. */
export function classificationStrength(classification: SwissClassification): number {
  return CLASSIFICATION_STRENGTH[classification];
}

export const LEVEL_INTERNALS = { CLASSIFICATION_STRENGTH, RALLY_BASE, INTERCLUB_BONUS };
