import { useRouter } from 'expo-router';
import React, { useRef, useState } from 'react';
import { Modal, Pressable, View } from 'react-native';
import { SwipeDeck, type SwipeDeckHandle } from '../../src/components/SwipeDeck';
import {
  Avatar,
  Body,
  Button,
  Empty,
  Loading,
  Row,
  Screen,
  Stack,
  Title,
} from '../../src/components/ui';
import type { MatchCandidate } from '../../src/domain/matching';
import type { Player, SwipeDirection } from '../../src/domain/types';
import { useSession } from '../../src/state/session';
import { useTheme } from '../../src/theme';

export default function Discover() {
  const theme = useTheme();
  const router = useRouter();
  const { deck, deckLoading, swipe, reloadDeck } = useSession();
  const deckRef = useRef<SwipeDeckHandle>(null);
  const [matched, setMatched] = useState<{ player: Player; dating: boolean; matchId: string } | null>(
    null,
  );

  const handleSwipe = async (candidate: MatchCandidate, direction: SwipeDirection) => {
    const match = await swipe(candidate, direction);
    if (match) {
      setMatched({
        player: candidate.player,
        dating: match.datingEnabled,
        matchId: match.id,
      });
    }
  };

  if (deckLoading && deck.length === 0) {
    return (
      <Screen>
        <Loading label="Suche passende Leute…" />
      </Screen>
    );
  }

  if (deck.length === 0) {
    return (
      <Screen>
        <Empty
          title="Für heute ist niemand mehr da."
          hint="In Zürich ist die Nutzerbasis am Anfang klein. Schau bei den Anfragen vorbei — dort findest du Leute, die für einen konkreten Termin jemanden suchen."
        />
        <Stack gap={2} style={{ paddingBottom: theme.spacing(6) }}>
          <Button label="Zu den Anfragen" onPress={() => router.push('/(tabs)/requests')} />
          <Button label="Neu laden" variant="secondary" onPress={() => void reloadDeck()} />
        </Stack>
      </Screen>
    );
  }

  const top = deck[0];

  return (
    <Screen>
      <View style={{ flex: 1, paddingVertical: theme.spacing(3) }}>
        <Pressable
          style={{ flex: 1 }}
          // Tapping opens the full profile; the gesture handler on the card
          // takes precedence for drags, so this only fires on a real tap.
          onPress={() => router.push(`/player/${top.player.id}`)}
        >
          <SwipeDeck ref={deckRef} candidates={deck} onSwipe={(c, d) => void handleSwipe(c, d)} />
        </Pressable>
      </View>

      <Row gap={3} justify="center" style={{ paddingBottom: theme.spacing(5) }}>
        <Button
          label="Weiter"
          variant="secondary"
          style={{ flex: 1 }}
          onPress={() => deckRef.current?.swipe('pass')}
        />
        <Button
          label="Spielen"
          style={{ flex: 1 }}
          onPress={() => deckRef.current?.swipe('like')}
        />
      </Row>

      <Modal visible={matched !== null} transparent animationType="fade">
        <View
          style={{
            flex: 1,
            backgroundColor: theme.dark ? 'rgba(0,0,0,0.8)' : 'rgba(26,23,20,0.6)',
            alignItems: 'center',
            justifyContent: 'center',
            padding: theme.spacing(6),
          }}
        >
          {matched ? (
            <View
              style={{
                backgroundColor: theme.colors.surface,
                borderRadius: theme.radius.lg,
                padding: theme.spacing(6),
                width: '100%',
                alignItems: 'center',
                gap: theme.spacing(4),
              }}
            >
              <Avatar name={matched.player.firstName} size={72} />
              <Stack gap={2}>
                <Title style={{ textAlign: 'center' }}>
                  {matched.dating ? 'Match!' : 'Ihr könnt spielen!'}
                </Title>
                <Body tone="soft" style={{ textAlign: 'center' }}>
                  {matched.player.firstName} hat dich auch ausgewählt.
                  {matched.dating
                    ? ' Ihr habt beide «offen für mehr» angegeben.'
                    : ' Schreib direkt, wann und wo.'}
                </Body>
              </Stack>
              <Stack gap={2} style={{ alignSelf: 'stretch' }}>
                <Button
                  label="Nachricht schreiben"
                  onPress={() => {
                    const id = matched.matchId;
                    setMatched(null);
                    router.push(`/match/${id}`);
                  }}
                />
                <Button
                  label="Weiter wischen"
                  variant="ghost"
                  onPress={() => setMatched(null)}
                />
              </Stack>
            </View>
          ) : null}
        </View>
      </Modal>
    </Screen>
  );
}
