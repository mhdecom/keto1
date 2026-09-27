import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { FlatList, View } from 'react-native';
import {
  Avatar,
  Badge,
  Body,
  Button,
  Caption,
  Card,
  Empty,
  Label,
  Row,
  Screen,
  Stack,
  Title,
} from '../../src/components/ui';
import { FORMAT_LABELS } from '../../src/domain/labels';
import { estimateLevel, strengthToApproxClassification } from '../../src/domain/level';
import type { Player, PlayRequest } from '../../src/domain/types';
import { TIME_BLOCK_LABELS } from '../../src/domain/types';
import { venueName } from '../../src/domain/venues';
import { useSession } from '../../src/state/session';
import { useTheme } from '../../src/theme';

/**
 * The open-requests feed.
 *
 * This is the answer to the cold start problem. Swiping needs a crowd to work;
 * with fifty users in one city, a concrete "Tuesday 19:00 at Mythenquai, R6-ish,
 * partner dropped out" reaches the right person immediately. It is also how most
 * games actually get arranged — the deck builds the network, the feed fills the
 * courts.
 */
export default function Requests() {
  const theme = useTheme();
  const router = useRouter();
  const { requests, reloadRequests, respondToRequest, me, repository } = useSession();
  // `null` records an id we already tried and could not resolve. Without that
  // the effect below would refetch it forever, because a missing id would stay
  // missing on every pass.
  const [authors, setAuthors] = useState<Record<string, Player | null>>({});

  useFocusEffect(
    useCallback(() => {
      void reloadRequests();
    }, [reloadRequests]),
  );

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const missing = [...new Set(requests.map((request) => request.playerId))].filter(
        (id) => !(id in authors),
      );
      if (missing.length === 0) return;
      const loaded = await Promise.all(
        missing.map(async (id) => [id, await repository.getPlayer(id)] as const),
      );
      if (cancelled) return;
      setAuthors((current) => {
        const next = { ...current };
        loaded.forEach(([id, player]) => {
          next[id] = player;
        });
        return next;
      });
    })();
    return () => {
      cancelled = true;
    };
  }, [authors, repository, requests]);

  const myStrength = me ? estimateLevel(me.level).strength : 0;

  return (
    <Screen padded={false}>
      <View style={{ paddingHorizontal: theme.spacing(5), paddingBottom: theme.spacing(3) }}>
        <Button label="Anfrage aufgeben" onPress={() => router.push('/request/new')} />
      </View>

      {requests.length === 0 ? (
        <Empty
          title="Keine offenen Anfragen."
          hint="Gib die erste auf: ein konkreter Termin bringt schneller ein Spiel als jedes Profil."
        />
      ) : (
        <FlatList
          data={requests}
          keyExtractor={(request) => request.id}
          contentContainerStyle={{
            paddingHorizontal: theme.spacing(5),
            paddingBottom: theme.spacing(8),
          }}
          ItemSeparatorComponent={() => <View style={{ height: theme.spacing(3) }} />}
          renderItem={({ item }) => (
            <RequestCard
              request={item}
              author={authors[item.playerId] ?? undefined}
              isOwn={item.playerId === me?.id}
              hasResponded={me ? item.respondentIds.includes(me.id) : false}
              fitsMyLevel={myStrength >= item.minStrength && myStrength <= item.maxStrength}
              onRespond={() => void respondToRequest(item.id)}
            />
          )}
        />
      )}
    </Screen>
  );
}

function formatDate(iso: string): string {
  const date = new Date(`${iso}T12:00:00`);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleDateString('de-CH', {
    weekday: 'short',
    day: '2-digit',
    month: '2-digit',
  });
}

function RequestCard({
  request,
  author,
  isOwn,
  hasResponded,
  fitsMyLevel,
  onRespond,
}: {
  request: PlayRequest;
  author?: Player;
  isOwn: boolean;
  hasResponded: boolean;
  fitsMyLevel: boolean;
  onRespond: () => void;
}) {
  const range = `${strengthToApproxClassification(request.maxStrength)}–${strengthToApproxClassification(
    request.minStrength,
  )}`;

  return (
    <Card>
      <Stack gap={3}>
        <Row gap={3}>
          <Avatar name={author?.firstName ?? '?'} size={44} photo={author?.photos[0]} />
          <Stack gap={1} style={{ flex: 1 }}>
            <Row gap={2} wrap>
              <Title>{author?.firstName ?? 'Unbekannt'}</Title>
              {isOwn ? <Badge text="DEINE ANFRAGE" tone="primary" /> : null}
              {!isOwn && fitsMyLevel ? <Badge text="PASST ZU DIR" tone="accent" /> : null}
            </Row>
            <Caption tone="soft">
              {formatDate(request.date)} · {TIME_BLOCK_LABELS[request.timeBlock]}
            </Caption>
          </Stack>
        </Row>

        <Row wrap gap={2}>
          <Badge text={FORMAT_LABELS[request.format]} />
          {request.venueId ? <Badge text={venueName(request.venueId)} /> : <Badge text="Ort offen" />}
          <Badge text={`Niveau ${range}`} />
        </Row>

        {request.note ? <Body tone="soft">{request.note}</Body> : null}

        {request.respondentIds.length > 0 ? (
          <Caption tone="muted">
            {request.respondentIds.length === 1
              ? '1 Zusage'
              : `${request.respondentIds.length} Zusagen`}
          </Caption>
        ) : null}

        {isOwn ? null : (
          <Button
            label={hasResponded ? 'Zugesagt' : 'Ich kann'}
            variant={hasResponded ? 'secondary' : 'primary'}
            disabled={hasResponded}
            onPress={onRespond}
          />
        )}

        {!isOwn && !fitsMyLevel ? (
          <Caption tone="muted">
            Ausserhalb des gesuchten Niveaus — du kannst trotzdem zusagen.
          </Caption>
        ) : null}
      </Stack>
    </Card>
  );
}
