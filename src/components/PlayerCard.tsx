import React from 'react';
import { StyleSheet, View } from 'react-native';
import { estimateLevel, levelLabel } from '../domain/level';
import { FORMAT_LABELS, INTENSITY_LABELS, SKILL_LABELS } from '../domain/labels';
import { ageFromBirthYear, scoreToPercent, type MatchCandidate } from '../domain/matching';
import { venueName } from '../domain/venues';
import { useTheme } from '../theme';
import { Avatar, Badge, Body, Caption, Chip, Label, Row, Title } from './ui';

/**
 * The swipe card. It shows *why* the candidate was surfaced, not just who they
 * are: a matching app that cannot explain itself gets swiped through blindly,
 * and the reasons are the part of this product that a photo grid cannot copy.
 */
export function PlayerCard({ candidate }: { candidate: MatchCandidate }) {
  const theme = useTheme();
  const { player } = candidate;
  const age = ageFromBirthYear(player.birthYear);
  const percent = scoreToPercent(candidate.score);
  const level = estimateLevel(player.level);

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: theme.colors.surface,
        borderRadius: theme.radius.lg,
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: theme.colors.border,
        padding: theme.spacing(5),
        gap: theme.spacing(4),
        // A card needs to read as liftable; a flat rectangle does not.
        shadowColor: '#000',
        shadowOpacity: theme.dark ? 0.4 : 0.08,
        shadowRadius: 16,
        shadowOffset: { width: 0, height: 6 },
        elevation: 4,
      }}
    >
      <Row gap={3}>
        <Avatar name={player.firstName} size={60} />
        <View style={{ flex: 1, gap: theme.spacing(1) }}>
          <Row gap={2} wrap>
            <Title>
              {player.firstName}, {age}
            </Title>
            {candidate.datingEnabled ? <Badge text="OFFEN FÜR MEHR" tone="accent" /> : null}
          </Row>
          <Caption>
            {player.neighbourhood} · {candidate.distanceKm < 1 ? '<1' : candidate.distanceKm.toFixed(1)} km
          </Caption>
        </View>
        <View style={{ alignItems: 'flex-end', gap: theme.spacing(1) }}>
          <View
            style={{
              backgroundColor: theme.colors.primary,
              borderRadius: theme.radius.sm,
              paddingHorizontal: theme.spacing(2.5),
              paddingVertical: theme.spacing(1.5),
            }}
          >
            <Body style={{ color: theme.colors.onPrimary, fontWeight: '800' }}>
              {levelLabel(player.level)}
            </Body>
          </View>
          <Caption tone="muted">{percent}% Passung</Caption>
        </View>
      </Row>

      {candidate.reasons.length > 0 ? (
        <View style={{ gap: theme.spacing(2) }}>
          <Label>Warum diese Person</Label>
          <Row wrap gap={2}>
            {candidate.reasons.map((reason) => (
              <Chip key={reason} label={reason} selected tone="positive" />
            ))}
          </Row>
          {candidate.caveat ? <Caption tone="accent">⚠︎ {candidate.caveat}</Caption> : null}
        </View>
      ) : null}

      {player.bio ? (
        <Body tone="soft" numberOfLines={4}>
          {player.bio}
        </Body>
      ) : null}

      <View style={{ gap: theme.spacing(2) }}>
        <Label>Spielt</Label>
        <Row wrap gap={2}>
          {player.formats.map((format) => (
            <Chip key={format} label={FORMAT_LABELS[format]} />
          ))}
          <Chip label={INTENSITY_LABELS[player.intensity]} />
        </Row>
      </View>

      {player.strengths.length > 0 || player.weaknesses.length > 0 ? (
        <View style={{ gap: theme.spacing(2) }}>
          <Label>Stärken & Schwächen</Label>
          <Row wrap gap={2}>
            {player.strengths.map((skill) => (
              <Chip key={`s-${skill}`} label={`+ ${SKILL_LABELS[skill]}`} selected tone="positive" />
            ))}
            {player.weaknesses.map((skill) => (
              <Chip key={`w-${skill}`} label={`− ${SKILL_LABELS[skill]}`} selected tone="negative" />
            ))}
          </Row>
        </View>
      ) : null}

      {player.venueIds.length > 0 ? (
        <View style={{ gap: theme.spacing(2) }}>
          <Label>Anlagen</Label>
          <Row wrap gap={2}>
            {player.venueIds.map((id) => (
              <Chip
                key={id}
                label={venueName(id)}
                selected={candidate.sharedVenueIds.includes(id)}
                tone="positive"
              />
            ))}
          </Row>
        </View>
      ) : null}

      <Caption tone="muted">
        {player.level.yearsPlaying} Jahre Erfahrung
        {level.estimated ? ' · Level selbst eingeschätzt' : ' · klassiert'}
      </Caption>
    </View>
  );
}
