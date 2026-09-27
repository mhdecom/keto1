import type { TimeBlock, Venue } from '../../domain/types';

export interface CourtSlot {
  venueId: string;
  /** ISO date, e.g. "2026-09-29". */
  date: string;
  /** Local start time, "19:00". */
  start: string;
  end: string;
  courtLabel: string;
  priceChf: number | null;
}

/**
 * A booking system we can send players to, and eventually book through.
 *
 * Deliberately an adapter: the roadmap depends on deals we do not have yet, so
 * the app must not be wired to any single provider. Today every implementation
 * only produces links. When an API agreement lands, that provider implements
 * `listAvailability` and `createBooking` and nothing above this layer changes.
 */
export interface CourtProvider {
  id: Venue['provider'];
  name: string;
  /** True once availability can actually be read programmatically. */
  canListAvailability: boolean;
  /** True once a booking can be completed inside the app. */
  canBook: boolean;
  /** Deep link into the provider for a venue, optionally on a given date. */
  bookingUrl(venue: Venue, date?: string): string | null;
  listAvailability?(venue: Venue, date: string, block?: TimeBlock): Promise<CourtSlot[]>;
}
