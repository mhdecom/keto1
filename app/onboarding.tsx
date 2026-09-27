import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { View } from 'react-native';
import { SlotGrid } from '../src/components/SlotGrid';
import {
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
} from '../src/components/ui';
import { DEMO_ME } from '../src/data/seed';
import { DISTRICT_OPTIONS } from '../src/domain/districts';
import {
  AFTER_PLAY_HINTS,
  AFTER_PLAY_OPTIONS,
  BACKHAND_OPTIONS,
  FORMAT_OPTIONS,
  GENDER_OPTIONS,
  INTENSITY_OPTIONS,
  INTENT_HINTS,
  INTENT_OPTIONS,
  INDUSTRY_OPTIONS,
  INTERCLUB_OPTIONS,
  INTEREST_OPTIONS,
  RALLY_OPTIONS,
  SEEKING_OPTIONS,
  SKILL_OPTIONS,
  SURFACE_OPTIONS,
} from '../src/domain/labels';
import { estimateLevel, strengthToApproxClassification } from '../src/domain/level';
import { SWISS_CLASSIFICATIONS } from '../src/domain/types';
import { VENUES } from '../src/domain/venues';
import {
  EMPTY_FORM,
  playerFromForm,
  validateStep,
  type ProfileForm,
} from '../src/state/profileForm';
import { useSession } from '../src/state/session';
import { useTheme } from '../src/theme';

const CLASSIFICATION_OPTIONS = [
  { value: 'unclassified' as const, label: 'Unklassiert' },
  ...SWISS_CLASSIFICATIONS.map((value) => ({ value, label: value })),
];

interface Step {
  id: string;
  title: string;
  subtitle: string;
}

const STEPS: Step[] = [
  { id: 'basics', title: 'Wer bist du?', subtitle: 'Nur das Nötigste. Keine Adresse, nur der Kreis.' },
  {
    id: 'level',
    title: 'Wie stark spielst du?',
    subtitle: 'Der wichtigste Teil. Ehrlich ausgefüllt findest du bessere Partner als geschönt.',
  },
  { id: 'style', title: 'Was spielst du?', subtitle: 'Spielform, Anspruch, Belag.' },
  {
    id: 'skills',
    title: 'Stärken und Schwächen',
    subtitle: 'Optional, aber genau das sucht ein guter Trainingspartner.',
  },
  {
    id: 'availability',
    title: 'Wann kannst du?',
    subtitle: 'Der häufigste Grund, warum eine Partnersuche scheitert, ist der Kalender.',
  },
  { id: 'venues', title: 'Wo spielst du?', subtitle: 'Anlagen, auf die du regelmässig gehst.' },
  {
    id: 'offCourt',
    title: 'Neben dem Platz',
    subtitle:
      'Wer regelmässig mit dir spielt, verbringt viele Stunden mit dir. Das hier entscheidet, ob daraus ein Kontakt wird.',
  },
  { id: 'intent', title: 'Was suchst du?', subtitle: 'Hier trennt sich Partnersuche von Dating.' },
  { id: 'bio', title: 'Ein Satz zu dir', subtitle: 'Was jemand wissen sollte, bevor er anfragt.' },
];

export default function Onboarding() {
  const theme = useTheme();
  const router = useRouter();
  const { saveMe } = useSession();

  const [started, setStarted] = useState(false);
  const [index, setIndex] = useState(0);
  const [form, setForm] = useState<ProfileForm>(EMPTY_FORM);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const patch = (changes: Partial<ProfileForm>) => {
    setForm((current) => ({ ...current, ...changes }));
    setError(null);
  };

  const finish = async (draft: ProfileForm) => {
    setSaving(true);
    try {
      await saveMe(playerFromForm(draft, { id: 'me' }));
      router.replace('/(tabs)');
    } finally {
      setSaving(false);
    }
  };

  const next = async () => {
    const step = STEPS[index];
    const problem = validateStep(step.id, form);
    if (problem) {
      setError(problem);
      return;
    }
    if (index === STEPS.length - 1) {
      await finish(form);
      return;
    }
    setIndex(index + 1);
  };

  // -------------------------------------------------------------------------
  // Intro
  // -------------------------------------------------------------------------

  if (!started) {
    return (
      <Screen scroll>
        <Stack gap={6} style={{ paddingTop: theme.spacing(12) }}>
          <Stack gap={3}>
            <Display>Tinder Tennis</Display>
            <Title tone="soft">Finde in Zürich jemanden, der zu deinem Spiel passt.</Title>
          </Stack>

          <Stack gap={3}>
            <Body tone="soft">
              Plätze zu buchen ist in Zürich gelöst. Jemanden zu finden, mit dem sich das Buchen
              lohnt, ist es nicht. Genau das macht diese App.
            </Body>
            <Body tone="soft">
              Du beantwortest ein paar Fragen zu deinem Spiel — Klassierung, Zeiten, Anlagen,
              Stärken. Danach siehst du Leute, bei denen Level, Kalender und Platz
              zusammenpassen, und du siehst jeweils, warum.
            </Body>
          </Stack>

          <Stack gap={3}>
            <Button label="Profil erstellen" onPress={() => setStarted(true)} />
            <Button
              label="Mit Demo-Profil ansehen"
              variant="secondary"
              loading={saving}
              onPress={() => void saveMe(DEMO_ME).then(() => router.replace('/(tabs)'))}
            />
            <Caption tone="muted">
              Das Demo-Profil ist ein R6-Spieler aus dem Kreis 4 mit Di/Do-Abendterminen. Damit
              siehst du direkt, wie das Matching arbeitet. Du kannst es später jederzeit
              überschreiben.
            </Caption>
          </Stack>
        </Stack>
      </Screen>
    );
  }

  const step = STEPS[index];
  const progress = (index + 1) / STEPS.length;

  return (
    <Screen scroll>
      <Stack gap={5} style={{ paddingTop: theme.spacing(6) }}>
        <Stack gap={2}>
          <View
            style={{
              height: 4,
              borderRadius: 2,
              backgroundColor: theme.colors.border,
              overflow: 'hidden',
            }}
          >
            <View
              style={{
                width: `${progress * 100}%`,
                height: '100%',
                backgroundColor: theme.colors.accent,
              }}
            />
          </View>
          <Caption tone="muted">
            Schritt {index + 1} von {STEPS.length}
          </Caption>
        </Stack>

        <Stack gap={2}>
          <Title>{step.title}</Title>
          <Body tone="soft">{step.subtitle}</Body>
        </Stack>

        {step.id === 'basics' ? (
          <Stack gap={5}>
            <Stack gap={2}>
              <Label>Vorname</Label>
              <Input
                value={form.firstName}
                onChangeText={(firstName) => patch({ firstName })}
                placeholder="Vorname"
                maxLength={40}
              />
            </Stack>
            <Stack gap={2}>
              <Label>Geburtsjahr</Label>
              <Input
                value={form.birthYearText}
                onChangeText={(birthYearText) => patch({ birthYearText })}
                placeholder="1990"
                keyboardType="number-pad"
                maxLength={4}
              />
            </Stack>
            <Stack gap={2}>
              <Label>Geschlecht</Label>
              <ChoiceGroup
                options={GENDER_OPTIONS}
                value={[form.gender]}
                onChange={([gender]) => gender && patch({ gender })}
              />
            </Stack>
            <Stack gap={2}>
              <Label>Wo wohnst du?</Label>
              <ChoiceGroup
                options={DISTRICT_OPTIONS}
                value={[form.districtId]}
                onChange={([districtId]) => districtId && patch({ districtId })}
              />
            </Stack>
            <Stack gap={2}>
              <Label>Wie weit fährst du für ein Spiel?</Label>
              <Stepper
                label="Radius"
                value={form.radiusKm}
                onChange={(radiusKm) => patch({ radiusKm })}
                min={1}
                max={50}
                format={(value) => `${value} km`}
              />
            </Stack>
          </Stack>
        ) : null}

        {step.id === 'level' ? (
          <Stack gap={5}>
            <Stack gap={2}>
              <Label>Swiss-Tennis-Klassierung</Label>
              <ChoiceGroup
                options={CLASSIFICATION_OPTIONS}
                value={[form.classification]}
                onChange={([classification]) => classification && patch({ classification })}
              />
              <Caption tone="muted">
                Wenn du klassiert bist, ist das das aussagekräftigste Feld der ganzen App. Die
                Fragen darunter brauchen wir dann nur noch zur Einordnung.
              </Caption>
            </Stack>

            <Stack gap={2}>
              <Label>Seit wie vielen Jahren spielst du?</Label>
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
              <Label>Mannschaft / Interclub</Label>
              <ChoiceGroup
                options={INTERCLUB_OPTIONS}
                value={[form.interclub]}
                onChange={([interclub]) => interclub && patch({ interclub })}
              />
            </Stack>

            <Stack gap={2}>
              <Label>Wie viele Bälle bringst du cross hintereinander ins Feld?</Label>
              <ChoiceGroup
                options={RALLY_OPTIONS}
                value={[form.rallyConsistency]}
                onChange={([rallyConsistency]) => rallyConsistency && patch({ rallyConsistency })}
              />
              <Caption tone="muted">
                Klingt banal, sagt aber mehr über die Spielstärke aus als jede
                Selbsteinschätzung — besonders wenn du unklassiert bist.
              </Caption>
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
                <Caption tone="muted">
                  1.0 = noch nie ein Racket in der Hand, 4.0 = solider Clubspieler, 7.0 =
                  Turnierniveau.
                </Caption>
              </Stack>
            ) : null}

            <Card>
              <Stack gap={1}>
                <Label>So ordnen wir dich ein</Label>
                <LevelPreview form={form} />
              </Stack>
            </Card>
          </Stack>
        ) : null}

        {step.id === 'style' ? (
          <Stack gap={5}>
            <Stack gap={2}>
              <Label>Spielform (mehrere möglich)</Label>
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
              <Label>Rückhand</Label>
              <ChoiceGroup
                options={BACKHAND_OPTIONS}
                value={[form.backhand]}
                onChange={([backhand]) => backhand && patch({ backhand })}
              />
            </Stack>
            <Stack gap={2}>
              <Label>Platz</Label>
              <Row gap={2}>
                <Chip
                  label="Ich kann einen Platz mitbringen"
                  selected={form.hasCourtAccess}
                  onPress={() => patch({ hasCourtAccess: !form.hasCourtAccess })}
                />
              </Row>
            </Stack>
          </Stack>
        ) : null}

        {step.id === 'skills' ? (
          <Stack gap={5}>
            <Stack gap={2}>
              <Label>Das kann ich gut</Label>
              <ChoiceGroup
                options={SKILL_OPTIONS.filter((option) => !form.weaknesses.includes(option.value))}
                value={form.strengths}
                multiple
                tone="positive"
                onChange={(strengths) => patch({ strengths })}
              />
            </Stack>
            <Stack gap={2}>
              <Label>Daran arbeite ich</Label>
              <ChoiceGroup
                options={SKILL_OPTIONS.filter((option) => !form.strengths.includes(option.value))}
                value={form.weaknesses}
                multiple
                tone="negative"
                onChange={(weaknesses) => patch({ weaknesses })}
              />
            </Stack>
            <Caption tone="muted">
              Eine Schwäche zuzugeben schadet dir hier nicht. Wer seine Rückhand trainieren will,
              sucht jemanden, der gerne auf die Rückhand spielt.
            </Caption>
          </Stack>
        ) : null}

        {step.id === 'availability' ? (
          <Stack gap={4}>
            <SlotGrid mask={form.availability} onChange={(availability) => patch({ availability })} />
            <Caption tone="muted">
              Grob reicht. Es geht darum, ob sich deine Woche mit der anderen überhaupt
              überschneidet.
            </Caption>
          </Stack>
        ) : null}

        {step.id === 'venues' ? (
          <Stack gap={4}>
            <ChoiceGroup
              options={VENUES.map((venue) => ({ value: venue.id, label: venue.name }))}
              value={form.venueIds}
              multiple
              onChange={(venueIds) => patch({ venueIds })}
            />
            <Caption tone="muted">
              Eine gemeinsame Anlage ist Gold: sie macht aus «wir müssten mal» ein «Platz frei in
              einer Stunde?». Wenn du flexibel bist, lass es leer.
            </Caption>
          </Stack>
        ) : null}

        {step.id === 'offCourt' ? (
          <Stack gap={5}>
            <Stack gap={2}>
              <Label>Was machst du beruflich?</Label>
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
                <Caption tone="soft">
                  Nichts ausgewählt heisst: du kommst zum Spielen. Das ist eine vollwertige
                  Antwort — wir suchen dir dann Leute, die es genauso halten.
                </Caption>
              ) : (
                <Stack gap={1}>
                  {form.afterPlay.map((item) => (
                    <Caption key={item} tone="soft">
                      {AFTER_PLAY_HINTS[item]}
                    </Caption>
                  ))}
                </Stack>
              )}
            </Stack>

            <Caption tone="muted">
              Das gilt unabhängig davon, mit wem du spielst. Zwei Männer oder zwei Frauen, die
              beide in derselben Branche arbeiten und danach noch ein Glas trinken, sind genau der
              Fall, für den dieser Schritt existiert.
            </Caption>
          </Stack>
        ) : null}

        {step.id === 'intent' ? (
          <Stack gap={5}>
            <Stack gap={2}>
              <Label>Worum geht es dir?</Label>
              <ChoiceGroup
                options={INTENT_OPTIONS}
                value={[form.intent]}
                onChange={([intent]) => intent && patch({ intent })}
              />
              <Caption tone="soft">{INTENT_HINTS[form.intent]}</Caption>
            </Stack>
            <Stack gap={2}>
              <Label>Mit wem möchtest du spielen?</Label>
              <ChoiceGroup
                options={SEEKING_OPTIONS}
                value={form.seeking}
                multiple
                onChange={(seeking) => patch({ seeking })}
              />
            </Stack>
            <Stack gap={2}>
              <Label>Alter von</Label>
              <Stepper
                label="Mindestalter"
                value={form.ageMin}
                onChange={(ageMin) => patch({ ageMin: Math.min(ageMin, form.ageMax) })}
                min={18}
                max={99}
                format={(value) => `${value} Jahre`}
              />
              <Label>Alter bis</Label>
              <Stepper
                label="Höchstalter"
                value={form.ageMax}
                onChange={(ageMax) => patch({ ageMax: Math.max(ageMax, form.ageMin) })}
                min={18}
                max={99}
                format={(value) => `${value} Jahre`}
              />
            </Stack>
          </Stack>
        ) : null}

        {step.id === 'bio' ? (
          <Stack gap={4}>
            <Input
              value={form.bio}
              onChangeText={(bio) => patch({ bio })}
              placeholder="Suche einen regelmässigen Partner für Dienstag- und Donnerstagabend. Lieber zweimal locker als einmal verkrampft."
              multiline
              maxLength={600}
            />
            <Caption tone="muted">{600 - form.bio.length} Zeichen übrig</Caption>
          </Stack>
        ) : null}

        {error ? <Body tone="danger">{error}</Body> : null}

        <Stack gap={2}>
          <Button
            label={index === STEPS.length - 1 ? 'Profil speichern' : 'Weiter'}
            loading={saving}
            onPress={() => void next()}
          />
          {index > 0 ? (
            <Button label="Zurück" variant="ghost" onPress={() => setIndex(index - 1)} />
          ) : null}
        </Stack>
      </Stack>
    </Screen>
  );
}

/**
 * Live feedback on the level step. Showing the derived strength as an
 * approximate classification gives unclassified players a vocabulary they can
 * sanity-check, instead of a hidden number deciding their matches.
 */
function LevelPreview({ form }: { form: ProfileForm }) {
  const estimate = estimateLevel({
    classification: form.classification === 'unclassified' ? null : form.classification,
    yearsPlaying: form.yearsPlaying,
    interclub: form.interclub,
    rallyConsistency: form.rallyConsistency,
    selfRating: form.classification === 'unclassified' ? form.selfRating : null,
  });

  if (!estimate.estimated) {
    return (
      <Body>
        Klassiert {form.classification} — wir suchen dir Gegner zwischen einer Klasse stärker und
        einer Klasse schwächer.
      </Body>
    );
  }

  return (
    <Stack gap={1}>
      <Body>Etwa auf dem Niveau {strengthToApproxClassification(estimate.strength)}.</Body>
      <Caption tone="muted">
        Geschätzt, weil du unklassiert bist. Wir suchen deshalb in einem breiteren Bereich statt
        eine Genauigkeit vorzutäuschen, die es nicht gibt.
      </Caption>
    </Stack>
  );
}
