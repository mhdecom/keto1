/**
 * Zurich city districts with approximate centre coordinates.
 *
 * Asking for a district instead of a street address is a deliberate privacy
 * choice: it is precise enough to rank matches within a city and to tell
 * someone "4 km away", and it does not reveal where anybody lives.
 */
export interface District {
  id: string;
  name: string;
  lat: number;
  lon: number;
}

export const DISTRICTS: District[] = [
  { id: 'k1', name: 'Kreis 1 (Altstadt)', lat: 47.372, lon: 8.541 },
  { id: 'k2', name: 'Kreis 2 (Enge/Wollishofen)', lat: 47.355, lon: 8.531 },
  { id: 'k3', name: 'Kreis 3 (Wiedikon)', lat: 47.365, lon: 8.512 },
  { id: 'k4', name: 'Kreis 4 (Langstrasse)', lat: 47.376, lon: 8.526 },
  { id: 'k5', name: 'Kreis 5 (Industriequartier)', lat: 47.387, lon: 8.523 },
  { id: 'k6', name: 'Kreis 6 (Unterstrass/Oberstrass)', lat: 47.392, lon: 8.54 },
  { id: 'k7', name: 'Kreis 7 (Hottingen/Witikon)', lat: 47.371, lon: 8.564 },
  { id: 'k8', name: 'Kreis 8 (Seefeld)', lat: 47.36, lon: 8.552 },
  { id: 'k9', name: 'Kreis 9 (Altstetten/Albisrieden)', lat: 47.388, lon: 8.487 },
  { id: 'k10', name: 'Kreis 10 (Höngg/Wipkingen)', lat: 47.402, lon: 8.497 },
  { id: 'k11', name: 'Kreis 11 (Oerlikon/Seebach)', lat: 47.41, lon: 8.545 },
  { id: 'k12', name: 'Kreis 12 (Schwamendingen)', lat: 47.404, lon: 8.572 },
  { id: 'winterthur', name: 'Winterthur', lat: 47.5, lon: 8.724 },
  { id: 'zug', name: 'Zug', lat: 47.172, lon: 8.517 },
  { id: 'baden', name: 'Baden', lat: 47.476, lon: 8.306 },
  { id: 'umland', name: 'Zürcher Umland', lat: 47.42, lon: 8.6 },
];

export const DISTRICT_OPTIONS = DISTRICTS.map((district) => ({
  value: district.id,
  label: district.name,
}));

export function districtById(id: string): District | undefined {
  return DISTRICTS.find((district) => district.id === id);
}

/** Nearest district to a coordinate, used to preselect on profile edit. */
export function districtIdForCoordinates(lat: number, lon: number): string {
  let bestId = DISTRICTS[0].id;
  let bestDistance = Infinity;
  for (const district of DISTRICTS) {
    const distance = (district.lat - lat) ** 2 + (district.lon - lon) ** 2;
    if (distance < bestDistance) {
      bestDistance = distance;
      bestId = district.id;
    }
  }
  return bestId;
}
