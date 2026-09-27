import type { Venue } from '../../domain/types';
import { eversports } from './eversports';
import { gotcourts } from './gotcourts';
import type { CourtProvider } from './types';

const courtsonline: CourtProvider = {
  id: 'courtsonline',
  name: 'courts online',
  canListAvailability: false,
  canBook: false,
  bookingUrl: () => 'https://www.courtsonline.ch/',
};

const none: CourtProvider = {
  id: 'none',
  name: 'Kein Online-System',
  canListAvailability: false,
  canBook: false,
  bookingUrl: () => null,
};

export const PROVIDERS: Record<Venue['provider'], CourtProvider> = {
  gotcourts,
  eversports,
  courtsonline,
  none,
};

export function providerFor(venue: Venue): CourtProvider {
  return PROVIDERS[venue.provider];
}

export function bookingUrlFor(venue: Venue, date?: string): string | null {
  return providerFor(venue).bookingUrl(venue, date);
}

/**
 * Where the booking story stands today, shown in the UI so the limitation is
 * visible rather than looking like a bug.
 */
export function bookingStatusFor(venue: Venue): string {
  const provider = providerFor(venue);
  if (provider.canBook) return `Direkt über ${provider.name} buchbar`;
  if (provider.canListAvailability) return `Verfügbarkeit über ${provider.name}`;
  if (provider.id === 'none') return 'Keine Online-Reservation';
  return `Buchung bei ${provider.name} öffnen`;
}

export type { CourtProvider, CourtSlot } from './types';
