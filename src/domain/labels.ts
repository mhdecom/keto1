import {
  AFTER_PLAY,
  BACKHAND_STYLES,
  GENDERS,
  INDUSTRIES,
  INTERESTS,
  INTENSITIES,
  INTENTS,
  INTERCLUB_LEVELS,
  PLAY_FORMATS,
  RALLY_CONSISTENCY,
  REPORT_REASONS,
  SKILLS,
  SURFACES,
  type AfterPlay,
  type BackhandStyle,
  type Gender,
  type Industry,
  type Interest,
  type Intensity,
  type Intent,
  type InterclubLevel,
  type PlayFormat,
  type RallyConsistency,
  type ReportReason,
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

export const INDUSTRY_LABELS: Record<Industry, string> = {
  tech: 'IT & Software',
  finance: 'Finanzen & Versicherung',
  health: 'Gesundheit & Medizin',
  pharma: 'Pharma & Life Sciences',
  science: 'Forschung & Wissenschaft',
  law: 'Recht',
  consulting: 'Beratung',
  marketing: 'Marketing & Kommunikation',
  education: 'Bildung',
  engineering: 'Ingenieurwesen & Bau',
  creative: 'Kreativ & Design',
  publicSector: 'Öffentlicher Dienst',
  hospitality: 'Gastronomie & Hotellerie',
  trades: 'Handwerk & Gewerbe',
  retail: 'Handel & Verkauf',
  entrepreneur: 'Selbstständig & Startup',
  student: 'Studium',
  retired: 'Pensioniert',
  other: 'Anderes',
};

export const INTEREST_LABELS: Record<Interest, string> = {
  food: 'Essen & Kochen',
  wine: 'Wein & Apéro',
  travel: 'Reisen',
  music: 'Musik & Konzerte',
  art: 'Kunst & Museen',
  film: 'Film & Serien',
  books: 'Lesen',
  theatre: 'Theater & Bühne',
  photography: 'Fotografie',
  running: 'Laufen',
  skiing: 'Ski & Snowboard',
  hiking: 'Wandern & Berge',
  cycling: 'Velo',
  swimming: 'Schwimmen & See',
  fitness: 'Kraft & Fitness',
  yoga: 'Yoga & Meditation',
  startups: 'Startups & Unternehmertum',
  investing: 'Anlegen & Märkte',
  technology: 'Technologie & KI',
  science: 'Wissenschaft',
  politics: 'Politik & Gesellschaft',
  languages: 'Sprachen',
  family: 'Familie',
  pets: 'Hunde & Tiere',
  gaming: 'Gaming',
  volunteering: 'Ehrenamt',
};

export const AFTER_PLAY_LABELS: Record<AfterPlay, string> = {
  drink: 'Apéro danach',
  meal: 'Zusammen essen',
  networking: 'Beruflicher Austausch',
};

export const AFTER_PLAY_HINTS: Record<AfterPlay, string> = {
  drink: 'Nach dem Spiel noch etwas trinken.',
  meal: 'Auch mal zusammen essen gehen.',
  networking: 'Offen dafür, dass beruflich etwas daraus entsteht.',
};

export const REPORT_REASON_LABELS: Record<ReportReason, string> = {
  harassment: 'Belästigung oder Beleidigung',
  fakeProfile: 'Gefälschtes Profil',
  inappropriatePhotos: 'Unangemessene Bilder',
  noShow: 'Nicht erschienen',
  underage: 'Vermutlich minderjährig',
  other: 'Anderes',
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
export const INDUSTRY_OPTIONS = options(INDUSTRIES, INDUSTRY_LABELS);
export const INTEREST_OPTIONS = options(INTERESTS, INTEREST_LABELS);
export const AFTER_PLAY_OPTIONS = options(AFTER_PLAY, AFTER_PLAY_LABELS);
export const REPORT_REASON_OPTIONS = options(REPORT_REASONS, REPORT_REASON_LABELS);
export const SEEKING_OPTIONS = options(GENDERS, SEEKING_LABELS);
