import { describe, expect, it } from 'vitest';
import { distanceKm, proximityScore } from '../geo';

const hauptbahnhof = { lat: 47.3779, lon: 8.5403 };
const mythenquai = { lat: 47.345, lon: 8.534 };
const bern = { lat: 46.948, lon: 7.4474 };

describe('distanceKm', () => {
  it('is zero for the same point', () => {
    expect(distanceKm(hauptbahnhof, hauptbahnhof)).toBe(0);
  });

  it('matches the real distance across Zurich', () => {
    // HB to Mythenquai is roughly 3.7 km as the crow flies.
    expect(distanceKm(hauptbahnhof, mythenquai)).toBeGreaterThan(3);
    expect(distanceKm(hauptbahnhof, mythenquai)).toBeLessThan(4.5);
  });

  it('matches the real distance Zurich to Bern', () => {
    expect(distanceKm(hauptbahnhof, bern)).toBeGreaterThan(90);
    expect(distanceKm(hauptbahnhof, bern)).toBeLessThan(100);
  });

  it('is symmetric', () => {
    expect(distanceKm(hauptbahnhof, bern)).toBeCloseTo(distanceKm(bern, hauptbahnhof), 10);
  });
});

describe('proximityScore', () => {
  it('is one at zero distance and decreasing', () => {
    expect(proximityScore(0)).toBe(1);
    expect(proximityScore(2)).toBeGreaterThan(proximityScore(5));
    expect(proximityScore(5)).toBeGreaterThan(proximityScore(12));
  });

  it('stays positive but small far away', () => {
    expect(proximityScore(30)).toBeGreaterThanOrEqual(0);
    expect(proximityScore(30)).toBeLessThan(0.001);
  });
});
