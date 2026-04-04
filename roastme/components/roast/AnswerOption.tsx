/**
 * AnswerOption
 *
 * A tappable answer button for a roast question.
 *
 * - Idle: dark elevated surface (#252525), 1px border (#333)
 * - Selected: primary border (#FF4500), primary 15% bg overlay, scale 1.02
 * - Haptic feedback on press via expo-haptics
 */

import React, { useEffect } from 'react';
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';

import { colors, typography, spacing, borderRadius } from '@/constants/theme';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const SPRING_CONFIG = {
  damping: 15,
  stiffness: 300,
  mass: 0.8,
};

const SELECTED_SCALE = 1.02;

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface AnswerOptionProps {
  /** Display text for this answer. */
  label: string;
  /** Internal value stored when selected. */
  value: string;
  /** Whether this option is currently selected. */
  isSelected: boolean;
  /** Called with (value, label) when the user taps this option. */
  onPress: (value: string, label: string) => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * Renders a single selectable answer option with press animation and haptics.
 *
 * @param label      - Text shown to the user.
 * @param value      - Internal identifier passed to onPress.
 * @param isSelected - Controls selected visual state.
 * @param onPress    - Called when the user taps this option.
 */
export function AnswerOption({
  label,
  value,
  isSelected,
  onPress,
}: AnswerOptionProps): React.ReactElement {
  const scale = useSharedValue(1);

  useEffect(() => {
    scale.value = withSpring(isSelected ? SELECTED_SCALE : 1, SPRING_CONFIG);
  }, [isSelected, scale]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  function handlePress(): void {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {
      // Haptics not available on all devices — silently ignore
    });
    onPress(value, label);
  }

  return (
    <Animated.View style={animatedStyle}>
      <TouchableOpacity
        style={[styles.container, isSelected && styles.containerSelected]}
        onPress={handlePress}
        activeOpacity={0.85}
        accessibilityRole="radio"
        accessibilityState={{ selected: isSelected }}
        accessibilityLabel={label}
      >
        {isSelected && <View style={styles.selectedOverlay} />}
        <Text style={[styles.label, isSelected && styles.labelSelected]}>
          {label}
        </Text>
        {isSelected && <View style={styles.checkIndicator} />}
      </TouchableOpacity>
    </Animated.View>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surfaceElevated, // #252525
    borderRadius: borderRadius.md,           // 12
    borderWidth: 1,
    borderColor: colors.surfaceBorder,       // #333
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    overflow: 'hidden',
    minHeight: 56,
  },
  containerSelected: {
    borderColor: colors.primary, // #FF4500
  },
  selectedOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.primaryOverlay, // rgba(255, 69, 0, 0.15)
    borderRadius: borderRadius.md,
  },
  label: {
    flex: 1,
    fontFamily: typography.fontBody,
    fontSize: typography.sizes.md,
    color: colors.textPrimary,
    lineHeight: 22,
  },
  labelSelected: {
    color: colors.textPrimary,
    fontWeight: '600',
  },
  checkIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
    marginLeft: spacing.sm,
  },
});
