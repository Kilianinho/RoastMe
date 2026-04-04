import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  useAnimatedProps,
  useSharedValue,
  withTiming,
  Easing,
  interpolate,
  useAnimatedStyle,
} from 'react-native-reanimated';
import Svg, { Circle } from 'react-native-svg';
import { colors, typography, spacing } from '@/constants/theme';

const RADIUS = 54;
const STROKE_WIDTH = 10;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
const SVG_SIZE = (RADIUS + STROKE_WIDTH) * 2;

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

interface FireScoreGaugeProps {
  /** Score from 0 to 100 */
  score: number;
  subtitle: string;
}

/**
 * Circular progress ring displaying the user's fire score (0-100).
 * Animates the ring and counts up from 0 to the target score on mount.
 *
 * @param score - Number between 0 and 100
 * @param subtitle - Contextual text shown below the gauge
 */
export function FireScoreGauge({ score, subtitle }: FireScoreGaugeProps): React.ReactElement {
  const clampedScore = Math.min(100, Math.max(0, score));
  const progress = useSharedValue(0);
  const [displayScore, setDisplayScore] = useState(0);

  useEffect(() => {
    progress.value = withTiming(clampedScore / 100, {
      duration: 1200,
      easing: Easing.out(Easing.cubic),
    });

    // Drive the JS-side counter in sync with the animation duration
    let start: number | null = null;
    let rafId: ReturnType<typeof requestAnimationFrame>;

    const tick = (ts: number): void => {
      if (start === null) start = ts;
      const elapsed = ts - start;
      const t = Math.min(elapsed / 1200, 1);
      // Mirror the Easing.out.cubic curve
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplayScore(Math.round(eased * clampedScore));
      if (t < 1) {
        rafId = requestAnimationFrame(tick);
      }
    };

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [clampedScore, progress]);

  const animatedCircleProps = useAnimatedProps(() => ({
    strokeDashoffset: CIRCUMFERENCE * (1 - progress.value),
  }));

  const gaugeOpacity = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 0.1], [0.5, 1]),
  }));

  const ringColor =
    clampedScore >= 80
      ? colors.primary
      : clampedScore >= 50
      ? colors.primaryLight
      : colors.secondary;

  return (
    <View style={styles.container} accessibilityLabel={`Fire score: ${clampedScore}/100`}>
      <Animated.View style={[styles.gaugeWrapper, gaugeOpacity]}>
        <Svg width={SVG_SIZE} height={SVG_SIZE}>
          {/* Track */}
          <Circle
            cx={SVG_SIZE / 2}
            cy={SVG_SIZE / 2}
            r={RADIUS}
            stroke={colors.surfaceBorder}
            strokeWidth={STROKE_WIDTH}
            fill="none"
          />
          {/* Progress */}
          <AnimatedCircle
            cx={SVG_SIZE / 2}
            cy={SVG_SIZE / 2}
            r={RADIUS}
            stroke={ringColor}
            strokeWidth={STROKE_WIDTH}
            fill="none"
            strokeDasharray={CIRCUMFERENCE}
            animatedProps={animatedCircleProps}
            strokeLinecap="round"
            rotation="-90"
            origin={`${SVG_SIZE / 2}, ${SVG_SIZE / 2}`}
          />
        </Svg>

        <View style={styles.scoreOverlay}>
          <Text style={styles.scoreText}>{displayScore}</Text>
          <Text style={styles.flameEmoji}>🔥</Text>
        </View>
      </Animated.View>

      <Text style={styles.subtitle} numberOfLines={2}>
        {subtitle}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    gap: spacing.sm,
  },
  gaugeWrapper: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    width: SVG_SIZE,
    height: SVG_SIZE,
  },
  scoreOverlay: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scoreText: {
    fontFamily: typography.fontDisplay,
    fontSize: typography.sizes.xxxl,
    color: colors.textPrimary,
    lineHeight: typography.sizes.xxxl + 4,
  },
  flameEmoji: {
    fontSize: 20,
    textAlign: 'center',
    marginTop: -4,
  },
  subtitle: {
    fontFamily: typography.fontBody,
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
    textAlign: 'center',
    maxWidth: 220,
  },
});
