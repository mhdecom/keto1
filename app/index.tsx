import { Redirect } from 'expo-router';
import React from 'react';
import { Loading } from '../src/components/ui';
import { useSession } from '../src/state/session';

/**
 * Gate: sign in, then build a profile, then the deck. Kept in one place so the
 * three states cannot contradict each other.
 */
export default function Index() {
  const { ready, user, me } = useSession();
  if (!ready) return <Loading label="Moment…" />;
  if (!user) return <Redirect href="/sign-in" />;
  if (!me) return <Redirect href="/onboarding" />;
  return <Redirect href="/(tabs)" />;
}
