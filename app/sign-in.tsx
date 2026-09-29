import * as AppleAuthentication from 'expo-apple-authentication';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Linking, View } from 'react-native';
import {
  Body,
  Button,
  Caption,
  Display,
  Input,
  Label,
  Screen,
  Stack,
  Title,
} from '../src/components/ui';
import { AuthCancelled } from '../src/data/auth';
import { useSession } from '../src/state/session';
import { useTheme } from '../src/theme';

const PRIVACY_URL = 'https://itsamatch.ch/datenschutz';

export default function SignIn() {
  const theme = useTheme();
  const router = useRouter();
  const { auth, refreshUser } = useSession();

  const [appleAvailable, setAppleAvailable] = useState(false);
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [codeSent, setCodeSent] = useState(false);
  const [busy, setBusy] = useState<null | 'apple' | 'code' | 'verify' | 'guest'>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void auth.isAppleAvailable().then((available) => {
      if (!cancelled) setAppleAvailable(available);
    });
    return () => {
      cancelled = true;
    };
  }, [auth]);

  const done = async () => {
    await refreshUser();
    router.replace('/');
  };

  const run = async (kind: NonNullable<typeof busy>, action: () => Promise<unknown>) => {
    setBusy(kind);
    setError(null);
    try {
      await action();
    } catch (problem) {
      // A cancelled Apple sheet is a normal thing to do, not an error to shout about.
      if (problem instanceof AuthCancelled) return;
      setError(problem instanceof Error ? problem.message : 'Etwas ist schiefgelaufen.');
    } finally {
      setBusy(null);
    }
  };

  return (
    <Screen scroll>
      <Stack gap={6} style={{ paddingTop: theme.spacing(14) }}>
        <Stack gap={3}>
          <Display>It’s a Match</Display>
          <Title tone="soft">Finde in Zürich jemanden, der zu deinem Spiel passt.</Title>
        </Stack>

        {appleAvailable ? (
          <Stack gap={2}>
            <AppleAuthentication.AppleAuthenticationButton
              buttonType={AppleAuthentication.AppleAuthenticationButtonType.CONTINUE}
              buttonStyle={
                theme.dark
                  ? AppleAuthentication.AppleAuthenticationButtonStyle.WHITE
                  : AppleAuthentication.AppleAuthenticationButtonStyle.BLACK
              }
              cornerRadius={theme.radius.pill}
              style={{ height: 48 }}
              onPress={() => void run('apple', async () => {
                await auth.signInWithApple();
                await done();
              })}
            />
          </Stack>
        ) : null}

        <Stack gap={3}>
          <Label>{appleAvailable ? 'Oder per E-Mail' : 'Per E-Mail'}</Label>
          {codeSent ? (
            <Stack gap={3}>
              <Body tone="soft">
                Wir haben einen sechsstelligen Code an {email} geschickt.
              </Body>
              <Input
                value={code}
                onChangeText={setCode}
                placeholder="123456"
                keyboardType="number-pad"
                maxLength={6}
              />
              <Button
                label="Anmelden"
                loading={busy === 'verify'}
                disabled={code.trim().length < 6}
                onPress={() => void run('verify', async () => {
                  await auth.verifyEmailCode(email, code);
                  await done();
                })}
              />
              <Button
                label="Andere E-Mail verwenden"
                variant="ghost"
                onPress={() => {
                  setCodeSent(false);
                  setCode('');
                  setError(null);
                }}
              />
            </Stack>
          ) : (
            <Stack gap={3}>
              <Input
                value={email}
                onChangeText={setEmail}
                placeholder="du@example.ch"
                maxLength={120}
              />
              <Button
                label="Code senden"
                loading={busy === 'code'}
                disabled={!email.includes('@')}
                onPress={() => void run('code', async () => {
                  await auth.requestEmailCode(email);
                  setCodeSent(true);
                })}
              />
            </Stack>
          )}
        </Stack>

        {auth.guestAvailable ? (
          <Stack gap={2}>
            <Button
              label="Ohne Konto ansehen"
              variant="secondary"
              loading={busy === 'guest'}
              onPress={() => void run('guest', async () => {
                await auth.continueAsGuest();
                await done();
              })}
            />
            <Caption tone="muted">
              Demo-Modus: alles bleibt auf diesem Gerät, du siehst Zürcher Testprofile. Ohne
              Backend gibt es keine echten Nutzer.
            </Caption>
          </Stack>
        ) : null}

        {error ? <Body tone="danger">{error}</Body> : null}

        <View style={{ gap: theme.spacing(2), paddingTop: theme.spacing(4) }}>
          <Caption tone="muted">Ab 18 Jahren.</Caption>
          <Caption tone="muted" onPress={() => void Linking.openURL(PRIVACY_URL)}>
            Mit der Anmeldung akzeptierst du die Datenschutzerklärung.
          </Caption>
        </View>
      </Stack>
    </Screen>
  );
}
