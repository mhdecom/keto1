import type { Venue } from '../../domain/types';
import type { CourtProvider } from './types';

/**
 * Eversports covers indoor courts and private clubs in Zurich that the Sportamt
 * system does not, and runs a partner programme — which makes it the more
 * realistic first integration even though it holds fewer Zurich courts than
 * GotCourts. Starting here also avoids building the whole booking story on a
 * provider that has a reason to see this app as a competitor.
 */
export const eversports: CourtProvider = {
  id: 'eversports',
  name: 'Eversports',
  canListAvailability: false,
  canBook: false,
  bookingUrl(venue: Venue): string | null {
    if (venue.providerRef) {
      return `https://www.eversports.ch/s/${venue.providerRef}`;
    }
    // No venue slug yet: fall back to the city search so the link still helps.
    return 'https://www.eversports.ch/l/tennis/zuerich';
  },
};
