import type { ImageSourcePropType } from 'react-native';

/**
 * Photos are stored as plain strings on `Player.photos`, which is what a real
 * profile holds: a URL from Supabase Storage, or a local file URI straight out
 * of the image picker.
 *
 * The seeded Zurich profiles need something to show too, so they reference
 * bundled placeholder images through a `seed:` prefix. These are deliberately
 * abstract — coloured shapes, no faces — because inventing portraits for
 * fictional people is a bad idea, and the point of the demo is to show that
 * the card layout works with and without a photo.
 */
const SEED_PHOTOS: Record<string, ImageSourcePropType> = {
  'seed:1': require('../../assets/seed/1.png'),
  'seed:2': require('../../assets/seed/2.png'),
  'seed:3': require('../../assets/seed/3.png'),
  'seed:4': require('../../assets/seed/4.png'),
  'seed:5': require('../../assets/seed/5.png'),
  'seed:6': require('../../assets/seed/6.png'),
};

export function isSeedPhoto(photo: string): boolean {
  return photo.startsWith('seed:');
}

/** Resolves a stored photo string to something `<Image>` can render. */
export function photoSource(photo: string): ImageSourcePropType {
  return SEED_PHOTOS[photo] ?? { uri: photo };
}
