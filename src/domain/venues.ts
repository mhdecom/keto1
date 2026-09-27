import type { Venue } from './types';

/**
 * Public and semi-public tennis venues in and around Zurich.
 *
 * The eight Sportamt facilities are the backbone of public tennis in the city
 * (around 40 clay courts in total) and all of them are reservable through
 * GotCourts.
 *
 * NOTE: the coordinates below are approximate, taken from the facility
 * addresses rather than surveyed. They are good enough for distance-based
 * matching within a city but must be verified before anything navigational is
 * built on top of them.
 */
export const VENUES: Venue[] = [
  {
    id: 'mythenquai',
    name: 'TA Mythenquai',
    operator: 'Sportamt Stadt Zürich',
    courts: 3,
    surface: 'clay',
    lat: 47.345,
    lon: 8.534,
    provider: 'gotcourts',
    providerRef: 'mythenquai-sportamt',
    floodlight: true,
    yearRound: false,
  },
  {
    id: 'hardhof',
    name: 'TA Hardhof',
    operator: 'Sportamt Stadt Zürich',
    courts: 8,
    surface: 'clay',
    lat: 47.393,
    lon: 8.488,
    provider: 'gotcourts',
    providerRef: 'hardhof-sportamt',
    floodlight: false,
    yearRound: false,
  },
  {
    id: 'buchlern',
    name: 'TA Buchlern',
    operator: 'Sportamt Stadt Zürich',
    courts: 6,
    surface: 'clay',
    lat: 47.373,
    lon: 8.489,
    provider: 'gotcourts',
    providerRef: 'buchlern-sportamt',
    floodlight: true,
    yearRound: false,
  },
  {
    id: 'frauental',
    name: 'TA Frauental',
    operator: 'Sportamt Stadt Zürich',
    courts: 6,
    surface: 'clay',
    lat: 47.36,
    lon: 8.506,
    provider: 'gotcourts',
    providerRef: 'frauental-sportamt',
    floodlight: false,
    yearRound: true,
  },
  {
    id: 'lengg',
    name: 'TA Lengg',
    operator: 'Sportamt Stadt Zürich',
    courts: 4,
    surface: 'clay',
    lat: 47.354,
    lon: 8.572,
    provider: 'gotcourts',
    providerRef: 'lengg-sportamt',
    floodlight: false,
    yearRound: true,
  },
  {
    id: 'eichrain',
    name: 'TA Eichrain',
    operator: 'Sportamt Stadt Zürich',
    courts: 4,
    surface: 'clay',
    lat: 47.418,
    lon: 8.543,
    provider: 'gotcourts',
    providerRef: 'eichrain-sportamt',
    floodlight: true,
    yearRound: false,
  },
  {
    id: 'fronwald',
    name: 'TA Fronwald',
    operator: 'Sportamt Stadt Zürich',
    courts: 4,
    surface: 'clay',
    lat: 47.419,
    lon: 8.506,
    provider: 'gotcourts',
    providerRef: 'fronwald-sportamt',
    floodlight: true,
    yearRound: false,
  },
  {
    id: 'sonnenberg',
    name: 'TA Sonnenberg',
    operator: 'Sportamt Stadt Zürich',
    courts: 5,
    surface: 'clay',
    lat: 47.373,
    lon: 8.57,
    provider: 'gotcourts',
    providerRef: 'sonnenberg-sportamt',
    floodlight: false,
    yearRound: true,
  },
  {
    id: 'asvz',
    name: 'ASVZ Zürich (Fluntern)',
    operator: 'ASVZ',
    courts: 6,
    surface: 'clay',
    lat: 47.379,
    lon: 8.551,
    provider: 'gotcourts',
    providerRef: 'asvz-zuerich',
    floodlight: true,
    yearRound: false,
  },
  {
    id: 'saalsporthalle',
    name: 'Tennishalle Brunau',
    operator: 'privat',
    courts: 4,
    surface: 'indoor',
    lat: 47.343,
    lon: 8.526,
    provider: 'eversports',
    floodlight: true,
    yearRound: true,
  },
];

export const VENUE_BY_ID: Record<string, Venue> = Object.fromEntries(
  VENUES.map((venue) => [venue.id, venue]),
);

export const VENUE_NAMES: Record<string, string> = Object.fromEntries(
  VENUES.map((venue) => [venue.id, venue.name]),
);

export function venueName(id: string): string {
  return VENUE_NAMES[id] ?? id;
}
