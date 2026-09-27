import { describe, expect, it } from 'vitest';
import { DEMO_ME, SEED_PLAYERS } from '../seed';
import {
  playerToRow,
  rowToMatch,
  rowToMessage,
  rowToPlayer,
  rowToPlayRequest,
  type PlayerRow,
} from '../supabaseMappers';

describe('player mapping', () => {
  it('round-trips every seeded profile without losing a field', () => {
    for (const player of [DEMO_ME, ...SEED_PLAYERS]) {
      const row = { ...playerToRow(player), created_at: player.createdAt } as PlayerRow;
      expect(rowToPlayer(row)).toEqual(player);
    }
  });

  it('parses numeric(2,1) arriving as a string', () => {
    const row = {
      ...playerToRow(DEMO_ME),
      created_at: DEMO_ME.createdAt,
      self_rating: '4.5',
    } as PlayerRow;
    expect(rowToPlayer(row).level.selfRating).toBe(4.5);
  });

  it('keeps a null self rating null instead of turning it into 0', () => {
    const row = {
      ...playerToRow(DEMO_ME),
      created_at: DEMO_ME.createdAt,
      self_rating: null,
    } as PlayerRow;
    expect(rowToPlayer(row).level.selfRating).toBeNull();
  });

  it('tolerates null arrays from a partially filled row', () => {
    const row = {
      ...playerToRow(DEMO_ME),
      created_at: DEMO_ME.createdAt,
      photos: null,
      formats: null,
      strengths: null,
      venue_ids: null,
      languages: null,
    } as unknown as PlayerRow;
    const player = rowToPlayer(row);
    expect(player.photos).toEqual([]);
    expect(player.formats).toEqual([]);
    expect(player.strengths).toEqual([]);
    expect(player.venueIds).toEqual([]);
    expect(player.languages).toEqual([]);
  });
});

describe('match mapping', () => {
  it('keeps the ordered pair as a tuple', () => {
    const match = rowToMatch({
      id: 'm1',
      player_a: 'aaa',
      player_b: 'bbb',
      dating_enabled: true,
      created_at: '2026-09-27T10:00:00.000Z',
    });
    expect(match.playerIds).toEqual(['aaa', 'bbb']);
    expect(match.datingEnabled).toBe(true);
  });
});

describe('message mapping', () => {
  it('maps snake_case to camelCase', () => {
    const message = rowToMessage({
      id: 'x1',
      match_id: 'm1',
      sender_id: 'p1',
      body: 'Morgen 19:00?',
      created_at: '2026-09-27T10:00:00.000Z',
    });
    expect(message).toEqual({
      id: 'x1',
      matchId: 'm1',
      senderId: 'p1',
      body: 'Morgen 19:00?',
      createdAt: '2026-09-27T10:00:00.000Z',
    });
  });
});

describe('play request mapping', () => {
  it('flattens the joined responses into ids', () => {
    const request = rowToPlayRequest({
      id: 'r1',
      player_id: 'p1',
      play_date: '2026-09-29',
      time_block: 'evening',
      venue_id: 'mythenquai',
      format: 'singles',
      note: 'Platz gebucht',
      min_strength: 30,
      max_strength: 60,
      created_at: '2026-09-27T10:00:00.000Z',
      play_request_responses: [{ player_id: 'p2' }, { player_id: 'p3' }],
    });
    expect(request.respondentIds).toEqual(['p2', 'p3']);
    expect(request.date).toBe('2026-09-29');
  });

  it('handles a request with no responses joined', () => {
    const request = rowToPlayRequest({
      id: 'r1',
      player_id: 'p1',
      play_date: '2026-09-29',
      time_block: 'morning',
      venue_id: null,
      format: 'doubles',
      note: '',
      min_strength: 0,
      max_strength: 100,
      created_at: '2026-09-27T10:00:00.000Z',
      play_request_responses: null,
    });
    expect(request.respondentIds).toEqual([]);
    expect(request.venueId).toBeNull();
  });
});
