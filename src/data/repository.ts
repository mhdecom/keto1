import type {
  Match,
  Message,
  Player,
  PlayRequest,
  ReportReason,
  SwipeDirection,
} from '../domain/types';

export interface NewPlayRequest {
  date: string;
  timeBlock: PlayRequest['timeBlock'];
  venueId: string | null;
  format: PlayRequest['format'];
  note: string;
  minStrength: number;
  maxStrength: number;
}

/**
 * Everything the UI needs from persistence. Implemented twice: locally for
 * offline/demo use, and against Supabase for the real thing. Keeping the
 * screens behind this interface means the backend can be swapped without
 * touching a single component.
 */
export interface Repository {
  getCurrentPlayer(): Promise<Player | null>;
  saveCurrentPlayer(player: Player): Promise<void>;
  getPlayer(playerId: string): Promise<Player | null>;

  /**
   * Takes a local image URI from the picker and returns the string to store on
   * the profile. Locally that is the URI itself; against a real backend it is
   * the URL of the uploaded file. Keeping it behind the repository means the
   * picker UI never learns which one it is talking to.
   */
  savePhoto(localUri: string): Promise<string>;

  /** Everyone except the viewer, before filtering and scoring. */
  listCandidates(viewerId: string): Promise<Player[]>;
  /** Ids the viewer already liked or passed on, so they do not reappear. */
  listSwipedPlayerIds(viewerId: string): Promise<string[]>;
  /** Records a swipe and returns the new match when the like was mutual. */
  recordSwipe(
    viewerId: string,
    targetId: string,
    direction: SwipeDirection,
  ): Promise<Match | null>;

  listMatches(playerId: string): Promise<Match[]>;
  listMessages(matchId: string): Promise<Message[]>;
  sendMessage(matchId: string, senderId: string, body: string): Promise<Message>;

  listPlayRequests(): Promise<PlayRequest[]>;
  createPlayRequest(playerId: string, request: NewPlayRequest): Promise<PlayRequest>;
  respondToPlayRequest(requestId: string, playerId: string): Promise<void>;

  // --- Safety -------------------------------------------------------------

  /**
   * Hides both people from each other for good: out of the deck, out of the
   * match list, out of the request feed. Blocking is one-sided by intent —
   * the blocked person is never told.
   */
  blockPlayer(viewerId: string, targetId: string): Promise<void>;
  listBlockedPlayerIds(viewerId: string): Promise<string[]>;
  /** Files a report for review. Blocking is a separate, immediate action. */
  reportPlayer(
    viewerId: string,
    targetId: string,
    reason: ReportReason,
    detail: string,
  ): Promise<void>;

  /** Removes the profile and everything attached to it. */
  deleteAccountData(playerId: string): Promise<void>;

  /** Wipes local state — used by the "reset demo" action. */
  reset(): Promise<void>;
}
