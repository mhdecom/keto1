import { describe, expect, it } from 'vitest';
import { LocalAuth } from '../localAuth';
import { createMemoryStore } from '../store';

describe('LocalAuth', () => {
  it('starts signed out', async () => {
    expect(await new LocalAuth(createMemoryStore()).current()).toBeNull();
  });

  it('creates a guest identity and keeps it across reads', async () => {
    const store = createMemoryStore();
    const auth = new LocalAuth(store);

    const first = await auth.continueAsGuest();
    expect(first.isGuest).toBe(true);
    expect(first.email).toBeNull();

    // A second call must return the same identity, not a new one — otherwise
    // the profile saved under the first id would be orphaned.
    expect(await auth.continueAsGuest()).toEqual(first);
    expect(await new LocalAuth(store).current()).toEqual(first);
  });

  it('signs out', async () => {
    const auth = new LocalAuth(createMemoryStore());
    await auth.continueAsGuest();
    await auth.signOut();
    expect(await auth.current()).toBeNull();
  });

  it('deletes the account', async () => {
    const auth = new LocalAuth(createMemoryStore());
    await auth.continueAsGuest();
    await auth.deleteAccount();
    expect(await auth.current()).toBeNull();
  });

  it('survives a corrupt stored session', async () => {
    const auth = new LocalAuth(createMemoryStore({ 'tt:guest': 'not json' }));
    expect(await auth.current()).toBeNull();
  });

  it('reports that Apple and e-mail need a backend', async () => {
    const auth = new LocalAuth(createMemoryStore());
    expect(await auth.isAppleAvailable()).toBe(false);
    await expect(auth.signInWithApple()).rejects.toThrow(/Supabase/);
    await expect(auth.requestEmailCode()).rejects.toThrow(/Supabase/);
  });

  it('offers guest access, which the backed version must not', async () => {
    expect(new LocalAuth(createMemoryStore()).guestAvailable).toBe(true);
  });
});
