import type { AfterPlay, Industry, Interest, Player } from './types';

/**
 * How well two people fit *off* the court.
 *
 * This exists because the most valuable thing a tennis app in a city like
 * Zurich can produce is not a hit — it is the drink afterwards, and sometimes
 * the professional conversation after that. A weekly two-hour slot with the
 * same person is one of the few ways adults still build real contacts.
 *
 * Kept strictly separate from romantic intent: it applies identically between
 * two men, two women, or any other pairing.
 */

export interface AffinityResult {
  /** 0 to 1, fed into the overall match score. */
  score: number;
  sharedInterests: Interest[];
  sharedAfterPlay: AfterPlay[];
  /** Both sides want a professional exchange and work in the same field. */
  sameIndustry: boolean;
  /** Neither side wants anything beyond the court — and that is a match, not a gap. */
  courtOnly: boolean;
  /** One side wants more than tennis, the other does not. */
  mismatched: boolean;
}

/** Weights inside the affinity factor itself. */
const WITHIN = { intent: 0.45, interests: 0.35, professional: 0.2 } as const;

/**
 * Both want something off-court, but different things (one a drink, the other
 * a work conversation). Not a fit, but not a wall either — these two will
 * probably still end up at the same table.
 */
const DIFFERENT_FLAVOUR = 0.35;

/**
 * One side wants the court and nothing else, the other wants more. The tennis
 * still works, so this is a deduction rather than an exclusion.
 */
const EXPECTATION_MISMATCH = 0.3;

/** Neither profile lists interests, so there is nothing to confirm either way. */
const UNKNOWN_INTERESTS = 0.4;

function intersect<T>(a: readonly T[], b: readonly T[]): T[] {
  const right = new Set(b);
  return a.filter((item) => right.has(item));
}

function overlapRatio<T>(a: readonly T[], b: readonly T[], fallback: number): number {
  if (a.length === 0 || b.length === 0) return fallback;
  return intersect(a, b).length / Math.min(a.length, b.length);
}

function professionalScore(
  a: { industry: Industry; afterPlay: readonly AfterPlay[] },
  b: { industry: Industry; afterPlay: readonly AfterPlay[] },
): { score: number; sameIndustry: boolean } {
  const bothNetworking = a.afterPlay.includes('networking') && b.afterPlay.includes('networking');
  if (!bothNetworking) return { score: 0.5, sameIndustry: false };

  // Same field means shared context and shop talk. A different field is still
  // useful — often more so — just less immediately obvious, so it scores well
  // rather than badly.
  const same = a.industry === b.industry && a.industry !== 'other';
  return { score: same ? 1 : 0.65, sameIndustry: same };
}

type AffinityInput = Pick<Player, 'interests' | 'afterPlay' | 'industry'>;

export function affinity(a: AffinityInput, b: AffinityInput): AffinityResult {
  const sharedAfterPlay = intersect(a.afterPlay, b.afterPlay);
  const sharedInterests = intersect(a.interests, b.interests);
  const { score: professional, sameIndustry } = professionalScore(a, b);

  const aWantsMore = a.afterPlay.length > 0;
  const bWantsMore = b.afterPlay.length > 0;

  if (!aWantsMore && !bWantsMore) {
    // Complete agreement: both are here to play tennis. Nothing to weigh.
    return {
      score: 1,
      sharedInterests,
      sharedAfterPlay,
      sameIndustry: false,
      courtOnly: true,
      mismatched: false,
    };
  }

  if (aWantsMore !== bWantsMore) {
    return {
      score: EXPECTATION_MISMATCH,
      sharedInterests,
      sharedAfterPlay,
      sameIndustry: false,
      courtOnly: false,
      mismatched: true,
    };
  }

  const intentScore =
    sharedAfterPlay.length > 0
      ? sharedAfterPlay.length / Math.min(a.afterPlay.length, b.afterPlay.length)
      : DIFFERENT_FLAVOUR;

  const interestScore = overlapRatio(a.interests, b.interests, UNKNOWN_INTERESTS);

  return {
    score:
      WITHIN.intent * intentScore +
      WITHIN.interests * interestScore +
      WITHIN.professional * professional,
    sharedInterests,
    sharedAfterPlay,
    sameIndustry,
    courtOnly: false,
    mismatched: false,
  };
}
