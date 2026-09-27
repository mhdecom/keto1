const EARTH_RADIUS_KM = 6371;

export interface Coordinates {
  lat: number;
  lon: number;
}

const toRadians = (degrees: number) => (degrees * Math.PI) / 180;

/** Great-circle distance in kilometres. */
export function distanceKm(a: Coordinates, b: Coordinates): number {
  const dLat = toRadians(b.lat - a.lat);
  const dLon = toRadians(b.lon - a.lon);
  const lat1 = toRadians(a.lat);
  const lat2 = toRadians(b.lat);

  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(h)));
}

/**
 * Proximity score from 0 to 1. Zurich is only about 10 km across, so the
 * tolerance is deliberately tight — a 5 km trip across town with a racket bag
 * is a real obstacle for a weekday evening hit.
 */
export function proximityScore(km: number, toleranceKm = 5): number {
  return Math.exp(-((km / toleranceKm) ** 2));
}
