import { describe, expect, it } from 'vitest';
import { affinity } from '../affinity';
import type { AfterPlay, Industry, Interest } from '../types';

const person = (
  interests: Interest[],
  afterPlay: AfterPlay[],
  industry: Industry = 'other',
) => ({ interests, afterPlay, industry });

describe('affinity — court only', () => {
  it('scores a perfect 1 when neither side wants anything beyond the court', () => {
    // Two people who just want to hit balls agree completely. Their interests
    // must never be weighed against them.
    const result = affinity(person([], []), person([], []));
    expect(result.score).toBe(1);
    expect(result.courtOnly).toBe(true);
    expect(result.mismatched).toBe(false);
  });

  it('still scores 1 for court-only players with nothing in common', () => {
    const result = affinity(person(['gaming'], []), person(['yoga'], [], 'health'));
    expect(result.score).toBe(1);
    expect(result.courtOnly).toBe(true);
  });
});

describe('affinity — mismatch', () => {
  it('deducts but does not exclude when only one side wants more', () => {
    const result = affinity(person(['food'], []), person(['food'], ['drink']));
    expect(result.mismatched).toBe(true);
    expect(result.score).toBeGreaterThan(0);
    expect(result.score).toBeLessThan(0.5);
  });

  it('is symmetric', () => {
    const a = affinity(person([], []), person(['food'], ['drink']));
    const b = affinity(person(['food'], ['drink']), person([], []));
    expect(a.score).toBe(b.score);
    expect(a.mismatched).toBe(b.mismatched);
  });
});

describe('affinity — both open', () => {
  it('rewards shared interests', () => {
    const few = affinity(
      person(['food', 'wine', 'travel'], ['drink']),
      person(['gaming', 'film', 'music'], ['drink']),
    );
    const many = affinity(
      person(['food', 'wine', 'travel'], ['drink']),
      person(['food', 'wine', 'travel'], ['drink']),
    );
    expect(many.score).toBeGreaterThan(few.score);
    expect(many.sharedInterests).toEqual(['food', 'wine', 'travel']);
    expect(few.sharedInterests).toEqual([]);
  });

  it('does not punish the person with fewer interests listed', () => {
    // Normalised by the smaller list, like availability: one interest that is
    // fully shared is a complete overlap.
    const result = affinity(
      person(['skiing'], ['drink']),
      person(['skiing', 'food', 'wine', 'travel'], ['drink']),
    );
    expect(result.sharedInterests).toEqual(['skiing']);
    expect(result.score).toBeGreaterThan(0.8);
  });

  it('scores two people wanting different things off-court in the middle', () => {
    const different = affinity(person([], ['drink']), person([], ['networking']));
    const same = affinity(person([], ['drink']), person([], ['drink']));
    expect(different.score).toBeLessThan(same.score);
    // But still clearly above an outright expectation mismatch.
    const mismatch = affinity(person([], []), person([], ['drink']));
    expect(different.score).toBeGreaterThan(mismatch.score);
  });
});

describe('affinity — professional', () => {
  it('flags a shared industry only when both want a professional exchange', () => {
    const bothNetworking = affinity(
      person([], ['networking'], 'health'),
      person([], ['networking'], 'health'),
    );
    expect(bothNetworking.sameIndustry).toBe(true);

    const onlyDrinks = affinity(
      person([], ['drink'], 'health'),
      person([], ['drink'], 'health'),
    );
    expect(onlyDrinks.sameIndustry).toBe(false);
  });

  it('never treats "other" as a shared industry', () => {
    const result = affinity(
      person([], ['networking'], 'other'),
      person([], ['networking'], 'other'),
    );
    expect(result.sameIndustry).toBe(false);
  });

  it('rates a different industry well, just below the same one', () => {
    const same = affinity(
      person([], ['networking'], 'tech'),
      person([], ['networking'], 'tech'),
    );
    const cross = affinity(
      person([], ['networking'], 'tech'),
      person([], ['networking'], 'law'),
    );
    expect(cross.score).toBeLessThan(same.score);
    // Cross-industry contacts are often the valuable ones, so the gap is small.
    expect(same.score - cross.score).toBeLessThan(0.1);
  });
});

describe('affinity — applies regardless of gender pairing', () => {
  it('produces the same score for any two profiles with the same off-court data', () => {
    // The whole point of keeping this separate from romantic intent: two men
    // who both ski and both work in finance must score exactly as two women do.
    const left = person(['skiing', 'investing'], ['drink', 'networking'], 'finance');
    const right = person(['skiing', 'investing'], ['drink', 'networking'], 'finance');
    expect(affinity(left, right).score).toBe(affinity(right, left).score);
    expect(affinity(left, right).sameIndustry).toBe(true);
  });
});
