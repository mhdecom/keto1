import AsyncStorage from '@react-native-async-storage/async-storage';
import { LocalRepository } from './localRepository';
import type { Repository } from './repository';
import type { KeyValueStore } from './store';
import { getSupabase, isSupabaseConfigured } from './supabaseClient';
import { SupabaseRepository } from './supabaseRepository';

const asyncStorageStore: KeyValueStore = {
  get: (key) => AsyncStorage.getItem(key),
  set: (key, value) => AsyncStorage.setItem(key, value),
  remove: (key) => AsyncStorage.removeItem(key),
};

let cached: Repository | null = null;

/**
 * Picks the backend once per app start: Supabase when credentials are present,
 * the local seeded repository otherwise. Every screen talks to the interface,
 * so nothing else in the app knows or cares which one is active.
 */
export function getRepository(): Repository {
  if (!cached) {
    cached = isSupabaseConfigured
      ? new SupabaseRepository(getSupabase())
      : new LocalRepository(asyncStorageStore);
  }
  return cached;
}

export const backendName = isSupabaseConfigured ? 'Supabase' : 'Lokal (Demo)';

export { LocalRepository } from './localRepository';
export type { NewPlayRequest, Repository } from './repository';
export { SupabaseRepository } from './supabaseRepository';
