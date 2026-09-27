import { useColorScheme } from 'react-native';

/**
 * Palette taken from the game itself: clay, court green and ball yellow. It
 * keeps the product visually distinct from the pink-gradient dating-app default,
 * which matters because most users here want a hitting partner, not a date.
 */
const palette = {
  clay: '#C2593A',
  clayDark: '#9E432A',
  clayLight: '#E9B8A6',
  court: '#0B3D2C',
  courtMid: '#14573F',
  courtLight: '#3E8468',
  ball: '#D4E34B',
  ballDark: '#A9B72E',
  white: '#FFFFFF',
  sand: '#FBF8F4',
  sandDeep: '#F1EAE1',
  ink: '#1A1714',
  inkSoft: '#514A42',
  inkMuted: '#8A8078',
  night: '#12100E',
  nightRaised: '#1E1B18',
  nightBorder: '#332E29',
  danger: '#C0392B',
  success: '#2E8B57',
} as const;

export interface Theme {
  dark: boolean;
  colors: {
    background: string;
    surface: string;
    surfaceRaised: string;
    border: string;
    text: string;
    textSoft: string;
    textMuted: string;
    primary: string;
    onPrimary: string;
    accent: string;
    onAccent: string;
    like: string;
    pass: string;
    danger: string;
    success: string;
  };
  spacing: (steps: number) => number;
  radius: { sm: number; md: number; lg: number; pill: number };
  font: {
    display: number;
    title: number;
    body: number;
    small: number;
    tiny: number;
  };
}

const shared = {
  spacing: (steps: number) => steps * 4,
  radius: { sm: 8, md: 14, lg: 22, pill: 999 },
  font: { display: 32, title: 20, body: 15, small: 13, tiny: 11 },
} as const;

export const lightTheme: Theme = {
  dark: false,
  colors: {
    background: palette.sand,
    surface: palette.white,
    surfaceRaised: palette.white,
    border: palette.sandDeep,
    text: palette.ink,
    textSoft: palette.inkSoft,
    textMuted: palette.inkMuted,
    primary: palette.court,
    onPrimary: palette.white,
    accent: palette.clay,
    onAccent: palette.white,
    like: palette.courtMid,
    pass: palette.inkMuted,
    danger: palette.danger,
    success: palette.success,
  },
  ...shared,
};

export const darkTheme: Theme = {
  dark: true,
  colors: {
    background: palette.night,
    surface: palette.nightRaised,
    surfaceRaised: '#262220',
    border: palette.nightBorder,
    text: '#F5F1EC',
    textSoft: '#BDB4AB',
    textMuted: '#8A8078',
    primary: palette.ball,
    onPrimary: palette.court,
    accent: palette.clayLight,
    onAccent: palette.night,
    like: palette.ball,
    pass: palette.inkMuted,
    danger: '#E0695C',
    success: '#57C98A',
  },
  ...shared,
};

export function useTheme(): Theme {
  return useColorScheme() === 'dark' ? darkTheme : lightTheme;
}

export { palette };
