import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { getRepository, keyValueStore } from '../data';
import { getAuth, type AuthUser } from '../data/auth';
import type { NewPlayRequest, Repository } from '../data/repository';
import { buildDeck, type MatchCandidate } from '../domain/matching';
import type {
  Match,
  Player,
  PlayRequest,
  ReportReason,
  SwipeDirection,
} from '../domain/types';
import { VENUE_NAMES } from '../domain/venues';

export interface MatchWithPlayer {
  match: Match;
  other: Player;
}

interface SessionValue {
  /** False until the session and any stored profile have been read. */
  ready: boolean;
  /** The signed-in account, or null when nobody is signed in. */
  user: AuthUser | null;
  auth: ReturnType<typeof getAuth>;
  me: Player | null;
  repository: Repository;

  /** Re-reads the session after a sign-in screen completes. */
  refreshUser: () => Promise<void>;
  signOut: () => Promise<void>;
  /** Removes the account and everything attached to it, irreversibly. */
  deleteAccount: () => Promise<void>;

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

  blockedIds: string[];
  blockPlayer: (targetId: string) => Promise<void>;
  reportPlayer: (targetId: string, reason: ReportReason, detail: string) => Promise<void>;

  resetEverything: () => Promise<void>;
}

const SessionContext = createContext<SessionValue | null>(null);

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const repository = useMemo(() => getRepository(), []);
  const auth = useMemo(() => getAuth(keyValueStore), []);

  const [ready, setReady] = useState(false);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [me, setMe] = useState<Player | null>(null);
  const [blockedIds, setBlockedIds] = useState<string[]>([]);
  const [deck, setDeck] = useState<MatchCandidate[]>([]);
  const [deckLoading, setDeckLoading] = useState(false);
  const [matches, setMatches] = useState<MatchWithPlayer[]>([]);
  const [requests, setRequests] = useState<PlayRequest[]>([]);

  const loadSession = useCallback(async () => {
    const signedIn = await auth.current();
    setUser(signedIn);
    // No account means no profile: the two must never drift apart, or a signed
    // out device would still show the last person's deck.
    setMe(signedIn ? await repository.getCurrentPlayer() : null);
    setBlockedIds(signedIn ? await repository.listBlockedPlayerIds(signedIn.id) : []);
  }, [auth, repository]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      await loadSession();
      if (!cancelled) setReady(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [loadSession]);

  const reloadDeck = useCallback(async () => {
    if (!me) {
      setDeck([]);
      return;
    }
    setDeckLoading(true);
    try {
      const [candidates, swiped, blocked] = await Promise.all([
        repository.listCandidates(me.id),
        repository.listSwipedPlayerIds(me.id),
        repository.listBlockedPlayerIds(me.id),
      ]);
      setDeck(
        buildDeck(me, candidates, {
          excludePlayerIds: [...swiped, ...blocked],
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
      if (!user) throw new Error('Nicht angemeldet');
      // The profile id is always the account id. Letting a caller pass its own
      // would be the kind of mismatch that silently breaks matching later.
      const owned = { ...player, id: user.id };
      await repository.saveCurrentPlayer(owned);
      setMe(owned);
    },
    [repository, user],
  );

  const refreshUser = useCallback(async () => {
    await loadSession();
  }, [loadSession]);

  const signOut = useCallback(async () => {
    await auth.signOut();
    setUser(null);
    setMe(null);
    setDeck([]);
    setMatches([]);
    setBlockedIds([]);
  }, [auth]);

  const deleteAccount = useCallback(async () => {
    if (user) await repository.deleteAccountData(user.id);
    await auth.deleteAccount();
    setUser(null);
    setMe(null);
    setDeck([]);
    setMatches([]);
    setBlockedIds([]);
  }, [auth, repository, user]);

  const blockPlayer = useCallback(
    async (targetId: string) => {
      if (!me) return;
      await repository.blockPlayer(me.id, targetId);
      setBlockedIds(await repository.listBlockedPlayerIds(me.id));
      setDeck((current) => current.filter((entry) => entry.player.id !== targetId));
      setMatches((current) =>
        current.filter((entry) => !entry.match.playerIds.includes(targetId)),
      );
    },
    [me, repository],
  );

  const reportPlayer = useCallback(
    async (targetId: string, reason: ReportReason, detail: string) => {
      if (!me) return;
      await repository.reportPlayer(me.id, targetId, reason, detail);
    },
    [me, repository],
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
    await auth.signOut();
    setUser(null);
    setMe(null);
    setDeck([]);
    setMatches([]);
    setBlockedIds([]);
    await reloadRequests();
  }, [auth, reloadRequests, repository]);

  const value = useMemo<SessionValue>(
    () => ({
      ready,
      user,
      auth,
      me,
      repository,
      refreshUser,
      signOut,
      deleteAccount,
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
      blockedIds,
      blockPlayer,
      reportPlayer,
      resetEverything,
    }),
    [
      auth,
      blockPlayer,
      blockedIds,
      createRequest,
      deck,
      deckLoading,
      deleteAccount,
      matches,
      me,
      ready,
      refreshUser,
      reloadDeck,
      reloadMatches,
      reloadRequests,
      reportPlayer,
      repository,
      requests,
      respondToRequest,
      resetEverything,
      saveMe,
      signOut,
      swipe,
      user,
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
