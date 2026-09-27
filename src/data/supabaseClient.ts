import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import 'react-native-url-polyfill/auto';

/**
 * Supabase is optional: without credentials the app runs entirely on the local
 * repository. That keeps the demo working and means a new contributor does not
 * need a backend account to start.
 *
 * Put these in a `.env` file (see .env.example) — they are public anon keys by
 * design; all real authorisation happens in the row level security policies.
 */
const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(url && anonKey);

let cached: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
  if (!isSupabaseConfigured) {
    throw new Error(
      'Supabase ist nicht konfiguriert. EXPO_PUBLIC_SUPABASE_URL und ' +
        'EXPO_PUBLIC_SUPABASE_ANON_KEY in .env setzen.',
    );
  }
  if (!cached) {
    cached = createClient(url as string, anonKey as string, {
      auth: {
        storage: AsyncStorage,
        autoRefreshToken: true,
        persistSession: true,
        // React Native has no URL bar for the OAuth callback to land in.
        detectSessionInUrl: false,
      },
    });
  }
  return cached;
}
