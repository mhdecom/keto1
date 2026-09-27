import * as Haptics from 'expo-haptics';
import React, { forwardRef, useImperativeHandle } from 'react';
import { Dimensions, Platform, StyleSheet, Text, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import type { MatchCandidate } from '../domain/matching';
import type { SwipeDirection } from '../domain/types';
import { useTheme } from '../theme';
import { PlayerCard } from './PlayerCard';

const SCREEN_WIDTH = Dimensions.get('window').width;
/** A third of the screen: far enough to be deliberate, short enough to be easy. */
const SWIPE_THRESHOLD = SCREEN_WIDTH * 0.32;
const FLICK_VELOCITY = 800;

export interface SwipeDeckHandle {
  swipe: (direction: SwipeDirection) => void;
}

function OverlayStamp({ text, color }: { text: string; color: string }) {
  return (
    <View
      style={{
        borderWidth: 4,
        borderColor: color,
        borderRadius: 10,
        paddingHorizontal: 14,
        paddingVertical: 6,
      }}
    >
      <Text style={{ color, fontSize: 24, fontWeight: '900', letterSpacing: 2 }}>{text}</Text>
    </View>
  );
}

const TopCard = forwardRef<
  SwipeDeckHandle,
  { candidate: MatchCandidate; onSwipe: (direction: SwipeDirection) => void }
>(function TopCard({ candidate, onSwipe }, ref) {
  const theme = useTheme();
  const x = useSharedValue(0);
  const y = useSharedValue(0);

  const commit = (direction: SwipeDirection) => {
    if (Platform.OS !== 'web') {
      void Haptics.impactAsync(
        direction === 'like'
          ? Haptics.ImpactFeedbackStyle.Medium
          : Haptics.ImpactFeedbackStyle.Light,
      );
    }
    onSwipe(direction);
  };

  // Marked as a worklet so the gesture's onEnd (UI thread) can call it; calling
  // it from the buttons on the JS thread is also fine, the animation is
  // scheduled on the UI thread either way.
  const fling = (direction: SwipeDirection) => {
    'worklet';
    const target = direction === 'like' ? SCREEN_WIDTH * 1.4 : -SCREEN_WIDTH * 1.4;
    x.value = withTiming(target, { duration: 200 }, (finished) => {
      if (finished) runOnJS(commit)(direction);
    });
  };

  useImperativeHandle(ref, () => ({
    // The Like/Pass buttons run the same animation as a drag, so the two input
    // paths cannot diverge.
    swipe: fling,
  }));

  const pan = Gesture.Pan()
    .onUpdate((event) => {
      x.value = event.translationX;
      y.value = event.translationY;
    })
    .onEnd((event) => {
      const decided =
        Math.abs(x.value) > SWIPE_THRESHOLD || Math.abs(event.velocityX) > FLICK_VELOCITY;
      if (decided) {
        fling(x.value > 0 ? 'like' : 'pass');
        return;
      }
      x.value = withSpring(0, { damping: 18 });
      y.value = withSpring(0, { damping: 18 });
    });

  const cardStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: x.value },
      { translateY: y.value },
      // Rotate around the bottom of the card, the way a real card pivots.
      { rotate: `${interpolate(x.value, [-SCREEN_WIDTH, 0, SCREEN_WIDTH], [-12, 0, 12])}deg` },
    ],
  }));

  const likeStyle = useAnimatedStyle(() => ({
    opacity: interpolate(x.value, [0, SWIPE_THRESHOLD], [0, 1], 'clamp'),
  }));

  const passStyle = useAnimatedStyle(() => ({
    opacity: interpolate(x.value, [-SWIPE_THRESHOLD, 0], [1, 0], 'clamp'),
  }));

  return (
    <GestureDetector gesture={pan}>
      <Animated.View style={[StyleSheet.absoluteFill, cardStyle]}>
        <PlayerCard candidate={candidate} />
        <Animated.View
          pointerEvents="none"
          style={[{ position: 'absolute', top: 28, left: 24, transform: [{ rotate: '-12deg' }] }, likeStyle]}
        >
          <OverlayStamp text="SPIELEN" color={theme.colors.like} />
        </Animated.View>
        <Animated.View
          pointerEvents="none"
          style={[{ position: 'absolute', top: 28, right: 24, transform: [{ rotate: '12deg' }] }, passStyle]}
        >
          <OverlayStamp text="WEITER" color={theme.colors.pass} />
        </Animated.View>
      </Animated.View>
    </GestureDetector>
  );
});

/**
 * Renders the top card plus a peek of the next one, so the deck reads as a
 * stack with something behind it rather than a single card that vanishes.
 */
export const SwipeDeck = forwardRef<
  SwipeDeckHandle,
  { candidates: MatchCandidate[]; onSwipe: (candidate: MatchCandidate, direction: SwipeDirection) => void }
>(function SwipeDeck({ candidates, onSwipe }, ref) {
  const top = candidates[0];
  const next = candidates[1];

  if (!top) return null;

  return (
    <View style={{ flex: 1 }}>
      {next ? (
        <View
          style={[
            StyleSheet.absoluteFill,
            { transform: [{ scale: 0.95 }, { translateY: 12 }], opacity: 0.6 },
          ]}
          pointerEvents="none"
        >
          <PlayerCard candidate={next} />
        </View>
      ) : null}
      <TopCard
        // Keyed by player so each card mounts with its own animation state at
        // rest — no manual resetting of shared values between cards.
        key={top.player.id}
        ref={ref}
        candidate={top}
        onSwipe={(direction) => onSwipe(top, direction)}
      />
    </View>
  );
});
