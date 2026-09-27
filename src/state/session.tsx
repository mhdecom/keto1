import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { getRepository } from '../data';
import type { NewPlayRequest, Repository } from '../data/repository';
import { buildDeck, type MatchCandidate } from '../domain/matching';
import type { Match, Player, PlayRequest, SwipeDirection } from '../domain/types';
import { VENUE_NAMES } from '../domain/venues';

export interface MatchWithPlayer {
  match: Match;
  other: Player;
}

interface SessionValue {
  /** False until the stored profile has been read. */
  ready: boolean;
  me: Player | null;
  repository: Repository;

  saveMe: (player: Player) => Promise<void>;

  deck: MatchCandidate[];
  deckLoading: boolean;
  swipe: (candidate: MatchCandidate, direction: SwipeDirection) => Promise<Match | null>;
  reloadDeck: () => Promise<void>;

  matches: MatchWithPlayer[];
  reloadMatches: () => Promise<void>;

  requests: PlayRequest[];
  reloadRequests: () => Promise<void>;
  createRequest: (request: NewPlayRequest) => Promise<void>;
  respondToRequest: (requestId: string) => Promise<void>;

  resetEverything: () => Promise<void>;
}

const SessionContext = createContext<SessionValue | null>(null);

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const repository = useMemo(() => getRepository(), []);

  const [ready, setReady] = useState(false);
  const [me, setMe] = useState<Player | null>(null);
  const [deck, setDeck] = useState<MatchCandidate[]>([]);
  const [deckLoading, setDeckLoading] = useState(false);
  const [matches, setMatches] = useState<MatchWithPlayer[]>([]);
  const [requests, setRequests] = useState<PlayRequest[]>([]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const stored = await repository.getCurrentPlayer();
      if (!cancelled) {
        setMe(stored);
        setReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [repository]);

  const reloadDeck = useCallback(async () => {
    if (!me) {
      setDeck([]);
      return;
    }
    setDeckLoading(true);
    try {
      const [candidates, swiped] = await Promise.all([
        repository.listCandidates(me.id),
        repository.listSwipedPlayerIds(me.id),
      ]);
      setDeck(
        buildDeck(me, candidates, {
          excludePlayerIds: swiped,
          venueNames: VENUE_NAMES,
        }),
      );
    } finally {
      setDeckLoading(false);
    }
  }, [me, repository]);

  const reloadMatches = useCallback(async () => {
    if (!me) {
      setMatches([]);
      return;
    }
    const rows = await repository.listMatches(me.id);
    const resolved = await Promise.all(
      rows.map(async (match) => {
        const otherId = match.playerIds.find((id) => id !== me.id);
        const other = otherId ? await repository.getPlayer(otherId) : null;
        return other ? { match, other } : null;
      }),
    );
    setMatches(resolved.filter((entry): entry is MatchWithPlayer => entry !== null));
  }, [me, repository]);

  const reloadRequests = useCallback(async () => {
    setRequests(await repository.listPlayRequests());
  }, [repository]);

  // Whenever the profile changes (onboarding, edits) the deck must be rebuilt:
  // changing your level or your availability changes who should be shown.
  useEffect(() => {
    void reloadDeck();
    void reloadMatches();
  }, [reloadDeck, reloadMatches]);

  useEffect(() => {
    void reloadRequests();
  }, [reloadRequests]);

  const saveMe = useCallback(
    async (player: Player) => {
      await repository.saveCurrentPlayer(player);
      setMe(player);
    },
    [repository],
  );

  const swipe = useCallback(
    async (candidate: MatchCandidate, direction: SwipeDirection): Promise<Match | null> => {
      if (!me) return null;
      // Drop the card immediately: waiting for storage before the deck moves
      // makes every swipe feel laggy.
      setDeck((current) => current.filter((entry) => entry.player.id !== candidate.player.id));
      const match = await repository.recordSwipe(me.id, candidate.player.id, direction);
      if (match) await reloadMatches();
      return match;
    },
    [me, reloadMatches, repository],
  );

  const createRequest = useCallback(
    async (request: NewPlayRequest) => {
      if (!me) return;
      await repository.createPlayRequest(me.id, request);
      await reloadRequests();
    },
    [me, reloadRequests, repository],
  );

  const respondToRequest = useCallback(
    async (requestId: string) => {
      if (!me) return;
      await repository.respondToPlayRequest(requestId, me.id);
      await reloadRequests();
    },
    [me, reloadRequests, repository],
  );

  const resetEverything = useCallback(async () => {
    await repository.reset();
    setMe(null);
    setDeck([]);
    setMatches([]);
    await reloadRequests();
  }, [reloadRequests, repository]);

  const value = useMemo<SessionValue>(
    () => ({
      ready,
      me,
      repository,
      saveMe,
      deck,
      deckLoading,
      swipe,
      reloadDeck,
      matches,
      reloadMatches,
      requests,
      reloadRequests,
      createRequest,
      respondToRequest,
      resetEverything,
    }),
    [
      createRequest,
      deck,
      deckLoading,
      matches,
      me,
      ready,
      reloadDeck,
      reloadMatches,
      reloadRequests,
      repository,
      requests,
      respondToRequest,
      resetEverything,
      saveMe,
      swipe,
    ],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionValue {
  const value = useContext(SessionContext);
  if (!value) throw new Error('useSession muss innerhalb von SessionProvider verwendet werden');
  return value;
}

/** Screens behind the onboarding gate can rely on a profile existing. */
export function useMe(): Player {
  const { me } = useSession();
  if (!me) throw new Error('Kein Profil geladen');
  return me;
}
