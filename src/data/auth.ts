import * as AppleAuthentication from 'expo-apple-authentication';
import * as Crypto from 'expo-crypto';
import { Platform } from 'react-native';
import { AuthCancelled, type AuthClient, type AuthUser } from './authTypes';
import { LocalAuth } from './localAuth';
import type { KeyValueStore } from './store';
import { getSupabase, isSupabaseConfigured } from './supabaseClient';

export { AuthCancelled } from './authTypes';
export type { AuthClient, AuthUser } from './authTypes';
export { LocalAuth } from './localAuth';

// ---------------------------------------------------------------------------
// Supabase
// ---------------------------------------------------------------------------

export class SupabaseAuth implements AuthClient {
  readonly kind = 'supabase' as const;
  /** A real backend means real profiles; anonymous ones are a moderation hole. */
  readonly guestAvailable = false;

  private get client() {
    return getSupabase();
  }

  async isAppleAvailable(): Promise<boolean> {
    if (Platform.OS !== 'ios') return false;
    return AppleAuthentication.isAvailableAsync();
  }

  async current(): Promise<AuthUser | null> {
    const { data, error } = await this.client.auth.getUser();
    if (error || !data.user) return null;
    return { id: data.user.id, email: data.user.email ?? null, isGuest: false };
  }

  async signInWithApple(): Promise<AuthUser> {
    // Apple receives the hash, Supabase verifies against the raw value. Sending
    // the same string to both would let a stolen token be replayed.
    const rawNonce = Crypto.randomUUID();
    const hashedNonce = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      rawNonce,
    );

    let credential: AppleAuthentication.AppleAuthenticationCredential;
    try {
      credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
        nonce: hashedNonce,
      });
    } catch (error) {
      if ((error as { code?: string }).code === 'ERR_REQUEST_CANCELED') {
        throw new AuthCancelled();
      }
      throw error;
    }

    if (!credential.identityToken) {
      throw new Error('Apple hat kein Identitätstoken geliefert.');
    }

    const { data, error } = await this.client.auth.signInWithIdToken({
      provider: 'apple',
      token: credential.identityToken,
      nonce: rawNonce,
    });
    if (error) throw new Error(error.message);
    if (!data.user) throw new Error('Anmeldung fehlgeschlagen.');

    return { id: data.user.id, email: data.user.email ?? null, isGuest: false };
  }

  async requestEmailCode(email: string): Promise<void> {
    const { error } = await this.client.auth.signInWithOtp({
      email: email.trim().toLowerCase(),
      options: { shouldCreateUser: true },
    });
    if (error) throw new Error(error.message);
  }

  async verifyEmailCode(email: string, code: string): Promise<AuthUser> {
    const { data, error } = await this.client.auth.verifyOtp({
      email: email.trim().toLowerCase(),
      token: code.trim(),
      type: 'email',
    });
    if (error) throw new Error(error.message);
    if (!data.user) throw new Error('Code konnte nicht bestätigt werden.');
    return { id: data.user.id, email: data.user.email ?? null, isGuest: false };
  }

  async continueAsGuest(): Promise<AuthUser> {
    throw new Error('Gastzugang ist mit Backend nicht verfügbar.');
  }

  async signOut(): Promise<void> {
    const { error } = await this.client.auth.signOut();
    if (error) throw new Error(error.message);
  }

  async deleteAccount(): Promise<void> {
    // Runs server-side: the profile, swipes, matches, messages and photos all
    // hang off the user row and go with it. See migration 0004.
    const { error } = await this.client.rpc('delete_own_account');
    if (error) throw new Error(error.message);
    await this.client.auth.signOut();
  }
}

let cached: AuthClient | null = null;

export function getAuth(store: KeyValueStore): AuthClient {
  if (!cached) {
    cached = isSupabaseConfigured ? new SupabaseAuth() : new LocalAuth(store);
  }
  return cached;
}
