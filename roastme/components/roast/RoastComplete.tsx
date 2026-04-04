/**
 * RoastComplete
 *
 * Shown after all 10 answers are submitted.
 *
 * - "Roast envoyé ! 🔥" title with ember burst animation (scale + opacity)
 * - 3 randomly selected funny answers displayed as recap cards
 * - CTA: "Crée ton propre profil" (always visible)
 * - Secondary CTA: "Voir si vous êtes compatibles" (only when authenticated)
 */

import React, { useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withDelay,
  withTiming,
  FadeIn,
  Easing,
} from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'expo-router';

import { colors, typography, spacing, borderRadius } from '@/constants/theme';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const EMBER_SPRING_CONFIG = {
  damping: 8,
  stiffness: 120,
  mass: 1.2,
};

const FUNKY_ANSWER_COUNT = 3;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface AnswerRecap {
  questionText: string;
  answerLabel: string;
}

interface RoastCompleteProps {
  /** Display name of the person being roasted. */
  roastedName: string;
  /** All answers from the session to pick funny ones from. */
  answers: AnswerRecap[];
  /** Whether the current user is authenticated. */
  isAuthenticated: boolean;
}

// ---------------------------------------------------------------------------
// Sub-component: ember burst title
// ---------------------------------------------------------------------------

function EmberTitle(): React.ReactElement {
  const { t } = useTranslation();
  const scale = useSharedValue(0.3);
  const opacity = useSharedValue(0);

  useEffect(() => {
    opacity.value = withDelay(
      100,
      withTiming(1, { duration: 400, easing: Easing.out(Easing.ease) }),
    );
    scale.value = withDelay(
      100,
      withSpring(1, EMBER_SPRING_CONFIG),
    );
  }, [opacity, scale]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View style={[styles.titleContainer, animatedStyle]}>
      <Text style={styles.emoji}>🔥</Text>
      <Text style={styles.title}>{t('roast.complete')}</Text>
      <Text style={styles.emoji}>🔥</Text>
    </Animated.View>
  );
}

// ---------------------------------------------------------------------------
// Sub-component: recap answer card
// ---------------------------------------------------------------------------

interface RecapCardProps {
  item: AnswerRecap;
  index: number;
}

function RecapCard({ item, index }: RecapCardProps): React.ReactElement {
  const translateY = useSharedValue(30);
  const opacity = useSharedValue(0);

  useEffect(() => {
    const delay = 300 + index * 150;
    opacity.value = withDelay(
      delay,
      withTiming(1, { duration: 350 }),
    );
    translateY.value = withDelay(
      delay,
      withSpring(0, { damping: 16, stiffness: 200 }),
    );
  }, [index, opacity, translateY]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  return (
    <Animated.View style={[styles.recapCard, animatedStyle]}>
      <Text style={styles.recapQuestion} numberOfLines={2}>
        {item.questionText}
      </Text>
      <View style={styles.recapAnswerRow}>
        <View style={styles.recapAnswerPill}>
          <Text style={styles.recapAnswerText}>{item.answerLabel}</Text>
        </View>
      </View>
    </Animated.View>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

/**
 * Completion screen shown after a roast session is submitted.
 *
 * @param roastedName      - First name of the person who was roasted.
 * @param answers          - All session answers; 3 are randomly selected for recap.
 * @param isAuthenticated  - Controls visibility of the compatibility CTA.
 */
export function RoastComplete({
  roastedName,
  answers,
  isAuthenticated,
}: RoastCompleteProps): React.ReactElement {
  const { t } = useTranslation();
  const router = useRouter();

  // Pick up to FUNKY_ANSWER_COUNT answers at random for the recap
  const recapAnswers = React.useMemo((): AnswerRecap[] => {
    if (answers.length <= FUNKY_ANSWER_COUNT) return answers;
    const shuffled = [...answers].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, FUNKY_ANSWER_COUNT);
  }, [answers]);

  function handleCreateProfile(): void {
    router.push('/');
  }

  function handleSeeCompatibility(): void {
    router.push('/(tabs)/matches');
  }

  return (
    <ScrollView
      style={styles.scrollView}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      {/* Ember burst title */}
      <EmberTitle />

      {/* Subtitle */}
      <Animated.Text
        entering={FadeIn.delay(500).duration(400)}
        style={styles.subtitle}
      >
        {t('roast.completeSubtitle')}
      </Animated.Text>

      {/* Recap cards */}
      {recapAnswers.length > 0 && (
        <View style={styles.recapContainer}>
          {recapAnswers.map((item, index) => (
            <RecapCard key={index} item={item} index={index} />
          ))}
        </View>
      )}

      {/* Divider */}
      <Animated.View
        entering={FadeIn.delay(800).duration(400)}
        style={styles.divider}
      />

      {/* CTAs */}
      <Animated.View
        entering={FadeIn.delay(900).duration(400)}
        style={styles.ctaContainer}
      >
        <TouchableOpacity
          style={styles.primaryCta}
          onPress={handleCreateProfile}
          activeOpacity={0.85}
          accessibilityRole="button"
          accessibilityLabel={t('roast.createOwn')}
        >
          <Text style={styles.primaryCtaText}>{t('roast.createOwn')}</Text>
          <Text style={styles.primaryCtaSubtext}>
            {t('roast.createOwnSubtitle')}
          </Text>
        </TouchableOpacity>

        {isAuthenticated && (
          <TouchableOpacity
            style={styles.secondaryCta}
            onPress={handleSeeCompatibility}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityLabel={t('roast.seeCompatibility')}
          >
            <Text style={styles.secondaryCtaText}>
              {t('roast.seeCompatibility')}
            </Text>
          </TouchableOpacity>
        )}
      </Animated.View>
    </ScrollView>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl,
    paddingTop: spacing.xl,
    gap: spacing.lg,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  emoji: {
    fontSize: 36,
  },
  title: {
    fontFamily: typography.fontDisplay,
    fontSize: typography.sizes.xxxl, // 48
    color: colors.textPrimary,
    textAlign: 'center',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  subtitle: {
    fontFamily: typography.fontBody,
    fontSize: typography.sizes.md,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  recapContainer: {
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  recapCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
  },
  recapQuestion: {
    fontFamily: typography.fontBody,
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  recapAnswerRow: {
    flexDirection: 'row',
  },
  recapAnswerPill: {
    backgroundColor: colors.primaryOverlay,
    borderRadius: borderRadius.full,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  recapAnswerText: {
    fontFamily: typography.fontBody,
    fontSize: typography.sizes.sm,
    color: colors.primary,
    fontWeight: '600',
  },
  divider: {
    height: 1,
    backgroundColor: colors.surfaceBorder,
    marginVertical: spacing.xs,
  },
  ctaContainer: {
    gap: spacing.md,
  },
  primaryCta: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
    gap: spacing.xs,
  },
  primaryCtaText: {
    fontFamily: typography.fontDisplay,
    fontSize: typography.sizes.xl,
    color: colors.textPrimary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  primaryCtaSubtext: {
    fontFamily: typography.fontBody,
    fontSize: typography.sizes.sm,
    color: 'rgba(255,255,255,0.8)',
  },
  secondaryCta: {
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
  },
  secondaryCtaText: {
    fontFamily: typography.fontBody,
    fontSize: typography.sizes.md,
    color: colors.textSecondary,
    fontWeight: '600',
  },
});
