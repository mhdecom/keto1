import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { Image, StyleSheet, View } from 'react-native';
import { photoSource } from '../data/photos';
import {
  AFTER_PLAY_LABELS,
  INDUSTRY_LABELS,
  INTENSITY_LABELS,
  INTEREST_LABELS,
  SKILL_LABELS,
} from '../domain/labels';
import { estimateLevel, levelLabel } from '../domain/level';
import { formatKm } from '../domain/location';
import { ageFromBirthYear, scoreToPercent, type MatchCandidate } from '../domain/matching';
import { venueName } from '../domain/venues';
import { useTheme } from '../theme';
import { Avatar, Badge, Body, Caption, Chip, Label, Row, Title } from './ui';

/** Keeps a dense profile from overflowing a card on a small phone. */
const MAX_SKILLS = 3;
const MAX_VENUES = 4;
const MAX_INTERESTS = 5;
const HERO_HEIGHT = 210;

/**
 * The swipe card. It shows *why* the candidate was surfaced, not just who they
 * are: a matching app that cannot explain itself gets swiped through blindly,
 * and the reasons are the part of this product that a photo grid cannot copy.
 *
 * A photo, when there is one, leads — you do want to see who you are about to
 * spend two hours with. But it is a band across the top rather than the whole
 * card, so the reasons stay above the fold.
 */
export function PlayerCard({ candidate }: { candidate: MatchCandidate }) {
  const theme = useTheme();
  const { player } = candidate;
  const age = ageFromBirthYear(player.birthYear);
  const level = estimateLevel(player.level);
  const strengths = player.strengths.slice(0, MAX_SKILLS);
  const weaknesses = player.weaknesses.slice(0, MAX_SKILLS);
  const photo = player.photos[0];

  // Shared interests first: the reason to look at this block at all is to see
  // what you have in common, not to read a list in alphabetical order.
  const shared = player.interests.filter((item) => candidate.offCourt.sharedInterests.includes(item));
  const rest = player.interests.filter((item) => !candidate.offCourt.sharedInterests.includes(item));
  const interests = [...shared, ...rest].slice(0, MAX_INTERESTS);

  const where = `${player.neighbourhood} · ${formatKm(candidate.distanceKm)} · ${
    INTENSITY_LABELS[player.intensity]
  }`;
  const work = player.profession
    ? `${player.profession} · ${INDUSTRY_LABELS[player.industry]}`
    : null;

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: theme.colors.surface,
        borderRadius: theme.radius.lg,
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: theme.colors.border,
        // Clip rather than spill: a long profile must not paint over the
        // Like/Pass buttons below the deck.
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOpacity: theme.dark ? 0.4 : 0.08,
        shadowRadius: 16,
        shadowOffset: { width: 0, height: 6 },
        elevation: 4,
      }}
    >
      {photo ? (
        <View
          style={{
            height: HERO_HEIGHT,
            // Explicit, because react-native-web defaults a View to
            // `position: static`, which would make the absolutely positioned
            // photo and overlays below anchor to the card instead of to this
            // band — and paint the picture across the whole card.
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          <Image
            source={photoSource(photo)}
            style={StyleSheet.absoluteFill}
            resizeMode="cover"
            accessibilityLabel={`Foto von ${player.firstName}`}
          />
          {/* Scrim so white text stays legible over any photo, light or dark. */}
          <LinearGradient
            pointerEvents="none"
            colors={['rgba(12,10,9,0)', 'rgba(12,10,9,0.25)', 'rgba(12,10,9,0.8)']}
            locations={[0, 0.55, 1]}
            style={StyleSheet.absoluteFill}
          />
          <View
            style={{
              position: 'absolute',
              left: theme.spacing(5),
              right: theme.spacing(5),
              bottom: theme.spacing(4),
              gap: theme.spacing(1),
            }}
          >
            <Row gap={2} wrap>
              <Title style={{ color: '#FFFFFF' }}>
                {player.firstName}, {age}
              </Title>
              <Badge text={levelLabel(player.level)} tone="accent" />
              {candidate.datingEnabled ? <Badge text="OFFEN FÜR MEHR" tone="accent" /> : null}
            </Row>
            <Caption style={{ color: 'rgba(255,255,255,0.85)' }}>{where}</Caption>
            {work ? (
              <Caption style={{ color: 'rgba(255,255,255,0.85)' }}>{work}</Caption>
            ) : null}
          </View>
          <View
            style={{
              position: 'absolute',
              top: theme.spacing(3),
              right: theme.spacing(3),
              backgroundColor: 'rgba(12,10,9,0.6)',
              borderRadius: theme.radius.pill,
              paddingHorizontal: theme.spacing(3),
              paddingVertical: theme.spacing(1.5),
            }}
          >
            <Caption style={{ color: '#FFFFFF', fontWeight: '700' }}>
              {scoreToPercent(candidate.score)}% Passung
            </Caption>
          </View>
          {player.photos.length > 1 ? (
            <Row gap={1} style={{ position: 'absolute', top: theme.spacing(3), left: theme.spacing(3) }}>
              {player.photos.map((item, index) => (
                <View
                  key={item}
                  style={{
                    width: 18,
                    height: 3,
                    borderRadius: 2,
                    backgroundColor: index === 0 ? '#FFFFFF' : 'rgba(255,255,255,0.4)',
                  }}
                />
              ))}
            </Row>
          ) : null}
        </View>
      ) : (
        <Row gap={3} style={{ padding: theme.spacing(5), paddingBottom: 0 }}>
          <Avatar name={player.firstName} size={60} />
          <View style={{ flex: 1, gap: theme.spacing(1) }}>
            <Row gap={2} wrap>
              <Title>
                {player.firstName}, {age}
              </Title>
              {candidate.datingEnabled ? <Badge text="OFFEN FÜR MEHR" tone="accent" /> : null}
            </Row>
            <Caption>{where}</Caption>
            {work ? <Caption tone="soft">{work}</Caption> : null}
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
            <Caption tone="muted">{scoreToPercent(candidate.score)}% Passung</Caption>
          </View>
        </Row>
      )}

      {/*
        The flexible middle. Sections fall off the bottom on a short screen
        instead of pushing the footer out of the card.
      */}
      <View
        style={{
          flex: 1,
          gap: theme.spacing(4),
          padding: theme.spacing(5),
          paddingBottom: theme.spacing(3),
          overflow: 'hidden',
        }}
      >
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
          <Body tone="soft" numberOfLines={3}>
            {player.bio}
          </Body>
        ) : null}

        {strengths.length > 0 || weaknesses.length > 0 ? (
          <View style={{ gap: theme.spacing(2) }}>
            <Label>Stärken & Schwächen</Label>
            <Row wrap gap={2}>
              {strengths.map((skill) => (
                <Chip key={`s-${skill}`} label={`+ ${SKILL_LABELS[skill]}`} selected tone="positive" />
              ))}
              {weaknesses.map((skill) => (
                <Chip key={`w-${skill}`} label={`− ${SKILL_LABELS[skill]}`} selected tone="negative" />
              ))}
            </Row>
          </View>
        ) : null}

        {interests.length > 0 || player.afterPlay.length > 0 ? (
          <View style={{ gap: theme.spacing(2) }}>
            <Label>Neben dem Platz</Label>
            <Row wrap gap={2}>
              {player.afterPlay.map((item) => (
                <Chip
                  key={item}
                  label={AFTER_PLAY_LABELS[item]}
                  selected={candidate.offCourt.sharedAfterPlay.includes(item)}
                  tone="positive"
                />
              ))}
              {interests.map((item) => (
                <Chip
                  key={item}
                  label={INTEREST_LABELS[item]}
                  selected={candidate.offCourt.sharedInterests.includes(item)}
                  tone="positive"
                />
              ))}
            </Row>
          </View>
        ) : null}

        {player.venueIds.length > 0 ? (
          <View style={{ gap: theme.spacing(2) }}>
            <Label>Anlagen</Label>
            <Row wrap gap={2}>
              {player.venueIds.slice(0, MAX_VENUES).map((id) => (
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
      </View>

      <Caption
        tone="muted"
        style={{ paddingHorizontal: theme.spacing(5), paddingBottom: theme.spacing(4) }}
      >
        {player.level.yearsPlaying} Jahre Erfahrung
        {level.estimated ? ' · Level selbst eingeschätzt' : ' · klassiert'} · Antippen für alles
      </Caption>
    </View>
  );
}
