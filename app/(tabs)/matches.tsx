import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback } from 'react';
import { FlatList, Pressable, View } from 'react-native';
import {
  Avatar,
  Badge,
  Body,
  Caption,
  Empty,
  Row,
  Screen,
  Stack,
  Title,
} from '../../src/components/ui';
import { FORMAT_LABELS } from '../../src/domain/labels';
import { levelLabel } from '../../src/domain/level';
import { ageFromBirthYear } from '../../src/domain/matching';
import { useSession, type MatchWithPlayer } from '../../src/state/session';
import { useTheme } from '../../src/theme';

export default function Matches() {
  const theme = useTheme();
  const router = useRouter();
  const { matches, reloadMatches } = useSession();

  // A match can be created from the deck on another tab, so refresh on focus.
  useFocusEffect(
    useCallback(() => {
      void reloadMatches();
    }, [reloadMatches]),
  );

  if (matches.length === 0) {
    return (
      <Screen>
        <Empty
          title="Noch keine Matches."
          hint="Sobald beide Seiten «Spielen» gewählt haben, öffnet sich hier ein Chat."
        />
      </Screen>
    );
  }

  return (
    <Screen padded={false}>
      <FlatList
        data={matches}
        keyExtractor={(entry) => entry.match.id}
        contentContainerStyle={{ paddingHorizontal: theme.spacing(5), paddingBottom: theme.spacing(8) }}
        ItemSeparatorComponent={() => <View style={{ height: theme.spacing(3) }} />}
        renderItem={({ item }) => <MatchRow entry={item} onPress={() => router.push(`/match/${item.match.id}`)} />}
      />
    </Screen>
  );
}

function MatchRow({ entry, onPress }: { entry: MatchWithPlayer; onPress: () => void }) {
  const theme = useTheme();
  const { other, match } = entry;

  return (
    <Pressable onPress={onPress} style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}>
      <Row gap={3}>
        <Avatar name={other.firstName} size={52} />
        <Stack gap={1} style={{ flex: 1 }}>
          <Row gap={2} wrap>
            <Title>
              {other.firstName}, {ageFromBirthYear(other.birthYear)}
            </Title>
            <Badge text={levelLabel(other.level)} tone="primary" />
            {match.datingEnabled ? <Badge text="DATE" tone="accent" /> : null}
          </Row>
          <Body tone="soft" numberOfLines={1}>
            {other.formats.map((format) => FORMAT_LABELS[format]).join(' · ')}
          </Body>
          <Caption tone="muted">{other.neighbourhood}</Caption>
        </Stack>
      </Row>
    </Pressable>
  );
}
