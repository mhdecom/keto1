import * as ImagePicker from 'expo-image-picker';
import React, { useState } from 'react';
import { ActivityIndicator, Alert, Image, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { photoSource } from '../data/photos';
import { useSession } from '../state/session';
import { useTheme } from '../theme';
import { Caption, Row } from './ui';

const TILE = 88;

/**
 * Photo management for your own profile.
 *
 * The first picture is the one that leads the card, so the order matters and
 * is shown explicitly rather than left implicit. Uploading goes through the
 * repository, which means this component works identically against the local
 * demo store and against Supabase Storage.
 */
export function PhotoPicker({
  photos,
  onChange,
  max = 6,
}: {
  photos: string[];
  onChange: (next: string[]) => void;
  max?: number;
}) {
  const theme = useTheme();
  const { repository } = useSession();
  const [busy, setBusy] = useState(false);

  const pick = async () => {
    if (Platform.OS !== 'web') {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert(
          'Kein Zugriff auf die Fotos',
          'Erlaube den Zugriff in den Einstellungen, um ein Bild hinzuzufügen.',
        );
        return;
      }
    }

    const remaining = max - photos.length;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: remaining > 1,
      selectionLimit: remaining,
      quality: 0.7,
    });
    if (result.canceled) return;

    setBusy(true);
    try {
      const saved = await Promise.all(
        result.assets.slice(0, remaining).map((asset) => repository.savePhoto(asset.uri)),
      );
      onChange([...photos, ...saved]);
    } catch (error) {
      Alert.alert(
        'Bild konnte nicht gespeichert werden',
        error instanceof Error ? error.message : 'Unbekannter Fehler',
      );
    } finally {
      setBusy(false);
    }
  };

  const remove = (photo: string) => onChange(photos.filter((item) => item !== photo));

  const makeFirst = (photo: string) =>
    onChange([photo, ...photos.filter((item) => item !== photo)]);

  return (
    <View style={{ gap: theme.spacing(2) }}>
      <Row wrap gap={2}>
        {photos.map((photo, index) => (
          <Pressable
            key={photo}
            onPress={() => makeFirst(photo)}
            accessibilityRole="button"
            accessibilityLabel={
              index === 0 ? 'Hauptbild' : `Bild ${index + 1} zum Hauptbild machen`
            }
            style={{
              width: TILE,
              height: TILE,
              borderRadius: theme.radius.md,
              overflow: 'hidden',
              // See PlayerCard: react-native-web needs this stated explicitly
              // or the absolutely positioned image escapes the tile.
              position: 'relative',
              borderWidth: index === 0 ? 2 : StyleSheet.hairlineWidth,
              borderColor: index === 0 ? theme.colors.accent : theme.colors.border,
            }}
          >
            <Image source={photoSource(photo)} style={StyleSheet.absoluteFill} resizeMode="cover" />
            {index === 0 ? (
              <View
                style={{
                  position: 'absolute',
                  left: 0,
                  right: 0,
                  bottom: 0,
                  backgroundColor: 'rgba(12,10,9,0.6)',
                  paddingVertical: 2,
                  alignItems: 'center',
                }}
              >
                <Text style={{ color: '#FFFFFF', fontSize: 10, fontWeight: '700' }}>HAUPTBILD</Text>
              </View>
            ) : null}
            <Pressable
              onPress={() => remove(photo)}
              accessibilityRole="button"
              accessibilityLabel={`Bild ${index + 1} entfernen`}
              hitSlop={6}
              style={{
                position: 'absolute',
                top: 4,
                right: 4,
                width: 22,
                height: 22,
                borderRadius: 11,
                backgroundColor: 'rgba(12,10,9,0.7)',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Text style={{ color: '#FFFFFF', fontSize: 14, lineHeight: 16 }}>×</Text>
            </Pressable>
          </Pressable>
        ))}

        {photos.length < max ? (
          <Pressable
            onPress={() => void pick()}
            disabled={busy}
            accessibilityRole="button"
            accessibilityLabel="Bild hinzufügen"
            style={({ pressed }) => ({
              width: TILE,
              height: TILE,
              borderRadius: theme.radius.md,
              borderWidth: StyleSheet.hairlineWidth,
              borderColor: theme.colors.border,
              backgroundColor: theme.colors.surface,
              alignItems: 'center',
              justifyContent: 'center',
              opacity: pressed || busy ? 0.6 : 1,
            })}
          >
            {busy ? (
              <ActivityIndicator color={theme.colors.accent} />
            ) : (
              <Text style={{ fontSize: 28, color: theme.colors.textMuted }}>+</Text>
            )}
          </Pressable>
        ) : null}
      </Row>

      <Caption tone="muted">
        {photos.length === 0
          ? 'Ohne Bild bekommst du einen Initialen-Avatar — das funktioniert, aber ein Foto hilft der Gegenseite einzuschätzen, mit wem sie sich trifft.'
          : 'Das erste Bild führt deine Karte an. Tippe ein anderes an, um es nach vorne zu holen.'}
      </Caption>
    </View>
  );
}
