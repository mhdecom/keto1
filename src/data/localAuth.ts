import type { AuthClient, AuthUser } from './authTypes';
import type { KeyValueStore } from './store';

/**
 * The local demo identity, used when no backend is configured. No platform
 * imports, so it is directly unit testable.
 */
const GUEST_KEY = 'tt:guest';

export class LocalAuth implements AuthClient {
  readonly kind = 'local' as const;
  readonly guestAvailable = true;

  constructor(private readonly store: KeyValueStore) {}

  async isAppleAvailable(): Promise<boolean> {
    return false;
  }

  async current(): Promise<AuthUser | null> {
    const raw = await this.store.get(GUEST_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as AuthUser;
    } catch {
      return null;
    }
  }

  async signInWithApple(): Promise<AuthUser> {
    throw new Error('Ohne Supabase-Backend ist die Apple-Anmeldung nicht verfügbar.');
  }

  async requestEmailCode(): Promise<void> {
    throw new Error('Ohne Supabase-Backend ist die E-Mail-Anmeldung nicht verfügbar.');
  }

  async verifyEmailCode(): Promise<AuthUser> {
    throw new Error('Ohne Supabase-Backend ist die E-Mail-Anmeldung nicht verfügbar.');
  }

  async continueAsGuest(): Promise<AuthUser> {
    const existing = await this.current();
    if (existing) return existing;
    const user: AuthUser = { id: 'guest', email: null, isGuest: true };
    await this.store.set(GUEST_KEY, JSON.stringify(user));
    return user;
  }

  async signOut(): Promise<void> {
    await this.store.remove(GUEST_KEY);
  }

  async deleteAccount(): Promise<void> {
    await this.store.remove(GUEST_KEY);
  }
}
