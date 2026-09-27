import type {
  Match,
  Message,
  Player,
  PlayRequest,
  Swipe,
  SwipeDirection,
} from '../domain/types';
import type { NewPlayRequest, Repository } from './repository';
import { SEED_PLAY_REQUESTS, SEED_PLAYERS } from './seed';
import type { KeyValueStore } from './store';

const KEYS = {
  me: 'tt:me',
  swipes: 'tt:swipes',
  matches: 'tt:matches',
  messages: 'tt:messages',
  requests: 'tt:requests',
} as const;

let idCounter = 0;
function newId(prefix: string): string {
  idCounter += 1;
  return `${prefix}-${Date.now().toString(36)}-${idCounter.toString(36)}`;
}

/**
 * Local-first repository. The app is fully usable with no backend at all:
 * seeded Zurich players, real swiping, real matches, real chat — just not
 * shared with anyone else. That makes the product testable end to end before
 * a single row exists in Supabase.
 */
export class LocalRepository implements Repository {
  constructor(private readonly store: KeyValueStore) {}

  private async read<T>(key: string, fallback: T): Promise<T> {
    const raw = await this.store.get(key);
    if (raw === null) return fallback;
    try {
      return JSON.parse(raw) as T;
    } catch {
      // Corrupt or stale payload from an older schema — fall back rather than crash.
      return fallback;
    }
  }

  private async write(key: string, value: unknown): Promise<void> {
    await this.store.set(key, JSON.stringify(value));
  }

  async getCurrentPlayer(): Promise<Player | null> {
    return this.read<Player | null>(KEYS.me, null);
  }

  async saveCurrentPlayer(player: Player): Promise<void> {
    await this.write(KEYS.me, player);
  }

  async savePhoto(localUri: string): Promise<string> {
    // Nothing to upload: the picker already gave us a URI the device can read.
    // It survives a restart on iOS and Android; on web it is a blob URL that
    // does not, which is noted in the README rather than papered over here.
    return localUri;
  }

  async getPlayer(playerId: string): Promise<Player | null> {
    const me = await this.getCurrentPlayer();
    if (me && me.id === playerId) return me;
    return SEED_PLAYERS.find((player) => player.id === playerId) ?? null;
  }

  async listCandidates(viewerId: string): Promise<Player[]> {
    return SEED_PLAYERS.filter((player) => player.id !== viewerId);
  }

  private async listSwipes(): Promise<Swipe[]> {
    return this.read<Swipe[]>(KEYS.swipes, []);
  }

  async listSwipedPlayerIds(viewerId: string): Promise<string[]> {
    const swipes = await this.listSwipes();
    return swipes.filter((swipe) => swipe.fromPlayerId === viewerId).map((s) => s.toPlayerId);
  }

  /**
   * Stands in for the other side's decision while there is no real user base.
   *
   * It is deterministic on the pair of ids so the same profile always answers
   * the same way — a random coin flip would make the demo feel broken when a
   * match appears and disappears between reloads. Seeded players with a wide
   * `seeking` list are more likely to like back, which roughly mirrors how
   * open they said they were.
   */
  private wouldLikeBack(viewerId: string, target: Player): boolean {
    const key = `${viewerId}|${target.id}`;
    let hash = 0;
    for (let i = 0; i < key.length; i += 1) {
      hash = (hash * 31 + key.charCodeAt(i)) % 1000;
    }
    const openness = target.seeking.length >= 3 ? 720 : 520;
    return hash < openness;
  }

  async recordSwipe(
    viewerId: string,
    targetId: string,
    direction: SwipeDirection,
  ): Promise<Match | null> {
    const swipes = await this.listSwipes();
    const swipe: Swipe = {
      id: newId('swipe'),
      fromPlayerId: viewerId,
      toPlayerId: targetId,
      direction,
      createdAt: new Date().toISOString(),
    };
    await this.write(KEYS.swipes, [...swipes, swipe]);

    if (direction !== 'like') return null;

    const target = await this.getPlayer(targetId);
    const viewer = await this.getCurrentPlayer();
    if (!target || !viewer) return null;

    // A real backend looks for an existing like from the other side. Locally
    // there is nobody on the other side, so simulate their answer.
    const reciprocated =
      swipes.some(
        (existing) =>
          existing.fromPlayerId === targetId &&
          existing.toPlayerId === viewerId &&
          existing.direction === 'like',
      ) || this.wouldLikeBack(viewerId, target);

    if (!reciprocated) return null;

    const matches = await this.listAllMatches();
    const already = matches.find(
      (match) => match.playerIds.includes(viewerId) && match.playerIds.includes(targetId),
    );
    if (already) return already;

    const match: Match = {
      id: newId('match'),
      playerIds: [viewerId, targetId],
      createdAt: new Date().toISOString(),
      datingEnabled: viewer.intent === 'openToDating' && target.intent === 'openToDating',
    };
    await this.write(KEYS.matches, [...matches, match]);
    return match;
  }

  private async listAllMatches(): Promise<Match[]> {
    return this.read<Match[]>(KEYS.matches, []);
  }

  async listMatches(playerId: string): Promise<Match[]> {
    const matches = await this.listAllMatches();
    return matches
      .filter((match) => match.playerIds.includes(playerId))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  async listMessages(matchId: string): Promise<Message[]> {
    const all = await this.read<Message[]>(KEYS.messages, []);
    return all
      .filter((message) => message.matchId === matchId)
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  }

  async sendMessage(matchId: string, senderId: string, body: string): Promise<Message> {
    const all = await this.read<Message[]>(KEYS.messages, []);
    const message: Message = {
      id: newId('msg'),
      matchId,
      senderId,
      body,
      createdAt: new Date().toISOString(),
    };
    await this.write(KEYS.messages, [...all, message]);
    return message;
  }

  async listPlayRequests(): Promise<PlayRequest[]> {
    const own = await this.read<PlayRequest[]>(KEYS.requests, []);
    // A seeded request that has been responded to is stored locally under the
    // same id, so the local copy must win over the seed rather than join it.
    const localIds = new Set(own.map((request) => request.id));
    const seeds = SEED_PLAY_REQUESTS.filter((request) => !localIds.has(request.id));
    return [...own, ...seeds].sort((a, b) => a.date.localeCompare(b.date));
  }

  async createPlayRequest(playerId: string, request: NewPlayRequest): Promise<PlayRequest> {
    const own = await this.read<PlayRequest[]>(KEYS.requests, []);
    const created: PlayRequest = {
      ...request,
      id: newId('req'),
      playerId,
      createdAt: new Date().toISOString(),
      respondentIds: [],
    };
    await this.write(KEYS.requests, [created, ...own]);
    return created;
  }

  async respondToPlayRequest(requestId: string, playerId: string): Promise<void> {
    const own = await this.read<PlayRequest[]>(KEYS.requests, []);
    const index = own.findIndex((request) => request.id === requestId);

    if (index === -1) {
      // Responding to a seeded request: store a local copy carrying the response
      // so the seed array itself stays immutable.
      const seeded = SEED_PLAY_REQUESTS.find((request) => request.id === requestId);
      if (!seeded) return;
      await this.write(KEYS.requests, [
        { ...seeded, respondentIds: [...seeded.respondentIds, playerId] },
        ...own,
      ]);
      return;
    }

    const target = own[index];
    if (target.respondentIds.includes(playerId)) return;
    const next = [...own];
    next[index] = { ...target, respondentIds: [...target.respondentIds, playerId] };
    await this.write(KEYS.requests, next);
  }

  async reset(): Promise<void> {
    await Promise.all(Object.values(KEYS).map((key) => this.store.remove(key)));
  }
}
