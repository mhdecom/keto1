import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  Match,
  Message,
  Player,
  PlayRequest,
  SwipeDirection,
} from '../domain/types';
import type { NewPlayRequest, Repository } from './repository';
import {
  playerToRow,
  rowToMatch,
  rowToMessage,
  rowToPlayer,
  rowToPlayRequest,
  type MatchRow,
  type MessageRow,
  type PlayerRow,
  type PlayRequestRow,
} from './supabaseMappers';

function unwrap<T>(result: { data: T | null; error: { message: string } | null }): T {
  if (result.error) throw new Error(result.error.message);
  if (result.data === null) throw new Error('Keine Daten erhalten');
  return result.data;
}

/**
 * Supabase-backed repository. Discovery and swiping go through the SQL
 * functions `discover_candidates` and `record_swipe` rather than raw table
 * access, so the privacy filtering and the mutual-match transaction live in one
 * place on the server. Scoring stays on the client, using the same tested code.
 */
export class SupabaseRepository implements Repository {
  constructor(private readonly client: SupabaseClient) {}

  private async requireUserId(): Promise<string> {
    const { data, error } = await this.client.auth.getUser();
    if (error) throw new Error(error.message);
    if (!data.user) throw new Error('Nicht angemeldet');
    return data.user.id;
  }

  async getCurrentPlayer(): Promise<Player | null> {
    const { data: userData } = await this.client.auth.getUser();
    if (!userData.user) return null;
    const { data, error } = await this.client
      .from('players')
      .select('*')
      .eq('id', userData.user.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return data ? rowToPlayer(data as PlayerRow) : null;
  }

  async saveCurrentPlayer(player: Player): Promise<void> {
    const userId = await this.requireUserId();
    // The row id must be the authenticated user; never trust the passed id.
    const { error } = await this.client
      .from('players')
      .upsert({ ...playerToRow(player), id: userId });
    if (error) throw new Error(error.message);
  }

  async getPlayer(playerId: string): Promise<Player | null> {
    const { data, error } = await this.client
      .from('players')
      .select('*')
      .eq('id', playerId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return data ? rowToPlayer(data as PlayerRow) : null;
  }

  async listCandidates(): Promise<Player[]> {
    const { data, error } = await this.client.rpc('discover_candidates', { limit_count: 200 });
    if (error) throw new Error(error.message);
    return ((data ?? []) as PlayerRow[]).map(rowToPlayer);
  }

  async listSwipedPlayerIds(viewerId: string): Promise<string[]> {
    const { data, error } = await this.client
      .from('swipes')
      .select('to_player_id')
      .eq('from_player_id', viewerId);
    if (error) throw new Error(error.message);
    return ((data ?? []) as Array<{ to_player_id: string }>).map((row) => row.to_player_id);
  }

  async recordSwipe(
    _viewerId: string,
    targetId: string,
    direction: SwipeDirection,
  ): Promise<Match | null> {
    // The function reads the caller from auth.uid(), so viewerId is not sent.
    const { data, error } = await this.client.rpc('record_swipe', {
      target: targetId,
      dir: direction,
    });
    if (error) throw new Error(error.message);
    return data ? rowToMatch(data as MatchRow) : null;
  }

  async listMatches(playerId: string): Promise<Match[]> {
    const { data, error } = await this.client
      .from('matches')
      .select('*')
      .or(`player_a.eq.${playerId},player_b.eq.${playerId}`)
      .order('created_at', { ascending: false });
    if (error) throw new Error(error.message);
    return ((data ?? []) as MatchRow[]).map(rowToMatch);
  }

  async listMessages(matchId: string): Promise<Message[]> {
    const { data, error } = await this.client
      .from('messages')
      .select('*')
      .eq('match_id', matchId)
      .order('created_at', { ascending: true });
    if (error) throw new Error(error.message);
    return ((data ?? []) as MessageRow[]).map(rowToMessage);
  }

  async sendMessage(matchId: string, senderId: string, body: string): Promise<Message> {
    const result = await this.client
      .from('messages')
      .insert({ match_id: matchId, sender_id: senderId, body })
      .select()
      .single();
    return rowToMessage(unwrap(result) as MessageRow);
  }

  async listPlayRequests(): Promise<PlayRequest[]> {
    const { data, error } = await this.client
      .from('play_requests')
      .select('*, play_request_responses(player_id)')
      .gte('play_date', new Date().toISOString().slice(0, 10))
      .order('play_date', { ascending: true });
    if (error) throw new Error(error.message);
    return ((data ?? []) as PlayRequestRow[]).map(rowToPlayRequest);
  }

  async createPlayRequest(playerId: string, request: NewPlayRequest): Promise<PlayRequest> {
    const result = await this.client
      .from('play_requests')
      .insert({
        player_id: playerId,
        play_date: request.date,
        time_block: request.timeBlock,
        venue_id: request.venueId,
        format: request.format,
        note: request.note,
        min_strength: request.minStrength,
        max_strength: request.maxStrength,
      })
      .select('*, play_request_responses(player_id)')
      .single();
    return rowToPlayRequest(unwrap(result) as PlayRequestRow);
  }

  async respondToPlayRequest(requestId: string, playerId: string): Promise<void> {
    const { error } = await this.client
      .from('play_request_responses')
      .upsert({ request_id: requestId, player_id: playerId });
    if (error) throw new Error(error.message);
  }

  async reset(): Promise<void> {
    // Deliberately a no-op: "reset" is a demo affordance for local state, not
    // something that should ever wipe server rows.
  }
}
