import type {
  Match,
  Message,
  Player,
  PlayRequest,
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

  /** Wipes local state — used by the "reset demo" action. */
  reset(): Promise<void>;
}
