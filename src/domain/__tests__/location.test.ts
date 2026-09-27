import { describe, expect, it } from 'vitest';
import { maskFrom } from '../availability';
import { anchorsOf, closestAnchors, describeProximity, formatKm, locationFit } from '../location';
import type { Player } from '../types';

// Real district centroids, so the distances below are the real ones.
const SCHWAMENDINGEN = { lat: 47.404, lon: 8.572 };
const PARADEPLATZ = { lat: 47.372, lon: 8.541 };
const LANGSTRASSE = { lat: 47.376, lon: 8.526 };
const ALTSTETTEN = { lat: 47.388, lon: 8.487 };

function makePlayer(overrides: Partial<Player> = {}): Player {
  return {
    id: 'base',
    firstName: 'Base',
    birthYear: 1990,
    gender: 'male',
    photos: [],
    bio: '',
    neighbourhood: 'Kreis 4 (Langstrasse)',
    lat: LANGSTRASSE.lat,
    lon: LANGSTRASSE.lon,
    workNeighbourhood: '',
    workLat: null,
    workLon: null,
    radiusKm: 10,
    level: {
      classification: 'R6',
      yearsPlaying: 10,
      interclub: 'none',
      rallyConsistency: 'over20',
      selfRating: null,
    },
    formats: ['singles'],
    intensity: 'ambitious',
    surfaces: ['clay'],
    backhand: 'twoHanded',
    strengths: [],
    weaknesses: [],
    profession: '',
    industry: 'other',
    interests: [],
    afterPlay: [],
    availability: maskFrom([[1, 'evening']]),
    venueIds: [],
    intent: 'tennisOnly',
    seeking: ['female', 'male', 'other'],
    ageMin: 18,
    ageMax: 99,
    hasCourtAccess: false,
    languages: ['de'],
    createdAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

describe('anchorsOf', () => {
  it('returns only home when no workplace is given', () => {
    const anchors = anchorsOf(makePlayer());
    expect(anchors).toHaveLength(1);
    expect(anchors[0].kind).toBe('home');
  });

  it('returns home and work when both are known', () => {
    const anchors = anchorsOf(
      makePlayer({
        workNeighbourhood: 'Kreis 1 (Altstadt)',
        workLat: PARADEPLATZ.lat,
        workLon: PARADEPLATZ.lon,
      }),
    );
    expect(anchors.map((a) => a.kind)).toEqual(['home', 'work']);
    expect(anchors[1].label).toBe('Kreis 1 (Altstadt)');
  });

  it('ignores a half-filled workplace', () => {
    const anchors = anchorsOf(makePlayer({ workLat: PARADEPLATZ.lat, workLon: null }));
    expect(anchors).toHaveLength(1);
  });
});

describe('closestAnchors', () => {
  it('falls back to home-to-home when neither works anywhere fixed', () => {
    const a = makePlayer({ id: 'a' });
    const b = makePlayer({ id: 'b', ...ALTSTETTEN });
    const closest = closestAnchors(a, b);
    expect(closest.from.kind).toBe('home');
    expect(closest.to.kind).toBe('home');
    expect(closest.km).toBeGreaterThan(2);
  });

  it('uses a workplace when it brings the pair closer', () => {
    // She lives far out in Schwamendingen but works at Paradeplatz, which is
    // near his flat. Home-to-home would wrongly call this a bad fit.
    const him = makePlayer({ id: 'him' });
    const her = makePlayer({
      id: 'her',
      ...SCHWAMENDINGEN,
      workNeighbourhood: 'Kreis 1 (Altstadt)',
      workLat: PARADEPLATZ.lat,
      workLon: PARADEPLATZ.lon,
    });

    const homeOnly = closestAnchors(him, makePlayer({ id: 'her2', ...SCHWAMENDINGEN }));
    const withWork = closestAnchors(him, her);

    expect(withWork.km).toBeLessThan(homeOnly.km);
    expect(withWork.to.kind).toBe('work');
    expect(withWork.from.kind).toBe('home');
  });

  it('is symmetric in distance', () => {
    const a = makePlayer({ id: 'a', workLat: PARADEPLATZ.lat, workLon: PARADEPLATZ.lon, workNeighbourhood: 'K1' });
    const b = makePlayer({ id: 'b', ...ALTSTETTEN });
    expect(closestAnchors(a, b).km).toBeCloseTo(closestAnchors(b, a).km, 10);
  });

  it('never averages the two anchors into a point where nobody is', () => {
    // Midway between Schwamendingen and Paradeplatz is the middle of nowhere.
    // The result must be one of the real anchors, not a centroid.
    const her = makePlayer({
      id: 'her',
      ...SCHWAMENDINGEN,
      workNeighbourhood: 'Kreis 1 (Altstadt)',
      workLat: PARADEPLATZ.lat,
      workLon: PARADEPLATZ.lon,
    });
    const closest = closestAnchors(makePlayer(), her);
    expect([SCHWAMENDINGEN.lat, PARADEPLATZ.lat]).toContain(closest.to.lat);
  });
});

describe('locationFit', () => {
  it('lets a shared venue dominate raw distance', () => {
    const a = makePlayer({ id: 'a', venueIds: ['mythenquai'] });
    const farButShared = makePlayer({ id: 'b', ...ALTSTETTEN, venueIds: ['mythenquai'] });
    const nearButNot = makePlayer({ id: 'c', venueIds: ['hardhof'] });

    expect(locationFit(a, farButShared).score).toBeGreaterThan(locationFit(a, nearButNot).score);
    expect(locationFit(a, farButShared).sharedVenueIds).toEqual(['mythenquai']);
  });

  it('falls back to pure proximity when either side lists no venue', () => {
    const near = locationFit(makePlayer({ id: 'a' }), makePlayer({ id: 'b' }));
    const far = locationFit(makePlayer({ id: 'a' }), makePlayer({ id: 'c', ...ALTSTETTEN }));
    expect(near.score).toBeGreaterThan(far.score);
    expect(near.score).toBeCloseTo(1, 5);
  });

  it('improves when a workplace closes the gap', () => {
    const him = makePlayer({ id: 'him' });
    const farHome = makePlayer({ id: 'a', ...SCHWAMENDINGEN });
    const farHomeNearWork = makePlayer({
      id: 'b',
      ...SCHWAMENDINGEN,
      workNeighbourhood: 'Kreis 1 (Altstadt)',
      workLat: PARADEPLATZ.lat,
      workLon: PARADEPLATZ.lon,
    });
    expect(locationFit(him, farHomeNearWork).score).toBeGreaterThan(
      locationFit(him, farHome).score,
    );
  });
});

describe('describeProximity', () => {
  const atParadeplatz = {
    workNeighbourhood: 'Kreis 1 (Altstadt)',
    workLat: PARADEPLATZ.lat,
    workLon: PARADEPLATZ.lon,
  };

  it('calls out a shared workplace district first', () => {
    const a = makePlayer({ id: 'a', ...atParadeplatz });
    const b = makePlayer({ id: 'b', ...ALTSTETTEN, ...atParadeplatz });
    expect(describeProximity(a, b, closestAnchors(a, b))).toBe(
      'Ihr arbeitet beide: Kreis 1 (Altstadt)',
    );
  });

  it('says when the other person works near you', () => {
    const me = makePlayer({ id: 'me' });
    const other = makePlayer({
      id: 'other',
      ...SCHWAMENDINGEN,
      workNeighbourhood: 'Kreis 4 (Langstrasse)',
      workLat: LANGSTRASSE.lat,
      workLon: LANGSTRASSE.lon,
    });
    expect(describeProximity(me, other, closestAnchors(me, other))).toBe(
      'Arbeitet gleich bei dir in der Nähe',
    );
  });

  it('says when the other person lives near your office', () => {
    const me = makePlayer({
      id: 'me',
      ...SCHWAMENDINGEN,
      workNeighbourhood: 'Kreis 4 (Langstrasse)',
      workLat: LANGSTRASSE.lat,
      workLon: LANGSTRASSE.lon,
    });
    const other = makePlayer({ id: 'other' });
    expect(describeProximity(me, other, closestAnchors(me, other))).toBe(
      'Wohnt gleich bei deinem Arbeitsort',
    );
  });

  it('stays quiet when the geography is unremarkable', () => {
    const a = makePlayer({ id: 'a' });
    const b = makePlayer({ id: 'b', ...ALTSTETTEN });
    expect(describeProximity(a, b, closestAnchors(a, b))).toBeNull();
  });
});

describe('formatKm', () => {
  it('does not pretend to sub-kilometre precision', () => {
    expect(formatKm(0.4)).toBe('<1 km');
    expect(formatKm(2.34)).toBe('2.3 km');
  });
});
