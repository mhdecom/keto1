import { describe, expect, it } from 'vitest';
import { DEMO_ME, SEED_PLAYERS } from '../../data/seed';
import { EMPTY_FORM, formFromPlayer, playerFromForm, validateStep } from '../profileForm';

const NOW = new Date('2026-09-27T12:00:00.000Z');

describe('validateStep — basics', () => {
  it('rejects a missing name', () => {
    expect(validateStep('basics', { ...EMPTY_FORM, birthYearText: '1990' }, NOW)).toMatch(/Vornamen/);
  });

  it('rejects a single letter', () => {
    const form = { ...EMPTY_FORM, firstName: 'M', birthYearText: '1990' };
    expect(validateStep('basics', form, NOW)).toMatch(/Vornamen/);
  });

  it('rejects a non-numeric birth year', () => {
    const form = { ...EMPTY_FORM, firstName: 'Max', birthYearText: 'neunzehn' };
    expect(validateStep('basics', form, NOW)).toMatch(/Geburtsjahr/);
  });

  it('enforces the 18+ rule', () => {
    const form = { ...EMPTY_FORM, firstName: 'Max', birthYearText: '2012' };
    expect(validateStep('basics', form, NOW)).toMatch(/ab 18/);
  });

  it('accepts someone who turns 18 this year', () => {
    const form = { ...EMPTY_FORM, firstName: 'Max', birthYearText: '2008' };
    expect(validateStep('basics', form, NOW)).toBeNull();
  });

  it('rejects an implausible birth year', () => {
    const form = { ...EMPTY_FORM, firstName: 'Max', birthYearText: '1850' };
    expect(validateStep('basics', form, NOW)).toMatch(/gültiges Geburtsjahr/);
  });
});

describe('validateStep — other steps', () => {
  it('requires at least one play format', () => {
    expect(validateStep('style', { ...EMPTY_FORM, formats: [] }, NOW)).toMatch(/Spielform/);
    expect(validateStep('style', { ...EMPTY_FORM, formats: ['doubles'] }, NOW)).toBeNull();
  });

  it('requires at least one availability slot', () => {
    expect(validateStep('availability', { ...EMPTY_FORM, availability: 0 }, NOW)).toMatch(/Zeitfenster/);
    expect(validateStep('availability', { ...EMPTY_FORM, availability: 4 }, NOW)).toBeNull();
  });

  it('requires at least one seeking preference', () => {
    expect(validateStep('intent', { ...EMPTY_FORM, seeking: [] }, NOW)).toMatch(/Auswahl/);
  });

  it('does not block steps without rules', () => {
    expect(validateStep('venues', EMPTY_FORM, NOW)).toBeNull();
  });
});

describe('playerFromForm', () => {
  const filled = {
    ...EMPTY_FORM,
    firstName: '  Max  ',
    birthYearText: '1990',
    districtId: 'k4',
    bio: '  Suche Partner.  ',
  };

  it('trims text and resolves the district to coordinates', () => {
    const player = playerFromForm(filled, { id: 'me' });
    expect(player.firstName).toBe('Max');
    expect(player.bio).toBe('Suche Partner.');
    expect(player.birthYear).toBe(1990);
    expect(player.neighbourhood).toContain('Kreis 4');
    expect(player.lat).toBeCloseTo(47.376, 3);
  });

  it('keeps the self rating only for unclassified players', () => {
    const unclassified = playerFromForm(
      { ...filled, classification: 'unclassified', selfRating: 3.5 },
      { id: 'me' },
    );
    expect(unclassified.level.classification).toBeNull();
    expect(unclassified.level.selfRating).toBe(3.5);

    // With a classification the self rating is noise, so it is dropped.
    const classified = playerFromForm(
      { ...filled, classification: 'R6', selfRating: 3.5 },
      { id: 'me' },
    );
    expect(classified.level.classification).toBe('R6');
    expect(classified.level.selfRating).toBeNull();
  });

  it('falls back to central Zurich for an unknown district', () => {
    const player = playerFromForm({ ...filled, districtId: 'atlantis' }, { id: 'me' });
    expect(player.lat).toBeCloseTo(47.3769, 3);
  });

  it('preserves createdAt when editing an existing profile', () => {
    const player = playerFromForm(filled, { id: 'me', createdAt: '2020-01-01T00:00:00.000Z' });
    expect(player.createdAt).toBe('2020-01-01T00:00:00.000Z');
  });
});

describe('formFromPlayer', () => {
  it('round-trips a profile through the form without losing matching inputs', () => {
    for (const original of [DEMO_ME, ...SEED_PLAYERS]) {
      const rebuilt = playerFromForm(formFromPlayer(original), {
        id: original.id,
        createdAt: original.createdAt,
      });
      // Everything the matching algorithm reads must survive an edit round trip.
      expect(rebuilt.level).toEqual(original.level);
      expect(rebuilt.availability).toBe(original.availability);
      expect(rebuilt.venueIds).toEqual(original.venueIds);
      expect(rebuilt.formats).toEqual(original.formats);
      expect(rebuilt.intent).toBe(original.intent);
      expect(rebuilt.seeking).toEqual(original.seeking);
      expect(rebuilt.radiusKm).toBe(original.radiusKm);
      expect(rebuilt.intensity).toBe(original.intensity);
      expect(rebuilt.surfaces).toEqual(original.surfaces);
      expect(rebuilt.strengths).toEqual(original.strengths);
      expect(rebuilt.weaknesses).toEqual(original.weaknesses);
      expect(rebuilt.photos).toEqual(original.photos);
      expect(rebuilt.profession).toBe(original.profession);
      expect(rebuilt.industry).toBe(original.industry);
      expect(rebuilt.interests).toEqual(original.interests);
      expect(rebuilt.afterPlay).toEqual(original.afterPlay);
      // The workplace is a matching input too, so it must survive an edit.
      expect(rebuilt.workNeighbourhood).toBe(original.workNeighbourhood);
      expect(rebuilt.workLat).toBe(original.workLat);
      expect(rebuilt.workLon).toBe(original.workLon);
    }
  });

  it('maps coordinates back to the nearest district', () => {
    const form = formFromPlayer(DEMO_ME);
    expect(form.districtId).toBe('k4');
  });

  it('leaves the workplace empty when a player has no fixed one', () => {
    const noWork = SEED_PLAYERS.find((player) => player.workLat === null);
    expect(noWork).toBeDefined();
    const form = formFromPlayer(noWork as NonNullable<typeof noWork>);
    expect(form.workDistrictId).toBe('');

    const rebuilt = playerFromForm(form, { id: 'x' });
    expect(rebuilt.workLat).toBeNull();
    expect(rebuilt.workLon).toBeNull();
    expect(rebuilt.workNeighbourhood).toBe('');
  });

  it('drops a workplace when it is cleared in the form', () => {
    const withWork = formFromPlayer(DEMO_ME);
    expect(withWork.workDistrictId).not.toBe('');
    const cleared = playerFromForm({ ...withWork, workDistrictId: '' }, { id: 'me' });
    expect(cleared.workLat).toBeNull();
    expect(cleared.workNeighbourhood).toBe('');
  });
});
