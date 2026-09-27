import { Redirect } from 'expo-router';
import React from 'react';
import { Loading } from '../src/components/ui';
import { useSession } from '../src/state/session';

/** Gate: straight to the deck if a profile exists, otherwise onboarding. */
export default function Index() {
  const { ready, me } = useSession();
  if (!ready) return <Loading label="Lade Profil…" />;
  return <Redirect href={me ? '/(tabs)' : '/onboarding'} />;
}
