import { districtById, districtIdForCoordinates } from '../domain/districts';
import type {
  AvailabilityMask,
  BackhandStyle,
  Gender,
  Intensity,
  Intent,
  InterclubLevel,
  Player,
  PlayFormat,
  RallyConsistency,
  Skill,
  Surface,
  SwissClassification,
} from '../domain/types';

/**
 * Flat form state for the onboarding wizard and the profile editor.
 *
 * Kept separate from `Player` on purpose: a form holds half-finished,
 * string-shaped input, while `Player` is the validated thing the matching
 * algorithm consumes. Mixing the two is how "birthYear: NaN" ends up in a
 * database.
 */
export interface ProfileForm {
  firstName: string;
  birthYearText: string;
  gender: Gender;
  districtId: string;
  radiusKm: number;

  classification: SwissClassification | 'unclassified';
  yearsPlaying: number;
  interclub: InterclubLevel;
  rallyConsistency: RallyConsistency;
  selfRating: number;

  formats: PlayFormat[];
  intensity: Intensity;
  surfaces: Surface[];
  backhand: BackhandStyle;
  strengths: Skill[];
  weaknesses: Skill[];

  availability: AvailabilityMask;
  venueIds: string[];

  intent: Intent;
  seeking: Gender[];
  ageMin: number;
  ageMax: number;

  bio: string;
  hasCourtAccess: boolean;
}

export const EMPTY_FORM: ProfileForm = {
  firstName: '',
  birthYearText: '',
  gender: 'male',
  districtId: 'k4',
  radiusKm: 8,

  classification: 'unclassified',
  yearsPlaying: 2,
  interclub: 'none',
  rallyConsistency: 'from5to10',
  selfRating: 3,

  formats: ['singles', 'rally'],
  intensity: 'casual',
  surfaces: ['clay'],
  backhand: 'twoHanded',
  strengths: [],
  weaknesses: [],

  availability: 0,
  venueIds: [],

  intent: 'tennisOnly',
  seeking: ['female', 'male', 'other'],
  ageMin: 25,
  ageMax: 50,

  bio: '',
  hasCourtAccess: false,
};

export function formFromPlayer(player: Player): ProfileForm {
  return {
    firstName: player.firstName,
    birthYearText: String(player.birthYear),
    gender: player.gender,
    districtId: districtIdForCoordinates(player.lat, player.lon),
    radiusKm: player.radiusKm,

    classification: player.level.classification ?? 'unclassified',
    yearsPlaying: player.level.yearsPlaying,
    interclub: player.level.interclub,
    rallyConsistency: player.level.rallyConsistency,
    selfRating: player.level.selfRating ?? 3,

    formats: player.formats,
    intensity: player.intensity,
    surfaces: player.surfaces,
    backhand: player.backhand,
    strengths: player.strengths,
    weaknesses: player.weaknesses,

    availability: player.availability,
    venueIds: player.venueIds,

    intent: player.intent,
    seeking: player.seeking,
    ageMin: player.ageMin,
    ageMax: player.ageMax,

    bio: player.bio,
    hasCourtAccess: player.hasCourtAccess,
  };
}

const MIN_AGE = 18;
const MAX_AGE = 100;

export function currentYear(now = new Date()): number {
  return now.getFullYear();
}

/** Validation messages per wizard step, keyed by step id. */
export function validateStep(
  step: string,
  form: ProfileForm,
  now = new Date(),
): string | null {
  switch (step) {
    case 'basics': {
      if (form.firstName.trim().length < 2) return 'Bitte einen Vornamen eingeben.';
      const year = Number(form.birthYearText);
      if (!Number.isInteger(year)) return 'Bitte ein Geburtsjahr eingeben.';
      const age = currentYear(now) - year;
      if (age < MIN_AGE) return 'Die App ist ab 18 Jahren.';
      if (age > MAX_AGE) return 'Bitte ein gültiges Geburtsjahr eingeben.';
      return null;
    }
    case 'style':
      return form.formats.length === 0 ? 'Mindestens eine Spielform wählen.' : null;
    case 'availability':
      return form.availability === 0
        ? 'Mindestens ein Zeitfenster wählen — sonst findet dich niemand.'
        : null;
    case 'intent':
      return form.seeking.length === 0 ? 'Mindestens eine Auswahl treffen.' : null;
    default:
      return null;
  }
}

/**
 * Turns validated form state into a `Player`.
 *
 * The self rating is only carried over for unclassified players: for anyone with
 * a classification it is noise that would dilute a reliable signal.
 */
export function playerFromForm(
  form: ProfileForm,
  options: { id: string; createdAt?: string },
): Player {
  const district = districtById(form.districtId) ?? {
    id: 'k1',
    name: 'Zürich',
    lat: 47.3769,
    lon: 8.5417,
  };
  const classification = form.classification === 'unclassified' ? null : form.classification;

  return {
    id: options.id,
    firstName: form.firstName.trim(),
    birthYear: Number(form.birthYearText),
    gender: form.gender,
    photos: [],
    bio: form.bio.trim(),
    neighbourhood: district.name,
    lat: district.lat,
    lon: district.lon,
    radiusKm: form.radiusKm,
    level: {
      classification,
      yearsPlaying: form.yearsPlaying,
      interclub: form.interclub,
      rallyConsistency: form.rallyConsistency,
      selfRating: classification === null ? form.selfRating : null,
    },
    formats: form.formats,
    intensity: form.intensity,
    surfaces: form.surfaces,
    backhand: form.backhand,
    strengths: form.strengths,
    weaknesses: form.weaknesses,
    availability: form.availability,
    venueIds: form.venueIds,
    intent: form.intent,
    seeking: form.seeking,
    ageMin: form.ageMin,
    ageMax: form.ageMax,
    hasCourtAccess: form.hasCourtAccess,
    languages: ['de'],
    createdAt: options.createdAt ?? new Date().toISOString(),
  };
}
