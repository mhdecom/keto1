import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Alert, View } from 'react-native';
import { SlotGrid } from '../../src/components/SlotGrid';
import {
  Avatar,
  Badge,
  Body,
  Button,
  Caption,
  Card,
  Chip,
  ChoiceGroup,
  Display,
  Input,
  Label,
  Row,
  Screen,
  Stack,
  Stepper,
  Title,
} from '../../src/components/ui';
import { backendName } from '../../src/data';
import { DISTRICT_OPTIONS } from '../../src/domain/districts';
import {
  AFTER_PLAY_LABELS,
  AFTER_PLAY_OPTIONS,
  FORMAT_OPTIONS,
  INDUSTRY_LABELS,
  INDUSTRY_OPTIONS,
  INTENSITY_OPTIONS,
  INTENT_HINTS,
  INTENT_OPTIONS,
  INTERCLUB_OPTIONS,
  INTEREST_LABELS,
  INTEREST_OPTIONS,
  RALLY_OPTIONS,
  SEEKING_OPTIONS,
  SKILL_OPTIONS,
  SURFACE_OPTIONS,
} from '../../src/domain/labels';
import { levelLabel } from '../../src/domain/level';
import { ageFromBirthYear } from '../../src/domain/matching';
import { SWISS_CLASSIFICATIONS } from '../../src/domain/types';
import { VENUES } from '../../src/domain/venues';
import { formFromPlayer, playerFromForm, validateStep, type ProfileForm } from '../../src/state/profileForm';
import { useSession } from '../../src/state/session';
import { useTheme } from '../../src/theme';

const CLASSIFICATION_OPTIONS = [
  { value: 'unclassified' as const, label: 'Unklassiert' },
  ...SWISS_CLASSIFICATIONS.map((value) => ({ value, label: value })),
];

export default function Profile() {
  const theme = useTheme();
  const router = useRouter();
  const { me, saveMe, resetEverything } = useSession();

  const [form, setForm] = useState<ProfileForm | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!me) return null;

  const editing = form !== null;

  const patch = (changes: Partial<ProfileForm>) => {
    setForm((current) => (current ? { ...current, ...changes } : current));
    setError(null);
  };

  const save = async () => {
    if (!form) return;
    // Run the same rules the wizard uses; an edit can break a profile too.
    for (const step of ['basics', 'style', 'availability', 'intent']) {
      const problem = validateStep(step, form);
      if (problem) {
        setError(problem);
        return;
      }
    }
    setSaving(true);
    try {
      await saveMe(playerFromForm(form, { id: me.id, createdAt: me.createdAt }));
      setForm(null);
    } finally {
      setSaving(false);
    }
  };

  const confirmReset = () => {
    Alert.alert(
      'Alles zurücksetzen?',
      'Profil, Swipes, Matches und Chats werden gelöscht. Das lässt sich nicht widerrufen.',
      [
        { text: 'Abbrechen', style: 'cancel' },
        {
          text: 'Zurücksetzen',
          style: 'destructive',
          onPress: () => {
            void resetEverything().then(() => router.replace('/onboarding'));
          },
        },
      ],
    );
  };

  // -------------------------------------------------------------------------
  // Read-only view
  // -------------------------------------------------------------------------

  if (!editing) {
    return (
      <Screen scroll>
        <Stack gap={6} style={{ paddingTop: theme.spacing(3) }}>
          <Row gap={4}>
            <Avatar name={me.firstName} size={72} />
            <Stack gap={1} style={{ flex: 1 }}>
              <Display>{me.firstName}</Display>
              <Body tone="soft">
                {ageFromBirthYear(me.birthYear)} Jahre · {me.neighbourhood}
              </Body>
              {me.profession ? (
                <Body tone="soft">
                  {me.profession} · {INDUSTRY_LABELS[me.industry]}
                </Body>
              ) : null}
              <Row gap={2} wrap>
                <Badge text={levelLabel(me.level)} tone="primary" />
                <Badge text={`${me.radiusKm} km`} />
              </Row>
            </Stack>
          </Row>

          {me.bio ? <Body tone="soft">{me.bio}</Body> : null}

          <Card>
            <Stack gap={2}>
              <Label>Was du suchst</Label>
              <Body>{INTENT_HINTS[me.intent]}</Body>
            </Stack>
          </Card>

          {me.interests.length > 0 || me.afterPlay.length > 0 ? (
            <Stack gap={3}>
              <Label>Neben dem Platz</Label>
              <Row wrap gap={2}>
                {me.afterPlay.map((item) => (
                  <Chip key={item} label={AFTER_PLAY_LABELS[item]} selected />
                ))}
                {me.interests.map((item) => (
                  <Chip key={item} label={INTEREST_LABELS[item]} />
                ))}
              </Row>
            </Stack>
          ) : null}

          <Stack gap={3}>
            <Label>Deine Zeiten</Label>
            <SlotGrid mask={me.availability} />
          </Stack>

          <Button label="Profil bearbeiten" onPress={() => setForm(formFromPlayer(me))} />

          <Stack gap={2}>
            <Caption tone="muted">Datenquelle: {backendName}</Caption>
            <Caption tone="muted">
              Ohne Supabase-Zugangsdaten läuft alles lokal auf dem Gerät, mit Zürcher
              Testprofilen. Das Backend-Schema liegt in supabase/migrations bereit.
            </Caption>
          </Stack>

          <Button label="Alles zurücksetzen" variant="danger" onPress={confirmReset} />
          <View style={{ height: theme.spacing(6) }} />
        </Stack>
      </Screen>
    );
  }

  // -------------------------------------------------------------------------
  // Edit view
  // -------------------------------------------------------------------------

  return (
    <Screen scroll>
      <Stack gap={5} style={{ paddingTop: theme.spacing(3) }}>
        <Title>Profil bearbeiten</Title>

        <Stack gap={2}>
          <Label>Vorname</Label>
          <Input value={form.firstName} onChangeText={(firstName) => patch({ firstName })} maxLength={40} />
        </Stack>

        <Stack gap={2}>
          <Label>Geburtsjahr</Label>
          <Input
            value={form.birthYearText}
            onChangeText={(birthYearText) => patch({ birthYearText })}
            keyboardType="number-pad"
            maxLength={4}
          />
        </Stack>

        <Stack gap={2}>
          <Label>Wohnort</Label>
          <ChoiceGroup
            options={DISTRICT_OPTIONS}
            value={[form.districtId]}
            onChange={([districtId]) => districtId && patch({ districtId })}
          />
        </Stack>

        <Stack gap={2}>
          <Label>Radius</Label>
          <Stepper
            label="Radius"
            value={form.radiusKm}
            onChange={(radiusKm) => patch({ radiusKm })}
            min={1}
            max={50}
            format={(value) => `${value} km`}
          />
        </Stack>

        <Stack gap={2}>
          <Label>Klassierung</Label>
          <ChoiceGroup
            options={CLASSIFICATION_OPTIONS}
            value={[form.classification]}
            onChange={([classification]) => classification && patch({ classification })}
          />
        </Stack>

        <Stack gap={2}>
          <Label>Jahre Erfahrung</Label>
          <Stepper
            label="Jahre"
            value={form.yearsPlaying}
            onChange={(yearsPlaying) => patch({ yearsPlaying })}
            min={0}
            max={60}
            format={(value) => (value === 1 ? '1 Jahr' : `${value} Jahre`)}
          />
        </Stack>

        <Stack gap={2}>
          <Label>Interclub</Label>
          <ChoiceGroup
            options={INTERCLUB_OPTIONS}
            value={[form.interclub]}
            onChange={([interclub]) => interclub && patch({ interclub })}
          />
        </Stack>

        <Stack gap={2}>
          <Label>Bälle hintereinander cross</Label>
          <ChoiceGroup
            options={RALLY_OPTIONS}
            value={[form.rallyConsistency]}
            onChange={([rallyConsistency]) => rallyConsistency && patch({ rallyConsistency })}
          />
        </Stack>

        {form.classification === 'unclassified' ? (
          <Stack gap={2}>
            <Label>Selbsteinschätzung</Label>
            <Stepper
              label="Selbsteinschätzung"
              value={form.selfRating}
              onChange={(selfRating) => patch({ selfRating })}
              min={1}
              max={7}
              step={0.5}
              format={(value) => value.toFixed(1)}
            />
          </Stack>
        ) : null}

        <Stack gap={2}>
          <Label>Spielform</Label>
          <ChoiceGroup
            options={FORMAT_OPTIONS}
            value={form.formats}
            multiple
            onChange={(formats) => patch({ formats })}
          />
        </Stack>

        <Stack gap={2}>
          <Label>Anspruch</Label>
          <ChoiceGroup
            options={INTENSITY_OPTIONS}
            value={[form.intensity]}
            onChange={([intensity]) => intensity && patch({ intensity })}
          />
        </Stack>

        <Stack gap={2}>
          <Label>Belag</Label>
          <ChoiceGroup
            options={SURFACE_OPTIONS}
            value={form.surfaces}
            multiple
            onChange={(surfaces) => patch({ surfaces })}
          />
        </Stack>

        <Stack gap={2}>
          <Label>Stärken</Label>
          <ChoiceGroup
            options={SKILL_OPTIONS.filter((option) => !form.weaknesses.includes(option.value))}
            value={form.strengths}
            multiple
            tone="positive"
            onChange={(strengths) => patch({ strengths })}
          />
        </Stack>

        <Stack gap={2}>
          <Label>Schwächen</Label>
          <ChoiceGroup
            options={SKILL_OPTIONS.filter((option) => !form.strengths.includes(option.value))}
            value={form.weaknesses}
            multiple
            tone="negative"
            onChange={(weaknesses) => patch({ weaknesses })}
          />
        </Stack>

        <Stack gap={2}>
          <Label>Beruf</Label>
          <Input
            value={form.profession}
            onChangeText={(profession) => patch({ profession })}
            placeholder="Software Engineer"
            maxLength={80}
          />
        </Stack>

        <Stack gap={2}>
          <Label>Branche</Label>
          <ChoiceGroup
            options={INDUSTRY_OPTIONS}
            value={[form.industry]}
            onChange={([industry]) => industry && patch({ industry })}
          />
        </Stack>

        <Stack gap={2}>
          <Label>Interessen</Label>
          <ChoiceGroup
            options={INTEREST_OPTIONS}
            value={form.interests}
            multiple
            onChange={(interests) => patch({ interests })}
          />
        </Stack>

        <Stack gap={2}>
          <Label>Nach dem Spiel</Label>
          <ChoiceGroup
            options={AFTER_PLAY_OPTIONS}
            value={form.afterPlay}
            multiple
            onChange={(afterPlay) => patch({ afterPlay })}
          />
          {form.afterPlay.length === 0 ? (
            <Caption tone="soft">Nichts ausgewählt heisst: du kommst zum Spielen.</Caption>
          ) : null}
        </Stack>

        <Stack gap={2}>
          <Label>Zeiten</Label>
          <SlotGrid mask={form.availability} onChange={(availability) => patch({ availability })} />
        </Stack>

        <Stack gap={2}>
          <Label>Anlagen</Label>
          <ChoiceGroup
            options={VENUES.map((venue) => ({ value: venue.id, label: venue.name }))}
            value={form.venueIds}
            multiple
            onChange={(venueIds) => patch({ venueIds })}
          />
        </Stack>

        <Stack gap={2}>
          <Label>Was du suchst</Label>
          <ChoiceGroup
            options={INTENT_OPTIONS}
            value={[form.intent]}
            onChange={([intent]) => intent && patch({ intent })}
          />
          <Caption tone="soft">{INTENT_HINTS[form.intent]}</Caption>
        </Stack>

        <Stack gap={2}>
          <Label>Spielen mit</Label>
          <ChoiceGroup
            options={SEEKING_OPTIONS}
            value={form.seeking}
            multiple
            onChange={(seeking) => patch({ seeking })}
          />
        </Stack>

        <Stack gap={2}>
          <Label>Alter</Label>
          <Stepper
            label="Mindestalter"
            value={form.ageMin}
            onChange={(ageMin) => patch({ ageMin: Math.min(ageMin, form.ageMax) })}
            min={18}
            max={99}
            format={(value) => `ab ${value}`}
          />
          <Stepper
            label="Höchstalter"
            value={form.ageMax}
            onChange={(ageMax) => patch({ ageMax: Math.max(ageMax, form.ageMin) })}
            min={18}
            max={99}
            format={(value) => `bis ${value}`}
          />
        </Stack>

        <Stack gap={2}>
          <Label>Über dich</Label>
          <Input value={form.bio} onChangeText={(bio) => patch({ bio })} multiline maxLength={600} />
        </Stack>

        <Row gap={2}>
          <Chip
            label="Ich kann einen Platz mitbringen"
            selected={form.hasCourtAccess}
            onPress={() => patch({ hasCourtAccess: !form.hasCourtAccess })}
          />
        </Row>

        {error ? <Body tone="danger">{error}</Body> : null}

        <Stack gap={2}>
          <Button label="Speichern" loading={saving} onPress={() => void save()} />
          <Button label="Abbrechen" variant="ghost" onPress={() => setForm(null)} />
        </Stack>
        <View style={{ height: theme.spacing(6) }} />
      </Stack>
    </Screen>
  );
}
