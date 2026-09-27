import { useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Dimensions, Image, Linking, Pressable, ScrollView } from 'react-native';
import { photoSource } from '../../src/data/photos';
import { SlotGrid } from '../../src/components/SlotGrid';
import {
  Avatar,
  Badge,
  Body,
  Caption,
  Card,
  Chip,
  Display,
  Empty,
  Label,
  Loading,
  Row,
  ScoreBar,
  Screen,
  Stack,
  Title,
} from '../../src/components/ui';
import {
  AFTER_PLAY_LABELS,
  BACKHAND_LABELS,
  FORMAT_LABELS,
  INDUSTRY_LABELS,
  INTEREST_LABELS,
  INTENSITY_LABELS,
  INTENT_LABELS,
  SKILL_LABELS,
  SURFACE_LABELS,
} from '../../src/domain/labels';
import { estimateLevel, levelLabel } from '../../src/domain/level';
import { ageFromBirthYear, scoreCandidate, scoreToPercent } from '../../src/domain/matching';
import type { Player } from '../../src/domain/types';
import { VENUE_BY_ID, VENUE_NAMES } from '../../src/domain/venues';
import { bookingStatusFor, bookingUrlFor } from '../../src/lib/courtProviders';
import { useSession } from '../../src/state/session';

const GALLERY_WIDTH = Dimensions.get('window').width;
const GALLERY_HEIGHT = Math.round(GALLERY_WIDTH * 0.85);

export default function PlayerDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { repository, me } = useSession();
  const [player, setPlayer] = useState<Player | null | undefined>(undefined);

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
  if (!player || !me) return <Empty title="Profil nicht gefunden." />;

  const candidate = scoreCandidate(me, player, VENUE_NAMES);
  const estimate = estimateLevel(player.level);

  return (
    <Screen scroll>
      <Stack gap={6} style={{ paddingTop: 12 }}>
        {player.photos.length > 0 ? (
          <ScrollView
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            style={{
              marginHorizontal: -20,
              height: GALLERY_HEIGHT,
            }}
          >
            {player.photos.map((photo) => (
              <Image
                key={photo}
                source={photoSource(photo)}
                style={{ width: GALLERY_WIDTH, height: GALLERY_HEIGHT }}
                resizeMode="cover"
                accessibilityLabel={`Foto von ${player.firstName}`}
              />
            ))}
          </ScrollView>
        ) : null}

        <Row gap={4}>
          <Avatar name={player.firstName} size={72} photo={player.photos[0]} />
          <Stack gap={1} style={{ flex: 1 }}>
            <Display>{player.firstName}</Display>
            <Body tone="soft">
              {ageFromBirthYear(player.birthYear)} Jahre · {player.neighbourhood}
            </Body>
            {player.profession ? (
              <Body tone="soft">
                {player.profession} · {INDUSTRY_LABELS[player.industry]}
              </Body>
            ) : null}
            {player.workNeighbourhood ? (
              <Caption tone="muted">Arbeitet: {player.workNeighbourhood}</Caption>
            ) : null}
            <Row gap={2} wrap>
              <Badge text={levelLabel(player.level)} tone="primary" />
              <Badge text={INTENT_LABELS[player.intent]} />
              {candidate.datingEnabled ? <Badge text="OFFEN FÜR MEHR" tone="accent" /> : null}
            </Row>
          </Stack>
        </Row>

        {player.bio ? <Body tone="soft">{player.bio}</Body> : null}

        {/*
          The full breakdown, not just the headline percentage. If the app is
          going to rank people, the person doing the choosing should be able to
          see what it weighed and disagree with it.
        */}
        <Card>
          <Stack gap={3}>
            <Row justify="space-between">
              <Label>Passung</Label>
              <Title tone="accent">{scoreToPercent(candidate.score)}%</Title>
            </Row>
            <ScoreBar label="Spielstärke" value={candidate.breakdown.level} />
            <ScoreBar label="Zeiten" value={candidate.breakdown.availability} />
            <ScoreBar label="Ort" value={candidate.breakdown.location} />
            <ScoreBar label="Neben dem Platz" value={candidate.breakdown.affinity} />
            <ScoreBar label="Spielform" value={candidate.breakdown.format} />
            <ScoreBar label="Anspruch" value={candidate.breakdown.intensity} />
            <ScoreBar label="Belag" value={candidate.breakdown.surface} />
            {candidate.caveat ? <Caption tone="accent">⚠︎ {candidate.caveat}</Caption> : null}
          </Stack>
        </Card>

        <Stack gap={3}>
          <Label>Spielstärke</Label>
          <Body tone="soft">
            {player.level.classification
              ? `Klassiert ${player.level.classification}.`
              : `Unklassiert, geschätzt auf etwa ${levelLabel(player.level).replace('≈ ', '')}.`}{' '}
            {player.level.yearsPlaying} Jahre Erfahrung.
          </Body>
          <Caption tone="muted">
            {estimate.estimated
              ? 'Selbst eingeschätzt — nimm es als Richtwert, nicht als Zahl.'
              : 'Offizielle Swiss-Tennis-Klassierung.'}
          </Caption>
        </Stack>

        <Stack gap={3}>
          <Label>Spielweise</Label>
          <Row wrap gap={2}>
            {player.formats.map((format) => (
              <Chip key={format} label={FORMAT_LABELS[format]} />
            ))}
            <Chip label={INTENSITY_LABELS[player.intensity]} />
            <Chip label={`Rückhand ${BACKHAND_LABELS[player.backhand].toLowerCase()}`} />
            {player.surfaces.map((surface) => (
              <Chip key={surface} label={SURFACE_LABELS[surface]} />
            ))}
            {player.hasCourtAccess ? <Chip label="Kann Platz mitbringen" selected /> : null}
          </Row>
        </Stack>

        {player.strengths.length > 0 || player.weaknesses.length > 0 ? (
          <Stack gap={3}>
            <Label>Stärken & Schwächen</Label>
            <Row wrap gap={2}>
              {player.strengths.map((skill) => (
                <Chip key={`s-${skill}`} label={`+ ${SKILL_LABELS[skill]}`} selected tone="positive" />
              ))}
              {player.weaknesses.map((skill) => (
                <Chip key={`w-${skill}`} label={`− ${SKILL_LABELS[skill]}`} selected tone="negative" />
              ))}
            </Row>
          </Stack>
        ) : null}

        <Stack gap={3}>
          <Label>Neben dem Platz</Label>
          {player.afterPlay.length === 0 ? (
            <Body tone="soft">Will spielen, sonst nichts.</Body>
          ) : (
            <Row wrap gap={2}>
              {player.afterPlay.map((item) => (
                <Chip
                  key={item}
                  label={AFTER_PLAY_LABELS[item]}
                  selected={candidate.offCourt.sharedAfterPlay.includes(item)}
                  tone="positive"
                />
              ))}
            </Row>
          )}
          {player.interests.length > 0 ? (
            <Row wrap gap={2}>
              {player.interests.map((item) => (
                <Chip
                  key={item}
                  label={INTEREST_LABELS[item]}
                  selected={candidate.offCourt.sharedInterests.includes(item)}
                  tone="positive"
                />
              ))}
            </Row>
          ) : null}
          {candidate.offCourt.sharedInterests.length > 0 ||
          candidate.offCourt.sharedAfterPlay.length > 0 ? (
            <Caption tone="muted">Hervorgehoben = habt ihr gemeinsam</Caption>
          ) : null}
        </Stack>

        <Stack gap={3}>
          <Label>Verfügbarkeit</Label>
          <SlotGrid mask={player.availability} highlight={player.availability & me.availability} />
        </Stack>

        {player.venueIds.length > 0 ? (
          <Stack gap={3}>
            <Label>Anlagen</Label>
            <Stack gap={2}>
              {player.venueIds.map((venueId) => {
                const venue = VENUE_BY_ID[venueId];
                if (!venue) return null;
                const url = bookingUrlFor(venue);
                const shared = candidate.sharedVenueIds.includes(venueId);
                return (
                  <Pressable
                    key={venueId}
                    disabled={!url}
                    onPress={() => url && void Linking.openURL(url)}
                  >
                    <Row justify="space-between">
                      <Body style={{ flex: 1 }}>
                        {shared ? '● ' : '○ '}
                        {venue.name}
                      </Body>
                      <Caption tone={url ? 'accent' : 'muted'}>{bookingStatusFor(venue)}</Caption>
                    </Row>
                  </Pressable>
                );
              })}
            </Stack>
            <Caption tone="muted">● = auch eine deiner Anlagen</Caption>
          </Stack>
        ) : null}

        <Stack gap={2}>
          <Label>Sprachen</Label>
          <Row wrap gap={2}>
            {player.languages.map((language) => (
              <Chip key={language} label={language.toUpperCase()} />
            ))}
          </Row>
        </Stack>
      </Stack>
    </Screen>
  );
}
