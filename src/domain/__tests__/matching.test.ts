import { describe, expect, it } from 'vitest';
import { DEMO_ME, SEED_PLAYERS } from '../../data/seed';
import { maskFrom } from '../availability';
import {
  ageFromBirthYear,
  buildDeck,
  MATCH_WEIGHTS,
  passesHardFilters,
  scoreCandidate,
  scoreToPercent,
} from '../matching';
import type { Player } from '../types';
import { VENUE_NAMES } from '../venues';

const NOW = new Date('2026-09-27T12:00:00.000Z');

function makePlayer(overrides: Partial<Player> = {}): Player {
  return {
    id: 'base',
    firstName: 'Base',
    birthYear: 1990,
    gender: 'male',
    photos: [],
    bio: '',
    neighbourhood: 'Kreis 4',
    lat: 47.376,
    lon: 8.526,
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
    // Empty by default: two players who both want only tennis agree perfectly,
    // so affinity stays neutral for the tests that are about tennis.
    afterPlay: [],
    availability: maskFrom([[1, 'evening']]),
    venueIds: ['mythenquai'],
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

describe('weights', () => {
  it('sum to one so the score is a real 0–1 scale', () => {
    const total = Object.values(MATCH_WEIGHTS).reduce((a, b) => a + b, 0);
    expect(total).toBeCloseTo(1, 10);
  });

  it('puts level and availability ahead of everything else', () => {
    expect(MATCH_WEIGHTS.level).toBeGreaterThan(MATCH_WEIGHTS.location);
    expect(MATCH_WEIGHTS.availability).toBeGreaterThan(MATCH_WEIGHTS.location);
  });
});

describe('passesHardFilters', () => {
  const viewer = makePlayer({ id: 'viewer', gender: 'male', seeking: ['female'] });

  it('never returns yourself', () => {
    expect(passesHardFilters(viewer, viewer, NOW)).toBe(false);
  });

  it('respects the viewer\'s gender preference', () => {
    const man = makePlayer({ id: 'a', gender: 'male' });
    const woman = makePlayer({ id: 'b', gender: 'female' });
    expect(passesHardFilters(viewer, man, NOW)).toBe(false);
    expect(passesHardFilters(viewer, woman, NOW)).toBe(true);
  });

  it('respects the other side\'s gender preference too', () => {
    const womanSeekingWomen = makePlayer({ id: 'b', gender: 'female', seeking: ['female'] });
    expect(passesHardFilters(viewer, womanSeekingWomen, NOW)).toBe(false);
  });

  it('enforces both age ranges', () => {
    const tooYoungForViewer = makePlayer({ id: 'b', gender: 'female', birthYear: 2006 });
    const strict = makePlayer({ id: 'viewer', gender: 'male', seeking: ['female'], ageMin: 30, ageMax: 45 });
    expect(passesHardFilters(strict, tooYoungForViewer, NOW)).toBe(false);

    // And the reverse: the other player will not take anyone over 30.
    const picky = makePlayer({ id: 'b', gender: 'female', ageMin: 18, ageMax: 30 });
    expect(passesHardFilters(strict, picky, NOW)).toBe(false);
  });

  it('uses the tighter of the two travel radiuses', () => {
    // Oerlikon is about 4 km from Kreis 4.
    const far = makePlayer({ id: 'b', gender: 'female', lat: 47.41, lon: 8.545, radiusKm: 30 });
    const homebody = makePlayer({ id: 'viewer', gender: 'male', seeking: ['female'], radiusKm: 2 });
    expect(passesHardFilters(homebody, far, NOW)).toBe(false);

    const generous = makePlayer({ id: 'viewer', gender: 'male', seeking: ['female'], radiusKm: 20 });
    expect(passesHardFilters(generous, far, NOW)).toBe(true);

    // Now flip it: the other player will not travel.
    const farHomebody = makePlayer({ id: 'b', gender: 'female', lat: 47.41, lon: 8.545, radiusKm: 2 });
    expect(passesHardFilters(generous, farHomebody, NOW)).toBe(false);
  });
});

describe('scoreCandidate', () => {
  it('scores an identical twin close to perfect', () => {
    const viewer = makePlayer({ id: 'viewer' });
    const clone = makePlayer({ id: 'clone' });
    const result = scoreCandidate(viewer, clone, VENUE_NAMES, NOW);
    expect(result.score).toBeGreaterThan(0.95);
  });

  it('enables dating only when both sides opted in', () => {
    const viewer = makePlayer({ id: 'viewer', intent: 'openToDating' });
    const alsoOpen = makePlayer({ id: 'a', intent: 'openToDating' });
    const tennisOnly = makePlayer({ id: 'b', intent: 'tennisOnly' });

    expect(scoreCandidate(viewer, alsoOpen, VENUE_NAMES, NOW).datingEnabled).toBe(true);
    expect(scoreCandidate(viewer, tennisOnly, VENUE_NAMES, NOW).datingEnabled).toBe(false);
    // And a tennis-only viewer is never put into a dating context.
    expect(scoreCandidate(tennisOnly, alsoOpen, VENUE_NAMES, NOW).datingEnabled).toBe(false);
  });

  it('names the shared time slots in the reasons', () => {
    const viewer = makePlayer({ id: 'viewer', availability: maskFrom([[1, 'evening'], [3, 'evening']]) });
    const other = makePlayer({ id: 'other', availability: maskFrom([[1, 'evening'], [3, 'evening']]) });
    const result = scoreCandidate(viewer, other, VENUE_NAMES, NOW);
    expect(result.sharedSlotCount).toBe(2);
    expect(result.reasons.join(' ')).toContain('Di Abend');
  });

  it('names the shared venue by its real name', () => {
    const result = scoreCandidate(makePlayer({ id: 'v' }), makePlayer({ id: 'o' }), VENUE_NAMES, NOW);
    expect(result.sharedVenueIds).toEqual(['mythenquai']);
    expect(result.reasons.join(' ')).toContain('TA Mythenquai');
  });

  it('flags the weakest factor as a caveat instead of hiding it', () => {
    const viewer = makePlayer({ id: 'viewer', availability: maskFrom([[1, 'evening']]) });
    const noTimeOverlap = makePlayer({ id: 'other', availability: maskFrom([[5, 'morning']]) });
    const result = scoreCandidate(viewer, noTimeOverlap, VENUE_NAMES, NOW);
    expect(result.caveat).toBe('Zeiten passt weniger gut');
  });

  it('has no caveat when everything fits', () => {
    const result = scoreCandidate(makePlayer({ id: 'v' }), makePlayer({ id: 'o' }), VENUE_NAMES, NOW);
    expect(result.caveat).toBeNull();
  });

  it('ranks a same-level, same-schedule player above a stronger one with no overlap', () => {
    const viewer = makePlayer({ id: 'viewer' });
    const perfectFit = makePlayer({ id: 'fit' });
    const strongerStranger = makePlayer({
      id: 'stranger',
      level: { ...viewer.level, classification: 'R3' },
      availability: maskFrom([[5, 'morning']]),
      venueIds: ['eichrain'],
    });
    const a = scoreCandidate(viewer, perfectFit, VENUE_NAMES, NOW);
    const b = scoreCandidate(viewer, strongerStranger, VENUE_NAMES, NOW);
    expect(a.score).toBeGreaterThan(b.score);
  });
});

describe('buildDeck', () => {
  it('sorts strongest match first', () => {
    const deck = buildDeck(DEMO_ME, SEED_PLAYERS, { venueNames: VENUE_NAMES, now: NOW });
    expect(deck.length).toBeGreaterThan(0);
    for (let i = 1; i < deck.length; i += 1) {
      expect(deck[i - 1].score).toBeGreaterThanOrEqual(deck[i].score);
    }
  });

  it('excludes players already swiped', () => {
    const deck = buildDeck(DEMO_ME, SEED_PLAYERS, { venueNames: VENUE_NAMES, now: NOW });
    const first = deck[0].player.id;
    const reduced = buildDeck(DEMO_ME, SEED_PLAYERS, {
      venueNames: VENUE_NAMES,
      now: NOW,
      excludePlayerIds: [first],
    });
    expect(reduced.map((c) => c.player.id)).not.toContain(first);
    expect(reduced).toHaveLength(deck.length - 1);
  });

  it('drops candidates below the minimum score', () => {
    const all = buildDeck(DEMO_ME, SEED_PLAYERS, { venueNames: VENUE_NAMES, now: NOW, minScore: 0 });
    const strict = buildDeck(DEMO_ME, SEED_PLAYERS, { venueNames: VENUE_NAMES, now: NOW, minScore: 0.9 });
    expect(strict.length).toBeLessThan(all.length);
    expect(strict.every((c) => c.score >= 0.9)).toBe(true);
  });

  it('puts the obvious Zurich match at the top of the demo deck', () => {
    // Max is R6, plays Tue/Thu evenings, home courts Mythenquai + Frauental.
    // Marco is R6, plays Tue/Thu evenings, same two courts. If the algorithm
    // does not surface him first, it is not doing its job.
    const deck = buildDeck(DEMO_ME, SEED_PLAYERS, { venueNames: VENUE_NAMES, now: NOW });
    expect(deck[0].player.id).toBe('p-marco');
    expect(scoreToPercent(deck[0].score)).toBeGreaterThan(85);
  });

  it('does not surface the national-level player as a top match for a club player', () => {
    const deck = buildDeck(DEMO_ME, SEED_PLAYERS, { venueNames: VENUE_NAMES, now: NOW });
    const jonasIndex = deck.findIndex((c) => c.player.id === 'p-jonas');
    if (jonasIndex !== -1) {
      expect(jonasIndex).toBeGreaterThan(2);
    }
  });

  it('never shows a woman seeking only women to a male viewer', () => {
    const deck = buildDeck(DEMO_ME, SEED_PLAYERS, { venueNames: VENUE_NAMES, now: NOW, minScore: 0 });
    expect(deck.map((c) => c.player.id)).not.toContain('p-miriam');
  });
});

describe('off-court affinity in the score', () => {
  it('surfaces a shared industry as a reason when both want to network', () => {
    const viewer = makePlayer({
      id: 'viewer',
      industry: 'health',
      afterPlay: ['networking'],
    });
    const other = makePlayer({
      id: 'other',
      industry: 'health',
      afterPlay: ['networking'],
    });
    const result = scoreCandidate(viewer, other, VENUE_NAMES, NOW);
    expect(result.offCourt.sameIndustry).toBe(true);
    expect(result.reasons.join(' ')).toContain('Gesundheit');
  });

  it('names shared interests on the card', () => {
    const viewer = makePlayer({ id: 'viewer', interests: ['skiing', 'wine'], afterPlay: ['drink'] });
    const other = makePlayer({ id: 'other', interests: ['skiing', 'wine'], afterPlay: ['drink'] });
    const result = scoreCandidate(viewer, other, VENUE_NAMES, NOW);
    expect(result.reasons.join(' ')).toContain('2 gemeinsame Interessen');
    expect(result.reasons.join(' ')).toContain('Ski');
  });

  it('phrases a single shared interest in the singular', () => {
    const viewer = makePlayer({ id: 'viewer', interests: ['hiking'], afterPlay: ['drink'] });
    const other = makePlayer({ id: 'other', interests: ['hiking', 'gaming'], afterPlay: ['drink'] });
    const result = scoreCandidate(viewer, other, VENUE_NAMES, NOW);
    expect(result.reasons.join(' ')).toContain('Beide: Wandern');
  });

  it('falls back to the shared after-play intent when interests do not overlap', () => {
    const viewer = makePlayer({ id: 'viewer', interests: ['gaming'], afterPlay: ['drink'] });
    const other = makePlayer({ id: 'other', interests: ['yoga'], afterPlay: ['drink'] });
    const result = scoreCandidate(viewer, other, VENUE_NAMES, NOW);
    expect(result.reasons.join(' ')).toContain('Apéro danach');
  });

  it('says nothing off-court when both only want to play', () => {
    const result = scoreCandidate(makePlayer({ id: 'v' }), makePlayer({ id: 'o' }), VENUE_NAMES, NOW);
    expect(result.offCourt.courtOnly).toBe(true);
    expect(result.reasons.join(' ')).not.toMatch(/Interessen|Apéro|Beide in/);
    // And it costs them nothing.
    expect(result.breakdown.affinity).toBe(1);
  });

  it('explains an expectation mismatch by name instead of generically', () => {
    const viewer = makePlayer({ id: 'viewer', firstName: 'Max', afterPlay: ['drink'] });
    const other = makePlayer({ id: 'other', firstName: 'Tobias', afterPlay: [] });
    const result = scoreCandidate(viewer, other, VENUE_NAMES, NOW);
    expect(result.offCourt.mismatched).toBe(true);
    expect(result.caveat).toBe('Tobias will nur spielen');
  });

  it('ranks a shared-interest partner above an otherwise identical stranger', () => {
    const viewer = makePlayer({
      id: 'viewer',
      interests: ['skiing', 'wine', 'travel'],
      afterPlay: ['drink'],
    });
    const congenial = makePlayer({
      id: 'congenial',
      interests: ['skiing', 'wine', 'travel'],
      afterPlay: ['drink'],
    });
    const stranger = makePlayer({
      id: 'stranger',
      interests: ['gaming', 'politics', 'pets'],
      afterPlay: ['drink'],
    });
    const a = scoreCandidate(viewer, congenial, VENUE_NAMES, NOW);
    const b = scoreCandidate(viewer, stranger, VENUE_NAMES, NOW);
    expect(a.score).toBeGreaterThan(b.score);
    // But interests must not outweigh the tennis: the gap stays modest.
    expect(a.score - b.score).toBeLessThan(MATCH_WEIGHTS.affinity);
  });

  it('never lets affinity outrank a matching level', () => {
    const viewer = makePlayer({ id: 'viewer', interests: ['skiing'], afterPlay: ['drink'] });
    // Same level, nothing in common off court.
    const rightLevel = makePlayer({ id: 'level', interests: ['gaming'], afterPlay: ['drink'] });
    // Three classes apart, but a soulmate off court.
    const rightPerson = makePlayer({
      id: 'person',
      level: { ...viewer.level, classification: 'R3' },
      interests: ['skiing'],
      afterPlay: ['drink'],
    });
    expect(scoreCandidate(viewer, rightLevel, VENUE_NAMES, NOW).score).toBeGreaterThan(
      scoreCandidate(viewer, rightPerson, VENUE_NAMES, NOW).score,
    );
  });
});

describe('ageFromBirthYear', () => {
  it('uses calendar years', () => {
    expect(ageFromBirthYear(1990, NOW)).toBe(36);
  });
});
