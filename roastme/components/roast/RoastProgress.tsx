/**
 * RoastProgress
 *
 * A row of 10 dot indicators showing how far the user is through the roast.
 *
 * - Completed dots: filled amber (#FFB800)
 * - Current dot:   filled primary (#FF4500) with a pulsing scale + glow animation
 * - Upcoming dots: outlined (#333333)
 */

import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  Easing,
} from 'react-native-reanimated';

import { colors, spacing } from '@/constants/theme';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const DOT_SIZE = 10;
const DOT_SPACING = 6;

const PULSE_DURATION_MS = 700;
const PULSE_SCALE_MAX = 1.4;

// ---------------------------------------------------------------------------
// Sub-component: single dot
// ---------------------------------------------------------------------------

type DotState = 'completed' | 'current' | 'upcoming';

interface DotProps {
  state: DotState;
}

function ProgressDot({ state }: DotProps): React.ReactElement {
  const scale = useSharedValue(1);

  useEffect(() => {
    if (state === 'current') {
      scale.value = withRepeat(
        withSequence(
          withTiming(PULSE_SCALE_MAX, {
            duration: PULSE_DURATION_MS,
            easing: Easing.inOut(Easing.ease),
          }),
          withTiming(1, {
            duration: PULSE_DURATION_MS,
            easing: Easing.inOut(Easing.ease),
          }),
        ),
        -1, // infinite
        false,
      );
    } else {
      scale.value = withTiming(1, { duration: 200 });
    }
  }, [state, scale]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const dotStyle =
    state === 'completed'
      ? styles.dotCompleted
      : state === 'current'
        ? styles.dotCurrent
        : styles.dotUpcoming;

  return (
    <Animated.View
      style={[styles.dot, dotStyle, animatedStyle]}
      accessibilityElementsHidden
    />
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

interface RoastProgressProps {
  /** Total number of questions (typically 10). */
  total: number;
  /** Zero-based index of the currently active question. */
  current: number;
}

/**
 * Renders a row of progress dots for the roast question flow.
 *
 * @param total   - Total question count.
 * @param current - Zero-based index of the active question.
 */
export function RoastProgress({
  total,
  current,
}: RoastProgressProps): React.ReactElement {
  return (
    <View style={styles.container} accessibilityLabel={`Question ${current + 1} sur ${total}`}>
      {Array.from({ length: total }, (_, i) => {
        const state: DotState =
          i < current ? 'completed' : i === current ? 'current' : 'upcoming';
        return <ProgressDot key={i} state={state} />;
      })}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: DOT_SPACING,
    paddingVertical: spacing.sm,
  },
  dot: {
    width: DOT_SIZE,
    height: DOT_SIZE,
    borderRadius: DOT_SIZE / 2,
  },
  dotCompleted: {
    backgroundColor: colors.secondary, // #FFB800 amber
  },
  dotCurrent: {
    backgroundColor: colors.primary, // #FF4500
    // Shadow for the glow effect (iOS)
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 6,
    // Android elevation doesn't support colored shadows — acceptable trade-off
    elevation: 4,
  },
  dotUpcoming: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: colors.surfaceBorder, // #333333
  },
});
