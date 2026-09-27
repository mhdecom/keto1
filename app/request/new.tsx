import { useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import {
  Body,
  Button,
  Caption,
  ChoiceGroup,
  Input,
  Label,
  Screen,
  Stack,
} from '../../src/components/ui';
import { FORMAT_OPTIONS } from '../../src/domain/labels';
import { classificationStrength } from '../../src/domain/level';
import {
  SWISS_CLASSIFICATIONS,
  TIME_BLOCKS,
  TIME_BLOCK_LABELS,
  type PlayFormat,
  type SwissClassification,
  type TimeBlock,
} from '../../src/domain/types';
import { VENUES } from '../../src/domain/venues';
import { useSession } from '../../src/state/session';

const DAYS_AHEAD = 14;

function upcomingDates(now = new Date()): Array<{ value: string; label: string }> {
  return Array.from({ length: DAYS_AHEAD }, (_, offset) => {
    const date = new Date(now);
    date.setDate(date.getDate() + offset);
    const iso = date.toISOString().slice(0, 10);
    const label =
      offset === 0
        ? 'Heute'
        : offset === 1
          ? 'Morgen'
          : date.toLocaleDateString('de-CH', { weekday: 'short', day: '2-digit', month: '2-digit' });
    return { value: iso, label };
  });
}

const TIME_OPTIONS = TIME_BLOCKS.map((value) => ({ value, label: TIME_BLOCK_LABELS[value] }));
const VENUE_OPTIONS = [
  { value: 'none', label: 'Ort noch offen' },
  ...VENUES.map((venue) => ({ value: venue.id, label: venue.name })),
];
const CLASSIFICATION_OPTIONS = SWISS_CLASSIFICATIONS.map((value) => ({ value, label: value }));

export default function NewRequest() {
  const router = useRouter();
  const { createRequest } = useSession();
  const dates = useMemo(() => upcomingDates(), []);

  const [date, setDate] = useState(dates[0].value);
  const [timeBlock, setTimeBlock] = useState<TimeBlock>('evening');
  const [venue, setVenue] = useState('none');
  const [format, setFormat] = useState<PlayFormat>('singles');
  const [note, setNote] = useState('');
  // Presented as a classification window because that is how players think
  // about level; stored as strength points so unclassified players match too.
  const [strongest, setStrongest] = useState<SwissClassification>('R4');
  const [weakest, setWeakest] = useState<SwissClassification>('R8');
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    setSaving(true);
    try {
      const a = classificationStrength(strongest);
      const b = classificationStrength(weakest);
      await createRequest({
        date,
        timeBlock,
        venueId: venue === 'none' ? null : venue,
        format,
        note: note.trim(),
        // Guard against the window being picked the wrong way round.
        minStrength: Math.min(a, b),
        maxStrength: Math.max(a, b),
      });
      router.back();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Screen scroll>
      <Stack gap={5} style={{ paddingTop: 12 }}>
        <Body tone="soft">
          Ein konkreter Termin bringt schneller ein Spiel als jedes Profil. Wenn du schon einen
          Platz hast, schreib es in die Notiz — dann sagt fast immer jemand zu.
        </Body>

        <Stack gap={2}>
          <Label>Wann</Label>
          <ChoiceGroup options={dates} value={[date]} onChange={([next]) => next && setDate(next)} />
        </Stack>

        <Stack gap={2}>
          <Label>Tageszeit</Label>
          <ChoiceGroup
            options={TIME_OPTIONS}
            value={[timeBlock]}
            onChange={([next]) => next && setTimeBlock(next)}
          />
        </Stack>

        <Stack gap={2}>
          <Label>Anlage</Label>
          <ChoiceGroup
            options={VENUE_OPTIONS}
            value={[venue]}
            onChange={([next]) => next && setVenue(next)}
          />
        </Stack>

        <Stack gap={2}>
          <Label>Spielform</Label>
          <ChoiceGroup
            options={FORMAT_OPTIONS}
            value={[format]}
            onChange={([next]) => next && setFormat(next)}
          />
        </Stack>

        <Stack gap={2}>
          <Label>Gesuchtes Niveau — von</Label>
          <ChoiceGroup
            options={CLASSIFICATION_OPTIONS}
            value={[strongest]}
            onChange={([next]) => next && setStrongest(next)}
          />
          <Label>bis</Label>
          <ChoiceGroup
            options={CLASSIFICATION_OPTIONS}
            value={[weakest]}
            onChange={([next]) => next && setWeakest(next)}
          />
          <Caption tone="muted">
            Unklassierte Spieler werden anhand ihrer Angaben in dieses Fenster einsortiert.
          </Caption>
        </Stack>

        <Stack gap={2}>
          <Label>Notiz</Label>
          <Input
            value={note}
            onChangeText={setNote}
            placeholder="Platz ist gebucht, 19:00–20:30. Partner ist krank geworden."
            multiline
            maxLength={400}
          />
        </Stack>

        <Button label="Anfrage veröffentlichen" loading={saving} onPress={() => void submit()} />
      </Stack>
    </Screen>
  );
}
