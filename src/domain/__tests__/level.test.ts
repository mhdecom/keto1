import { describe, expect, it } from 'vitest';
import { estimateLevel, levelCompatibility, levelLabel, strengthToApproxClassification } from '../level';
import { SWISS_CLASSIFICATIONS, type LevelProfile } from '../types';

const base: LevelProfile = {
  classification: null,
  yearsPlaying: 0,
  interclub: 'none',
  rallyConsistency: 'under5',
  selfRating: null,
};

const classified = (c: LevelProfile['classification']): LevelProfile => ({
  ...base,
  classification: c,
  yearsPlaying: 10,
  rallyConsistency: 'over20',
});

describe('estimateLevel', () => {
  it('orders classifications from N1 strongest to R9 weakest', () => {
    const strengths = SWISS_CLASSIFICATIONS.map((c) => estimateLevel(classified(c)).strength);
    for (let i = 1; i < strengths.length; i += 1) {
      expect(strengths[i]).toBeLessThan(strengths[i - 1]);
    }
  });

  it('treats a classification as high confidence and not estimated', () => {
    const result = estimateLevel(classified('R6'));
    expect(result.estimated).toBe(false);
    expect(result.confidence).toBeGreaterThan(0.9);
  });

  it('keeps unclassified players below the classified range', () => {
    const veryExperienced: LevelProfile = {
      classification: null,
      yearsPlaying: 30,
      interclub: 'league1to3',
      rallyConsistency: 'over20',
      selfRating: 7,
    };
    const result = estimateLevel(veryExperienced);
    expect(result.estimated).toBe(true);
    expect(result.strength).toBeLessThanOrEqual(55);
    expect(result.strength).toBeGreaterThan(estimateLevel(base).strength);
  });

  it('never drops below the floor for a complete beginner', () => {
    expect(estimateLevel(base).strength).toBeGreaterThanOrEqual(4);
  });

  it('rewards rally consistency monotonically', () => {
    const under5 = estimateLevel({ ...base, rallyConsistency: 'under5' }).strength;
    const to10 = estimateLevel({ ...base, rallyConsistency: 'from5to10' }).strength;
    const to20 = estimateLevel({ ...base, rallyConsistency: 'from10to20' }).strength;
    const over20 = estimateLevel({ ...base, rallyConsistency: 'over20' }).strength;
    expect(under5).toBeLessThan(to10);
    expect(to10).toBeLessThan(to20);
    expect(to20).toBeLessThan(over20);
  });

  it('is more confident when there are more signals', () => {
    const sparse = estimateLevel(base).confidence;
    const rich = estimateLevel({
      ...base,
      yearsPlaying: 6,
      interclub: 'active',
      selfRating: 3.5,
    }).confidence;
    expect(rich).toBeGreaterThan(sparse);
    // Still never as confident as an official classification.
    expect(rich).toBeLessThan(estimateLevel(classified('R6')).confidence);
  });
});

describe('levelLabel', () => {
  it('shows the classification verbatim', () => {
    expect(levelLabel(classified('R6'))).toBe('R6');
  });

  it('marks an estimate with a tilde', () => {
    expect(levelLabel(base)).toMatch(/^≈ R\d$/);
  });
});

describe('strengthToApproxClassification', () => {
  it('maps a strength back to the nearest class', () => {
    expect(strengthToApproxClassification(42)).toBe('R6');
    expect(strengthToApproxClassification(97)).toBe('N1');
    expect(strengthToApproxClassification(0)).toBe('R9');
  });
});

describe('levelCompatibility', () => {
  it('is highest for identical levels', () => {
    expect(levelCompatibility(classified('R6'), classified('R6'))).toBeCloseTo(1, 5);
  });

  it('is symmetric', () => {
    const a = levelCompatibility(classified('R4'), classified('R7'));
    const b = levelCompatibility(classified('R7'), classified('R4'));
    expect(a).toBeCloseTo(b, 10);
  });

  it('decreases as the gap widens', () => {
    const oneClass = levelCompatibility(classified('R6'), classified('R5'));
    const threeClasses = levelCompatibility(classified('R6'), classified('R3'));
    const sixClasses = levelCompatibility(classified('R6'), classified('N4'));
    expect(oneClass).toBeGreaterThan(threeClasses);
    expect(threeClasses).toBeGreaterThan(sixClasses);
  });

  it('still rates a one-class gap as a good match', () => {
    expect(levelCompatibility(classified('R6'), classified('R5'))).toBeGreaterThan(0.5);
  });

  it('rates a beginner against a national player as near zero', () => {
    expect(levelCompatibility(base, classified('N2'))).toBeLessThan(0.05);
  });

  it('is more forgiving when neither side is classified', () => {
    // Two self-assessed players the same distance apart should score higher
    // than two classified players, because the numbers are guesses.
    const guessA: LevelProfile = { ...base, rallyConsistency: 'from5to10', yearsPlaying: 2 };
    const guessB: LevelProfile = { ...base, rallyConsistency: 'over20', yearsPlaying: 5 };
    const guessScore = levelCompatibility(guessA, guessB);

    const deltaGuess = Math.abs(
      estimateLevel(guessA).strength - estimateLevel(guessB).strength,
    );
    // Find a classified pair with a comparable gap (R6 -> R4 is ~16 points).
    const classifiedScore = levelCompatibility(classified('R6'), classified('R4'));
    const deltaClassified = Math.abs(
      estimateLevel(classified('R6')).strength - estimateLevel(classified('R4')).strength,
    );

    expect(deltaGuess).toBeGreaterThan(0);
    expect(deltaClassified).toBeGreaterThan(0);
    // Normalised per point of gap, the uncertain pair is treated more kindly.
    expect(guessScore ** (1 / deltaGuess)).toBeGreaterThan(
      classifiedScore ** (1 / deltaClassified),
    );
  });
});
