/**
 * The authentication contract.
 *
 * Deliberately free of React Native and Expo imports so the local
 * implementation can be unit tested without a bundler: `react-native` ships
 * Flow-typed source that a plain test runner cannot parse.
 */

export interface AuthUser {
  id: string;
  email: string | null;
  /** True for the local demo identity, which has no backend account. */
  isGuest: boolean;
}

/**
 * Sign-in, sign-out and account deletion.
 *
 * Two providers, chosen the same way the repository is: Supabase when it is
 * configured, a local demo identity otherwise. Everything above this file works
 * against the interface and never learns which one is running.
 *
 * Only Apple and e-mail are offered. Apple's Guideline 4.8 requires Sign in
 * with Apple as soon as any *other* third-party login is present — offering
 * Apple plus a plain e-mail code sidesteps that entirely, needs no OAuth
 * client registration, and works on Android too, where Apple sign-in is not
 * available.
 */
export interface AuthClient {
  readonly kind: 'supabase' | 'local';
  /** Whether the Sign in with Apple button can be shown on this device. */
  isAppleAvailable(): Promise<boolean>;
  /** Whether "continue without an account" makes sense here. */
  readonly guestAvailable: boolean;

  current(): Promise<AuthUser | null>;
  signInWithApple(): Promise<AuthUser>;
  requestEmailCode(email: string): Promise<void>;
  verifyEmailCode(email: string, code: string): Promise<AuthUser>;
  continueAsGuest(): Promise<AuthUser>;
  signOut(): Promise<void>;
  /**
   * Permanently removes the account and everything attached to it.
   * Required by App Store Guideline 5.1.1(v) for any app with sign-up.
   */
  deleteAccount(): Promise<void>;
}

export class AuthCancelled extends Error {
  constructor() {
    super('Anmeldung abgebrochen');
    this.name = 'AuthCancelled';
  }
}
