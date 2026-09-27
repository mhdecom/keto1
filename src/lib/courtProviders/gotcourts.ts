import type { Venue } from '../../domain/types';
import type { CourtProvider } from './types';

/**
 * GotCourts runs the online reservation for the City of Zurich's Sportamt
 * courts and has done since 2014 — roughly 40 public clay courts across eight
 * facilities. That makes it the single most important provider for this app
 * and, for now, the least accessible one.
 *
 * There is no documented public API. Club profile pages are publicly readable,
 * but scraping them would need a terms-of-service review first, so this adapter
 * intentionally stops at deep links. Reading availability is a product decision
 * with legal consequences, not a coding task, and it should not be smuggled in
 * behind a helper function.
 */
export const gotcourts: CourtProvider = {
  id: 'gotcourts',
  name: 'GotCourts',
  canListAvailability: false,
  canBook: false,
  bookingUrl(venue: Venue): string | null {
    if (!venue.providerRef) return null;
    return `https://apps.gotcourts.com/de/profile/club/${venue.providerRef}`;
  },
};
