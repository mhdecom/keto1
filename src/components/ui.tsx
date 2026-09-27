import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme, type Theme } from '../theme';

// ---------------------------------------------------------------------------
// Layout
// ---------------------------------------------------------------------------

export function Screen({
  children,
  scroll = false,
  padded = true,
  style,
}: {
  children: React.ReactNode;
  scroll?: boolean;
  padded?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const theme = useTheme();
  const inner: StyleProp<ViewStyle> = [
    { flex: scroll ? undefined : 1 },
    padded && { paddingHorizontal: theme.spacing(5) },
    style,
  ];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.background }} edges={['top']}>
      {scroll ? (
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={[inner, { paddingBottom: theme.spacing(10) }]}
          keyboardShouldPersistTaps="handled"
        >
          {children}
        </ScrollView>
      ) : (
        <View style={inner}>{children}</View>
      )}
    </SafeAreaView>
  );
}

export function Stack({
  children,
  gap = 3,
  style,
}: {
  children: React.ReactNode;
  gap?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const theme = useTheme();
  return <View style={[{ gap: theme.spacing(gap) }, style]}>{children}</View>;
}

export function Row({
  children,
  gap = 2,
  wrap = false,
  align = 'center',
  justify = 'flex-start',
  style,
}: {
  children: React.ReactNode;
  gap?: number;
  wrap?: boolean;
  align?: ViewStyle['alignItems'];
  justify?: ViewStyle['justifyContent'];
  style?: StyleProp<ViewStyle>;
}) {
  const theme = useTheme();
  return (
    <View
      style={[
        {
          flexDirection: 'row',
          alignItems: align,
          justifyContent: justify,
          gap: theme.spacing(gap),
          flexWrap: wrap ? 'wrap' : 'nowrap',
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

export function Card({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  const theme = useTheme();
  return (
    <View
      style={[
        {
          backgroundColor: theme.colors.surface,
          borderRadius: theme.radius.md,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: theme.colors.border,
          padding: theme.spacing(4),
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Text
// ---------------------------------------------------------------------------

type TextTone = 'default' | 'soft' | 'muted' | 'accent' | 'danger';

function toneColor(theme: Theme, tone: TextTone): string {
  switch (tone) {
    case 'soft':
      return theme.colors.textSoft;
    case 'muted':
      return theme.colors.textMuted;
    case 'accent':
      return theme.colors.accent;
    case 'danger':
      return theme.colors.danger;
    default:
      return theme.colors.text;
  }
}

export function Display({ children, style }: { children: React.ReactNode; style?: StyleProp<TextStyle> }) {
  const theme = useTheme();
  return (
    <Text
      style={[
        { fontSize: theme.font.display, fontWeight: '800', color: theme.colors.text, letterSpacing: -0.5 },
        style,
      ]}
    >
      {children}
    </Text>
  );
}

export function Title({
  children,
  tone = 'default',
  style,
}: {
  children: React.ReactNode;
  tone?: TextTone;
  style?: StyleProp<TextStyle>;
}) {
  const theme = useTheme();
  return (
    <Text style={[{ fontSize: theme.font.title, fontWeight: '700', color: toneColor(theme, tone) }, style]}>
      {children}
    </Text>
  );
}

export function Body({
  children,
  tone = 'default',
  style,
  numberOfLines,
}: {
  children: React.ReactNode;
  tone?: TextTone;
  style?: StyleProp<TextStyle>;
  numberOfLines?: number;
}) {
  const theme = useTheme();
  return (
    <Text
      numberOfLines={numberOfLines}
      style={[{ fontSize: theme.font.body, lineHeight: 21, color: toneColor(theme, tone) }, style]}
    >
      {children}
    </Text>
  );
}

export function Caption({
  children,
  tone = 'muted',
  style,
}: {
  children: React.ReactNode;
  tone?: TextTone;
  style?: StyleProp<TextStyle>;
}) {
  const theme = useTheme();
  return (
    <Text style={[{ fontSize: theme.font.small, color: toneColor(theme, tone) }, style]}>{children}</Text>
  );
}

export function Label({ children }: { children: React.ReactNode }) {
  const theme = useTheme();
  return (
    <Text
      style={{
        fontSize: theme.font.tiny,
        fontWeight: '700',
        letterSpacing: 1,
        textTransform: 'uppercase',
        color: theme.colors.textMuted,
      }}
    >
      {children}
    </Text>
  );
}

// ---------------------------------------------------------------------------
// Controls
// ---------------------------------------------------------------------------

export function Button({
  label,
  onPress,
  variant = 'primary',
  disabled = false,
  loading = false,
  style,
}: {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  disabled?: boolean;
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const theme = useTheme();
  const inactive = disabled || loading;

  const background =
    variant === 'primary'
      ? theme.colors.primary
      : variant === 'danger'
        ? theme.colors.danger
        : variant === 'secondary'
          ? theme.colors.surface
          : 'transparent';

  const foreground =
    variant === 'primary'
      ? theme.colors.onPrimary
      : variant === 'danger'
        ? theme.colors.onAccent
        : theme.colors.text;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: inactive }}
      onPress={inactive ? undefined : onPress}
      style={({ pressed }) => [
        {
          backgroundColor: background,
          opacity: inactive ? 0.45 : pressed ? 0.85 : 1,
          borderRadius: theme.radius.pill,
          paddingVertical: theme.spacing(3.5),
          paddingHorizontal: theme.spacing(6),
          alignItems: 'center',
          justifyContent: 'center',
          borderWidth: variant === 'secondary' ? StyleSheet.hairlineWidth : 0,
          borderColor: theme.colors.border,
          minHeight: 48,
        },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={foreground} />
      ) : (
        <Text style={{ color: foreground, fontWeight: '700', fontSize: theme.font.body }}>{label}</Text>
      )}
    </Pressable>
  );
}

export function Chip({
  label,
  selected = false,
  onPress,
  tone = 'neutral',
}: {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  tone?: 'neutral' | 'positive' | 'negative';
}) {
  const theme = useTheme();

  const selectedBackground =
    tone === 'positive'
      ? theme.colors.like
      : tone === 'negative'
        ? theme.colors.accent
        : theme.colors.primary;

  const background = selected ? selectedBackground : theme.colors.surface;
  const foreground = selected
    ? tone === 'neutral'
      ? theme.colors.onPrimary
      : theme.colors.onAccent
    : theme.colors.textSoft;

  const content = (
    <View
      style={{
        backgroundColor: background,
        borderRadius: theme.radius.pill,
        paddingVertical: theme.spacing(2),
        paddingHorizontal: theme.spacing(3.5),
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: selected ? 'transparent' : theme.colors.border,
      }}
    >
      <Text style={{ color: foreground, fontSize: theme.font.small, fontWeight: selected ? '700' : '500' }}>
        {label}
      </Text>
    </View>
  );

  if (!onPress) return content;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
    >
      {content}
    </Pressable>
  );
}

export function Input({
  value,
  onChangeText,
  placeholder,
  multiline = false,
  keyboardType = 'default',
  maxLength,
}: {
  value: string;
  onChangeText: (next: string) => void;
  placeholder?: string;
  multiline?: boolean;
  keyboardType?: 'default' | 'number-pad';
  maxLength?: number;
}) {
  const theme = useTheme();
  return (
    <TextInput
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor={theme.colors.textMuted}
      multiline={multiline}
      keyboardType={keyboardType}
      maxLength={maxLength}
      style={{
        backgroundColor: theme.colors.surface,
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: theme.colors.border,
        borderRadius: theme.radius.sm,
        paddingHorizontal: theme.spacing(3.5),
        paddingVertical: theme.spacing(3),
        fontSize: theme.font.body,
        color: theme.colors.text,
        minHeight: multiline ? 96 : 48,
        textAlignVertical: multiline ? 'top' : 'center',
      }}
    />
  );
}

/**
 * Single- or multi-select chip group. Used throughout onboarding — a tennis
 * profile is mostly a series of small closed choices, and chips make them
 * faster to fill than dropdowns.
 */
export function ChoiceGroup<T extends string>({
  options,
  value,
  onChange,
  multiple = false,
  tone = 'neutral',
}: {
  options: ReadonlyArray<{ value: T; label: string }>;
  value: T[];
  onChange: (next: T[]) => void;
  multiple?: boolean;
  tone?: 'neutral' | 'positive' | 'negative';
}) {
  return (
    <Row wrap gap={2}>
      {options.map((option) => (
        <Chip
          key={option.value}
          label={option.label}
          tone={tone}
          selected={value.includes(option.value)}
          onPress={() => {
            if (!multiple) {
              onChange([option.value]);
              return;
            }
            onChange(
              value.includes(option.value)
                ? value.filter((item) => item !== option.value)
                : [...value, option.value],
            );
          }}
        />
      ))}
    </Row>
  );
}

export function Stepper({
  value,
  onChange,
  min,
  max,
  step = 1,
  format = (v: number) => String(v),
  label,
}: {
  value: number;
  onChange: (next: number) => void;
  min: number;
  max: number;
  step?: number;
  format?: (value: number) => string;
  label: string;
}) {
  const theme = useTheme();
  const button = (symbol: string, next: number, enabled: boolean) => (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${label} ${symbol === '−' ? 'verringern' : 'erhöhen'}`}
      disabled={!enabled}
      onPress={() => onChange(next)}
      style={{
        width: 40,
        height: 40,
        borderRadius: theme.radius.pill,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: theme.colors.surface,
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: theme.colors.border,
        opacity: enabled ? 1 : 0.35,
      }}
    >
      <Text style={{ fontSize: 20, color: theme.colors.text, fontWeight: '600' }}>{symbol}</Text>
    </Pressable>
  );

  return (
    <Row justify="space-between">
      {button('−', Math.max(min, value - step), value > min)}
      <Body style={{ fontWeight: '700', fontVariant: ['tabular-nums'] }}>{format(value)}</Body>
      {button('+', Math.min(max, value + step), value < max)}
    </Row>
  );
}

// ---------------------------------------------------------------------------
// Display helpers
// ---------------------------------------------------------------------------

const AVATAR_COLORS = ['#C2593A', '#14573F', '#A9B72E', '#4A6FA5', '#8B5E83', '#B07B3C'];

/**
 * Initials avatar. No photo uploads in the MVP on purpose: a matching
 * algorithm is easier to judge when the cards are not decided by the picture,
 * and it keeps the demo free of stock-photo strangers.
 */
export function Avatar({ name, size = 48 }: { name: string; size?: number }) {
  const theme = useTheme();
  let hash = 0;
  for (let i = 0; i < name.length; i += 1) hash = (hash * 31 + name.charCodeAt(i)) % 997;
  const background = AVATAR_COLORS[hash % AVATAR_COLORS.length];

  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: background,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Text style={{ color: '#FFFFFF', fontSize: size * 0.4, fontWeight: '700' }}>
        {name.slice(0, 1).toUpperCase()}
      </Text>
    </View>
  );
}

export function Badge({ text, tone = 'neutral' }: { text: string; tone?: 'neutral' | 'accent' | 'primary' }) {
  const theme = useTheme();
  const background =
    tone === 'accent' ? theme.colors.accent : tone === 'primary' ? theme.colors.primary : theme.colors.border;
  const color =
    tone === 'accent'
      ? theme.colors.onAccent
      : tone === 'primary'
        ? theme.colors.onPrimary
        : theme.colors.textSoft;

  return (
    <View
      style={{
        backgroundColor: background,
        borderRadius: theme.radius.sm,
        paddingHorizontal: theme.spacing(2),
        paddingVertical: theme.spacing(1),
      }}
    >
      <Text style={{ color, fontSize: theme.font.tiny, fontWeight: '800', letterSpacing: 0.5 }}>{text}</Text>
    </View>
  );
}

/** Horizontal bar used to show one score factor. */
export function ScoreBar({ value, label }: { value: number; label: string }) {
  const theme = useTheme();
  return (
    <View style={{ gap: theme.spacing(1) }}>
      <Row justify="space-between">
        <Caption tone="soft">{label}</Caption>
        <Caption tone="muted">{Math.round(value * 100)}%</Caption>
      </Row>
      <View
        style={{
          height: 6,
          borderRadius: 3,
          backgroundColor: theme.colors.border,
          overflow: 'hidden',
        }}
      >
        <View
          style={{
            width: `${Math.max(2, Math.round(value * 100))}%`,
            height: '100%',
            borderRadius: 3,
            backgroundColor: value >= 0.66 ? theme.colors.like : value >= 0.35 ? theme.colors.accent : theme.colors.pass,
          }}
        />
      </View>
    </View>
  );
}

export function Empty({ title, hint }: { title: string; hint?: string }) {
  const theme = useTheme();
  return (
    <View style={{ alignItems: 'center', justifyContent: 'center', flex: 1, gap: theme.spacing(2), padding: theme.spacing(6) }}>
      <Title tone="soft" style={{ textAlign: 'center' }}>
        {title}
      </Title>
      {hint ? <Body tone="muted" style={{ textAlign: 'center' }}>{hint}</Body> : null}
    </View>
  );
}

export function Loading({ label }: { label?: string }) {
  const theme = useTheme();
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: theme.spacing(3) }}>
      <ActivityIndicator color={theme.colors.accent} />
      {label ? <Caption>{label}</Caption> : null}
    </View>
  );
}
