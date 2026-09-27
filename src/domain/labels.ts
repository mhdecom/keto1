import {
  BACKHAND_STYLES,
  GENDERS,
  INTENSITIES,
  INTENTS,
  INTERCLUB_LEVELS,
  PLAY_FORMATS,
  RALLY_CONSISTENCY,
  SKILLS,
  SURFACES,
  type BackhandStyle,
  type Gender,
  type Intensity,
  type Intent,
  type InterclubLevel,
  type PlayFormat,
  type RallyConsistency,
  type Skill,
  type Surface,
} from './types';

/** All user-facing wording lives here so the UI never hardcodes German strings. */

export const FORMAT_LABELS: Record<PlayFormat, string> = {
  singles: 'Einzel',
  doubles: 'Doppel',
  mixed: 'Mixed',
  rally: 'Einspielen',
  matchPractice: 'Matchtraining',
};

export const INTENSITY_LABELS: Record<Intensity, string> = {
  casual: 'Gemütlich',
  ambitious: 'Ambitioniert',
  competitive: 'Wettkampf',
};

export const SURFACE_LABELS: Record<Surface, string> = {
  clay: 'Sand',
  hard: 'Hartplatz',
  indoor: 'Halle',
  carpet: 'Teppich',
};

export const SKILL_LABELS: Record<Skill, string> = {
  forehand: 'Vorhand',
  backhand: 'Rückhand',
  serve: 'Aufschlag',
  return: 'Return',
  volley: 'Volley',
  slice: 'Slice',
  topspin: 'Topspin',
  footwork: 'Beinarbeit',
  stamina: 'Kondition',
  mental: 'Mentales',
  consistency: 'Konstanz',
  tactics: 'Taktik',
};

export const BACKHAND_LABELS: Record<BackhandStyle, string> = {
  oneHanded: 'Einhändig',
  twoHanded: 'Zweihändig',
};

export const RALLY_LABELS: Record<RallyConsistency, string> = {
  under5: 'Unter 5 Bälle',
  from5to10: '5–10 Bälle',
  from10to20: '10–20 Bälle',
  over20: 'Über 20 Bälle',
};

export const INTERCLUB_LABELS: Record<InterclubLevel, string> = {
  none: 'Nie Mannschaft gespielt',
  active: 'Im Club aktiv',
  league4plus: 'Interclub, 4. Liga oder tiefer',
  league1to3: 'Interclub, 1.–3. Liga',
};

export const INTENT_LABELS: Record<Intent, string> = {
  tennisOnly: 'Nur Tennis',
  openToDating: 'Tennis, offen für mehr',
  competitionOnly: 'Match & Liga',
};

export const INTENT_HINTS: Record<Intent, string> = {
  tennisOnly: 'Du suchst Spielpartner. Niemand sieht dich in einem Dating-Kontext.',
  openToDating: 'Wenn die andere Person das ebenfalls angibt, wird der Chat als Date markiert.',
  competitionOnly: 'Du willst Matches zählen, Ranglisten spielen, ernsthaft trainieren.',
};

export const GENDER_LABELS: Record<Gender, string> = {
  female: 'Frau',
  male: 'Mann',
  other: 'Andere',
};

export const SEEKING_LABELS: Record<Gender, string> = {
  female: 'Frauen',
  male: 'Männer',
  other: 'Andere',
};

/** Convenience arrays for ChoiceGroup, in a sensible presentation order. */
const options = <T extends string>(values: readonly T[], labels: Record<T, string>) =>
  values.map((value) => ({ value, label: labels[value] }));

export const FORMAT_OPTIONS = options(PLAY_FORMATS, FORMAT_LABELS);
export const INTENSITY_OPTIONS = options(INTENSITIES, INTENSITY_LABELS);
export const SURFACE_OPTIONS = options(SURFACES, SURFACE_LABELS);
export const SKILL_OPTIONS = options(SKILLS, SKILL_LABELS);
export const BACKHAND_OPTIONS = options(BACKHAND_STYLES, BACKHAND_LABELS);
export const RALLY_OPTIONS = options(RALLY_CONSISTENCY, RALLY_LABELS);
export const INTERCLUB_OPTIONS = options(INTERCLUB_LEVELS, INTERCLUB_LABELS);
export const INTENT_OPTIONS = options(INTENTS, INTENT_LABELS);
export const GENDER_OPTIONS = options(GENDERS, GENDER_LABELS);
export const SEEKING_OPTIONS = options(GENDERS, SEEKING_LABELS);
