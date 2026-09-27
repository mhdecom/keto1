import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { hasSlot, toggleSlot } from '../domain/availability';
import { DAY_LABELS, TIME_BLOCKS, type AvailabilityMask, type TimeBlock } from '../domain/types';
import { useTheme } from '../theme';
import { Caption, Row } from './ui';

const BLOCK_SHORT: Record<TimeBlock, string> = {
  morning: 'Früh',
  midday: 'Mittag',
  evening: 'Abend',
};

/**
 * Weekly availability grid, 7 days x 3 blocks.
 *
 * Deliberately coarse. Asking for exact times produces a grid nobody fills in;
 * asking "which evenings roughly work" produces one everybody fills in, and the
 * overlap of two such grids is what the matching actually needs.
 *
 * `highlight` marks the slots shared with another player, which is how a
 * candidate's grid is rendered on their profile.
 */
export function SlotGrid({
  mask,
  onChange,
  highlight = 0,
  compact = false,
}: {
  mask: AvailabilityMask;
  onChange?: (next: AvailabilityMask) => void;
  highlight?: AvailabilityMask;
  compact?: boolean;
}) {
  const theme = useTheme();
  const cell = compact ? 26 : 34;
  const readOnly = !onChange;

  return (
    <View style={{ gap: theme.spacing(1.5) }}>
      <Row gap={1.5}>
        <View style={{ width: compact ? 44 : 54 }} />
        {DAY_LABELS.map((day) => (
          <View key={day} style={{ width: cell, alignItems: 'center' }}>
            <Text style={{ fontSize: theme.font.tiny, fontWeight: '700', color: theme.colors.textMuted }}>
              {day}
            </Text>
          </View>
        ))}
      </Row>

      {TIME_BLOCKS.map((block) => (
        <Row key={block} gap={1.5}>
          <View style={{ width: compact ? 44 : 54 }}>
            <Text style={{ fontSize: theme.font.tiny, color: theme.colors.textMuted }}>
              {BLOCK_SHORT[block]}
            </Text>
          </View>
          {DAY_LABELS.map((day, dayIndex) => {
            const active = hasSlot(mask, dayIndex, block);
            const shared = hasSlot(highlight, dayIndex, block);
            const background = shared
              ? theme.colors.accent
              : active
                ? theme.colors.primary
                : theme.colors.surface;

            const content = (
              <View
                style={{
                  width: cell,
                  height: cell,
                  borderRadius: theme.radius.sm,
                  backgroundColor: background,
                  borderWidth: StyleSheet.hairlineWidth,
                  borderColor: active || shared ? 'transparent' : theme.colors.border,
                }}
              />
            );

            if (readOnly) return <View key={`${day}-${block}`}>{content}</View>;
            return (
              <Pressable
                key={`${day}-${block}`}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: active }}
                accessibilityLabel={`${day} ${BLOCK_SHORT[block]}`}
                onPress={() => onChange(toggleSlot(mask, dayIndex, block))}
                style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
              >
                {content}
              </Pressable>
            );
          })}
        </Row>
      ))}

      {highlight !== 0 ? (
        <Caption tone="muted">Orange = passt mit deinen Zeiten zusammen</Caption>
      ) : null}
    </View>
  );
}
