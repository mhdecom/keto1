import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import {
  FlatList,
  KeyboardAvoidingView,
  Linking,
  Platform,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import {
  Avatar,
  Badge,
  Body,
  Caption,
  Empty,
  Input,
  Label,
  Loading,
  Row,
  Stack,
  Title,
} from '../../src/components/ui';
import { levelLabel } from '../../src/domain/level';
import type { Message } from '../../src/domain/types';
import { VENUE_BY_ID } from '../../src/domain/venues';
import { bookingStatusFor, bookingUrlFor } from '../../src/lib/courtProviders';
import { useSession } from '../../src/state/session';
import { useTheme } from '../../src/theme';

export default function Chat() {
  const theme = useTheme();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { matches, me, repository } = useSession();

  const [messages, setMessages] = useState<Message[] | null>(null);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);

  const entry = matches.find((candidate) => candidate.match.id === id);

  const reload = useCallback(async () => {
    if (!id) return;
    setMessages(await repository.listMessages(id));
  }, [id, repository]);

  useEffect(() => {
    void reload();
  }, [reload]);

  if (!entry || !me) {
    return <Empty title="Chat nicht gefunden." hint="Vielleicht wurde das Match aufgelöst." />;
  }

  if (messages === null) return <Loading />;

  const { other, match } = entry;
  const sharedVenueIds = me.venueIds.filter((venueId) => other.venueIds.includes(venueId));

  const send = async () => {
    const body = draft.trim();
    if (!body) return;
    setSending(true);
    try {
      await repository.sendMessage(match.id, me.id, body);
      setDraft('');
      await reload();
    } finally {
      setSending(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: theme.colors.background }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View
        style={{
          paddingHorizontal: theme.spacing(5),
          paddingVertical: theme.spacing(3),
          gap: theme.spacing(3),
          borderBottomWidth: StyleSheet.hairlineWidth,
          borderBottomColor: theme.colors.border,
        }}
      >
        <Pressable onPress={() => router.push(`/player/${other.id}`)}>
          <Row gap={3}>
            <Avatar name={other.firstName} size={40} photo={other.photos[0]} />
            <Row gap={2} wrap style={{ flex: 1 }}>
              <Title>{other.firstName}</Title>
              <Badge text={levelLabel(other.level)} tone="primary" />
              {match.datingEnabled ? <Badge text="DATE" tone="accent" /> : null}
            </Row>
          </Row>
        </Pressable>

        <Pressable
          onPress={() => router.push(`/report/${other.id}`)}
          accessibilityRole="button"
          style={{ position: 'absolute', right: theme.spacing(5), top: theme.spacing(3) }}
        >
          <Caption tone="muted">Melden</Caption>
        </Pressable>

        {sharedVenueIds.length > 0 ? (
          <Stack gap={2}>
            <Label>Gemeinsame Anlagen</Label>
            <Row wrap gap={2}>
              {sharedVenueIds.map((venueId) => {
                const venue = VENUE_BY_ID[venueId];
                if (!venue) return null;
                const url = bookingUrlFor(venue);
                return (
                  <Pressable
                    key={venueId}
                    disabled={!url}
                    onPress={() => url && void Linking.openURL(url)}
                    style={({ pressed }) => ({
                      opacity: pressed ? 0.6 : 1,
                      backgroundColor: theme.colors.surface,
                      borderRadius: theme.radius.pill,
                      borderWidth: StyleSheet.hairlineWidth,
                      borderColor: theme.colors.border,
                      paddingHorizontal: theme.spacing(3),
                      paddingVertical: theme.spacing(2),
                    })}
                  >
                    <Caption tone="soft">
                      {venue.name} → {bookingStatusFor(venue)}
                    </Caption>
                  </Pressable>
                );
              })}
            </Row>
          </Stack>
        ) : null}
      </View>

      {messages.length === 0 ? (
        <View style={{ flex: 1 }}>
          <Empty
            title="Noch nichts geschrieben."
            hint={`Konkret wird eher zugesagt: «${other.firstName}, Dienstag 19:00 Mythenquai?» funktioniert besser als «Hey :)».`}
          />
        </View>
      ) : (
        <FlatList
          data={messages}
          keyExtractor={(message) => message.id}
          style={{ flex: 1 }}
          contentContainerStyle={{
            padding: theme.spacing(5),
            gap: theme.spacing(2),
          }}
          renderItem={({ item }) => <Bubble message={item} own={item.senderId === me.id} />}
        />
      )}

      <Row gap={2} style={{ padding: theme.spacing(4), alignItems: 'flex-end' }}>
        <View style={{ flex: 1 }}>
          <Input
            value={draft}
            onChangeText={setDraft}
            placeholder="Wann und wo?"
            maxLength={2000}
          />
        </View>
        <Pressable
          disabled={sending || draft.trim().length === 0}
          onPress={() => void send()}
          style={({ pressed }) => ({
            opacity: sending || draft.trim().length === 0 ? 0.4 : pressed ? 0.7 : 1,
            backgroundColor: theme.colors.primary,
            borderRadius: theme.radius.pill,
            paddingHorizontal: theme.spacing(5),
            height: 48,
            alignItems: 'center',
            justifyContent: 'center',
          })}
        >
          <Body style={{ color: theme.colors.onPrimary, fontWeight: '700' }}>Senden</Body>
        </Pressable>
      </Row>
    </KeyboardAvoidingView>
  );
}

function Bubble({ message, own }: { message: Message; own: boolean }) {
  const theme = useTheme();
  return (
    <View
      style={{
        alignSelf: own ? 'flex-end' : 'flex-start',
        maxWidth: '82%',
        backgroundColor: own ? theme.colors.primary : theme.colors.surface,
        borderRadius: theme.radius.md,
        borderWidth: own ? 0 : StyleSheet.hairlineWidth,
        borderColor: theme.colors.border,
        paddingHorizontal: theme.spacing(3.5),
        paddingVertical: theme.spacing(2.5),
      }}
    >
      <Body style={{ color: own ? theme.colors.onPrimary : theme.colors.text }}>{message.body}</Body>
    </View>
  );
}
