import { beforeEach, describe, expect, it } from 'vitest';
import { LocalRepository } from '../localRepository';
import { DEMO_ME, SEED_PLAY_REQUESTS, SEED_PLAYERS } from '../seed';
import { createMemoryStore } from '../store';

function makeRepo() {
  return new LocalRepository(createMemoryStore());
}

describe('LocalRepository — profile', () => {
  it('has no current player until one is saved', async () => {
    const repo = makeRepo();
    expect(await repo.getCurrentPlayer()).toBeNull();
    await repo.saveCurrentPlayer(DEMO_ME);
    expect((await repo.getCurrentPlayer())?.firstName).toBe('Max');
  });

  it('survives a corrupt payload instead of throwing', async () => {
    const store = createMemoryStore({ 'tt:me': '{not json' });
    const repo = new LocalRepository(store);
    expect(await repo.getCurrentPlayer()).toBeNull();
  });

  it('resolves seeded players by id', async () => {
    const repo = makeRepo();
    expect((await repo.getPlayer('p-marco'))?.firstName).toBe('Marco');
    expect(await repo.getPlayer('nope')).toBeNull();
  });

  it('never offers the viewer themselves as a candidate', async () => {
    const repo = makeRepo();
    const candidates = await repo.listCandidates('p-marco');
    expect(candidates.map((p) => p.id)).not.toContain('p-marco');
    expect(candidates).toHaveLength(SEED_PLAYERS.length - 1);
  });
});

describe('LocalRepository — swiping', () => {
  let repo: LocalRepository;

  beforeEach(async () => {
    repo = makeRepo();
    await repo.saveCurrentPlayer(DEMO_ME);
  });

  it('remembers who has been swiped so nobody reappears', async () => {
    await repo.recordSwipe('me', 'p-marco', 'pass');
    await repo.recordSwipe('me', 'p-lena', 'like');
    const swiped = await repo.listSwipedPlayerIds('me');
    expect(swiped).toContain('p-marco');
    expect(swiped).toContain('p-lena');
    expect(swiped).toHaveLength(2);
  });

  it('never creates a match from a pass', async () => {
    expect(await repo.recordSwipe('me', 'p-marco', 'pass')).toBeNull();
    expect(await repo.listMatches('me')).toHaveLength(0);
  });

  it('is deterministic: the same pair always resolves the same way', async () => {
    const first = await repo.recordSwipe('me', 'p-marco', 'like');

    const second = makeRepo();
    await second.saveCurrentPlayer(DEMO_ME);
    const again = await second.recordSwipe('me', 'p-marco', 'like');

    expect(first === null).toBe(again === null);
  });

  it('does not create a duplicate match for a repeated like', async () => {
    // Find a player who does like back, then like them twice.
    let matchedId: string | null = null;
    for (const player of SEED_PLAYERS) {
      const fresh = makeRepo();
      await fresh.saveCurrentPlayer(DEMO_ME);
      if (await fresh.recordSwipe('me', player.id, 'like')) {
        matchedId = player.id;
        break;
      }
    }
    expect(matchedId).not.toBeNull();

    const first = await repo.recordSwipe('me', matchedId as string, 'like');
    const second = await repo.recordSwipe('me', matchedId as string, 'like');
    expect(first).not.toBeNull();
    expect(second?.id).toBe(first?.id);
    expect(await repo.listMatches('me')).toHaveLength(1);
  });

  it('only lists matches the player is part of', async () => {
    for (const player of SEED_PLAYERS) {
      await repo.recordSwipe('me', player.id, 'like');
    }
    const mine = await repo.listMatches('me');
    expect(mine.length).toBeGreaterThan(0);
    expect(mine.every((match) => match.playerIds.includes('me'))).toBe(true);
    expect(await repo.listMatches('p-nobody')).toHaveLength(0);
  });

  it('flags dating only when both sides opted in', async () => {
    // Max is tennisOnly, so no match of his may ever enable dating.
    for (const player of SEED_PLAYERS) {
      await repo.recordSwipe('me', player.id, 'like');
    }
    const matches = await repo.listMatches('me');
    expect(matches.every((match) => match.datingEnabled === false)).toBe(true);

    // Now as someone who is open to dating, matched with someone who also is.
    const dating = makeRepo();
    await dating.saveCurrentPlayer({ ...DEMO_ME, intent: 'openToDating', seeking: ['female'] });
    let sawDatingEnabled = false;
    for (const player of SEED_PLAYERS.filter((p) => p.intent === 'openToDating')) {
      const match = await dating.recordSwipe('me', player.id, 'like');
      if (match?.datingEnabled) sawDatingEnabled = true;
    }
    expect(sawDatingEnabled).toBe(true);
  });
});

describe('LocalRepository — chat', () => {
  it('returns messages for one match in chronological order', async () => {
    const repo = makeRepo();
    await repo.saveCurrentPlayer(DEMO_ME);
    await repo.sendMessage('match-a', 'me', 'Erste');
    await repo.sendMessage('match-b', 'me', 'Andere Konversation');
    await repo.sendMessage('match-a', 'p-marco', 'Zweite');

    const thread = await repo.listMessages('match-a');
    expect(thread.map((m) => m.body)).toEqual(['Erste', 'Zweite']);
    expect(await repo.listMessages('match-b')).toHaveLength(1);
  });
});

describe('LocalRepository — play requests', () => {
  it('lists the seeded requests sorted by date', async () => {
    const repo = makeRepo();
    const requests = await repo.listPlayRequests();
    expect(requests).toHaveLength(SEED_PLAY_REQUESTS.length);
    const dates = requests.map((request) => request.date);
    expect([...dates].sort()).toEqual(dates);
  });

  it('adds a new request without losing the seeded ones', async () => {
    const repo = makeRepo();
    const created = await repo.createPlayRequest('me', {
      date: '2026-09-28',
      timeBlock: 'evening',
      venueId: 'mythenquai',
      format: 'singles',
      note: 'Platz gebucht, Partner fehlt.',
      minStrength: 30,
      maxStrength: 60,
    });
    const requests = await repo.listPlayRequests();
    expect(requests).toHaveLength(SEED_PLAY_REQUESTS.length + 1);
    expect(requests.find((r) => r.id === created.id)?.playerId).toBe('me');
  });

  it('records a response to a seeded request exactly once', async () => {
    const repo = makeRepo();
    await repo.respondToPlayRequest('req-1', 'me');
    await repo.respondToPlayRequest('req-1', 'me');

    const requests = await repo.listPlayRequests();
    // The local copy must replace the seed, not sit next to it.
    expect(requests.filter((request) => request.id === 'req-1')).toHaveLength(1);
    expect(requests).toHaveLength(SEED_PLAY_REQUESTS.length);
    expect(requests.find((r) => r.id === 'req-1')?.respondentIds).toEqual(['me']);
  });

  it('records a response to an own request', async () => {
    const repo = makeRepo();
    const created = await repo.createPlayRequest('p-lena', {
      date: '2026-10-05',
      timeBlock: 'morning',
      venueId: null,
      format: 'doubles',
      note: '',
      minStrength: 20,
      maxStrength: 60,
    });
    await repo.respondToPlayRequest(created.id, 'me');
    await repo.respondToPlayRequest(created.id, 'me');
    const requests = await repo.listPlayRequests();
    expect(requests.find((r) => r.id === created.id)?.respondentIds).toEqual(['me']);
  });

  it('ignores a response to an unknown request', async () => {
    const repo = makeRepo();
    await repo.respondToPlayRequest('does-not-exist', 'me');
    expect(await repo.listPlayRequests()).toHaveLength(SEED_PLAY_REQUESTS.length);
  });
});

describe('LocalRepository — reset', () => {
  it('clears profile, swipes, matches and messages', async () => {
    const repo = makeRepo();
    await repo.saveCurrentPlayer(DEMO_ME);
    await repo.recordSwipe('me', 'p-marco', 'like');
    await repo.sendMessage('match-a', 'me', 'Hallo');

    await repo.reset();

    expect(await repo.getCurrentPlayer()).toBeNull();
    expect(await repo.listSwipedPlayerIds('me')).toHaveLength(0);
    expect(await repo.listMatches('me')).toHaveLength(0);
    expect(await repo.listMessages('match-a')).toHaveLength(0);
    expect(await repo.listPlayRequests()).toHaveLength(SEED_PLAY_REQUESTS.length);
  });
});
