/**
 * QuestionCard
 *
 * Animated card that displays a single roast question and its answer options.
 *
 * - Entering animation: SlideInRight with spring physics
 * - Dark surface background (#1A1A1A), border radius 20
 * - Question text: large bold white (BebasNeue display font)
 * - Delegates option rendering to AnswerOption
 */

import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { SlideInRight } from 'react-native-reanimated';

import { AnswerOption } from '@/components/roast/AnswerOption';
import { colors, typography, spacing, borderRadius } from '@/constants/theme';
import type { Question } from '@/types/database';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/**
 * Spring configuration for the SlideInRight entering animation.
 * Tuned for a snappy but not jarring feel.
 */
const ENTER_SPRING = {
  damping: 18,
  stiffness: 220,
  mass: 0.9,
};

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface QuestionCardProps {
  /** The question to display. */
  question: Question;
  /** Currently selected answer value, or null if none selected yet. */
  selectedValue: string | null;
  /**
   * Called when the user selects an answer.
   *
   * @param value - The option's internal value.
   * @param label - The option's display label.
   */
  onAnswer: (value: string, label: string) => void;
  /**
   * Used as the key for re-mounting the component on question change,
   * which triggers the entering animation. Pass the question index.
   */
  animationKey: number;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * Renders an animated question card with selectable answer options.
 *
 * @param question      - Question data from the database.
 * @param selectedValue - Currently selected option value.
 * @param onAnswer      - Callback fired when an option is tapped.
 * @param animationKey  - Changes on each question to trigger re-mount animation.
 */
export function QuestionCard({
  question,
  selectedValue,
  onAnswer,
  animationKey,
}: QuestionCardProps): React.ReactElement {
  return (
    <Animated.View
      key={animationKey}
      entering={SlideInRight.springify()
        .damping(ENTER_SPRING.damping)
        .stiffness(ENTER_SPRING.stiffness)
        .mass(ENTER_SPRING.mass)}
      style={styles.card}
    >
      {/* Question text */}
      <Text style={styles.questionText}>{question.text}</Text>

      {/* Category badge */}
      <View style={styles.categoryBadge}>
        <Text style={styles.categoryText}>{question.category.toUpperCase()}</Text>
      </View>

      {/* Answer options */}
      <View style={styles.optionsContainer}>
        {question.options.map((option) => (
          <AnswerOption
            key={option.value}
            label={option.label}
            value={option.value}
            isSelected={selectedValue === option.value}
            onPress={onAnswer}
          />
        ))}
      </View>
    </Animated.View>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,    // #1A1A1A
    borderRadius: borderRadius.xl,      // 20
    padding: spacing.lg,
    gap: spacing.md,
  },
  questionText: {
    fontFamily: typography.fontDisplay,  // BebasNeue
    fontSize: typography.sizes.xxl,     // 32
    color: colors.textPrimary,
    lineHeight: 38,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  categoryBadge: {
    alignSelf: 'flex-start',
    backgroundColor: colors.surfaceElevated,
    borderRadius: borderRadius.full,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
  },
  categoryText: {
    fontFamily: typography.fontMono,
    fontSize: typography.sizes.xs,
    color: colors.textMuted,
    letterSpacing: 1,
  },
  optionsContainer: {
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
});
