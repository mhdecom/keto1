import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Alert } from 'react-native';
import {
  Avatar,
  Body,
  Button,
  Caption,
  Card,
  ChoiceGroup,
  Empty,
  Input,
  Label,
  Loading,
  Row,
  Screen,
  Stack,
  Title,
} from '../../src/components/ui';
import { REPORT_REASON_OPTIONS } from '../../src/domain/labels';
import type { Player, ReportReason } from '../../src/domain/types';
import { useSession } from '../../src/state/session';

const SUPPORT_EMAIL = 'hilfe@itsamatch.ch';

/**
 * Reporting and blocking.
 *
 * Two separate actions on purpose. Blocking is immediate and needs no reason —
 * somebody who wants a person gone should not have to fill in a form first.
 * Reporting is what reaches a human, and it also blocks, because nobody who
 * files a report wants to keep seeing that profile.
 */
export default function ReportPlayer() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { repository, reportPlayer, blockPlayer } = useSession();

  const [player, setPlayer] = useState<Player | null | undefined>(undefined);
  const [reason, setReason] = useState<ReportReason>('harassment');
  const [detail, setDetail] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      if (!id) return;
      const found = await repository.getPlayer(id);
      if (!cancelled) setPlayer(found);
    })();
    return () => {
      cancelled = true;
    };
  }, [id, repository]);

  if (player === undefined) return <Loading />;
  if (!player) return <Empty title="Profil nicht gefunden." />;

  const leave = () => {
    // Back to the deck rather than to the profile we just reported.
    router.dismissAll();
    router.replace('/(tabs)');
  };

  const submitReport = async () => {
    setBusy(true);
    try {
      await reportPlayer(player.id, reason, detail.trim());
      await blockPlayer(player.id);
      Alert.alert(
        'Danke, wir schauen uns das an',
        `${player.firstName} wurde gemeldet und für dich blockiert. Wir melden uns, wenn wir Rückfragen haben.`,
        [{ text: 'OK', onPress: leave }],
      );
    } catch (error) {
      Alert.alert(
        'Melden fehlgeschlagen',
        error instanceof Error ? error.message : 'Unbekannter Fehler',
      );
    } finally {
      setBusy(false);
    }
  };

  const confirmBlock = () => {
    Alert.alert(
      `${player.firstName} blockieren?`,
      'Ihr seht euch gegenseitig nicht mehr, und ein bestehendes Match wird aufgelöst. Die Person erfährt davon nichts.',
      [
        { text: 'Abbrechen', style: 'cancel' },
        {
          text: 'Blockieren',
          style: 'destructive',
          onPress: () => void blockPlayer(player.id).then(leave),
        },
      ],
    );
  };

  return (
    <Screen scroll>
      <Stack gap={5} style={{ paddingTop: 12 }}>
        <Row gap={3}>
          <Avatar name={player.firstName} size={48} photo={player.photos[0]} />
          <Title>{player.firstName}</Title>
        </Row>

        <Card>
          <Stack gap={3}>
            <Label>Sofort blockieren</Label>
            <Body tone="soft">
              Ohne Begründung, ohne Wartezeit. Ihr verschwindet füreinander aus Deck, Matches
              und Anfragen.
            </Body>
            <Button label="Blockieren" variant="secondary" onPress={confirmBlock} />
          </Stack>
        </Card>

        <Stack gap={3}>
          <Label>Melden</Label>
          <Body tone="soft">
            Ein Mensch schaut sich das an. Melden blockiert die Person gleichzeitig.
          </Body>
          <ChoiceGroup
            options={REPORT_REASON_OPTIONS}
            value={[reason]}
            onChange={([next]) => next && setReason(next)}
          />
        </Stack>

        <Stack gap={2}>
          <Label>Was ist passiert? (optional)</Label>
          <Input
            value={detail}
            onChangeText={setDetail}
            placeholder="Je konkreter, desto schneller können wir handeln."
            multiline
            maxLength={1000}
          />
        </Stack>

        <Button label="Melden und blockieren" loading={busy} onPress={() => void submitReport()} />

        <Caption tone="muted">
          Bei unmittelbarer Gefahr wende dich an die Polizei (117). Für alles andere erreichst
          du uns unter {SUPPORT_EMAIL}.
        </Caption>
      </Stack>
    </Screen>
  );
}
