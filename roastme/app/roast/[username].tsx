/**
 * app/roast/[username].tsx
 *
 * The public roast page — accessible without authentication at:
 *   roast.me/[username]  →  exp://roastme/roast/[username]
 *
 * Flow:
 *   1. Resolve [username] param → fetch profile → guard: not found / roasting self
 *   2. Create roast_session in Supabase, fetch 10 random questions
 *   3. Present questions one at a time with SlideInRight animation
 *   4. User selects answer → haptic feedback → store answer → show "Next" button
 *   5. After Q10 → batch-submit answers → show RoastComplete screen
 *
 * Security:
 *   - Honeypot: hidden text input; non-empty value silently aborts submission
 *   - No back navigation allowed (disableBackButton + no back gesture)
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  BackHandler,
  Platform,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { useLocalSearchParams, useNavigation } from 'expo-router';
import { useTranslation } from 'react-i18next';
import * as Haptics from 'expo-haptics';

import { QuestionCard } from '@/components/roast/QuestionCard';
import { RoastProgress } from '@/components/roast/RoastProgress';
import { RoastComplete } from '@/components/roast/RoastComplete';
import type { AnswerRecap } from '@/components/roast/RoastComplete';

import { useRoastSession } from '@/hooks/useRoastSession';
import { useRoastStore } from '@/stores/roastStore';
import { useAuthStore } from '@/stores/authStore';
import { logger } from '@/utils/logger';
import { colors, typography, spacing, borderRadius } from '@/constants/theme';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const QUESTION_COUNT = 10;

// ---------------------------------------------------------------------------
// Error screen
// ---------------------------------------------------------------------------

interface ErrorScreenProps {
  message: string;
  onGoBack?: () => void;
}

function ErrorScreen({ message, onGoBack }: ErrorScreenProps): React.ReactElement {
  const { t } = useTranslation();
  return (
    <SafeAreaView style={styles.centerContainer}>
      <Text style={styles.errorEmoji}>😬</Text>
      <Text style={styles.errorTitle}>{message}</Text>
      {onGoBack && (
        <TouchableOpacity
          style={styles.backButton}
          onPress={onGoBack}
          accessibilityLabel={t('common.back')}
          accessibilityRole="button"
        >
          <Text style={styles.backButtonText}>{t('common.back')}</Text>
        </TouchableOpacity>
      )}
    </SafeAreaView>
  );
}

// ---------------------------------------------------------------------------
// Loading screen
// ---------------------------------------------------------------------------

function LoadingScreen(): React.ReactElement {
  const { t } = useTranslation();
  return (
    <SafeAreaView style={styles.centerContainer}>
      <ActivityIndicator size="large" color={colors.primary} />
      <Text style={styles.loadingText}>{t('common.loading')}</Text>
    </SafeAreaView>
  );
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

/**
 * Public roast page driven by the [username] route param.
 *
 * No authentication required. Anonymous sessions are supported via
 * a persistent UUID stored in AsyncStorage.
 */
export default function RoastPage(): React.ReactElement {
  const { username } = useLocalSearchParams<{ username: string }>();
  const { t } = useTranslation();
  const navigation = useNavigation();

  const { status, sessionError, createSession, submitAnswers } =
    useRoastSession();

  const store = useRoastStore();
  const { user } = useAuthStore();

  // Honeypot value — if non-empty on submit, the submission is silently dropped
  const honeypotRef = useRef('');

  // Track whether the submit has been triggered to prevent double-fire
  const hasSubmitted = useRef(false);

  // The value currently selected for the active question (not yet committed)
  const [pendingValue, setPendingValue] = useState<string | null>(null);
  const [pendingLabel, setPendingLabel] = useState<string | null>(null);

  // ---------------------------------------------------------------------------
  // Disable back navigation
  // ---------------------------------------------------------------------------

  useEffect(() => {
    navigation.setOptions({
      gestureEnabled: false,
      headerLeft: () => null,
    });

    // Android hardware back button
    if (Platform.OS === 'android') {
      const subscription = BackHandler.addEventListener(
        'hardwareBackPress',
        () => true, // returning true prevents default back behaviour
      );
      return () => subscription.remove();
    }

    return undefined;
  }, [navigation]);

  // ---------------------------------------------------------------------------
  // Bootstrap: create session on mount
  // ---------------------------------------------------------------------------

  useEffect(() => {
    if (!username) {
      logger.warn('RoastPage: missing username param');
      return;
    }
    store.reset();
    createSession(username);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [username]);

  // Reset pending selection when the question changes
  useEffect(() => {
    setPendingValue(null);
    setPendingLabel(null);
  }, [store.currentIndex]);

  // ---------------------------------------------------------------------------
  // Auto-submit when all questions are answered and store marks completed
  // ---------------------------------------------------------------------------

  useEffect(() => {
    if (store.isCompleted && !hasSubmitted.current) {
      hasSubmitted.current = true;

      // Honeypot check — silently abort if the hidden field was filled
      if (honeypotRef.current.length > 0) {
        logger.warn('RoastPage: honeypot triggered — submission silently dropped');
        return;
      }

      submitAnswers();
    }
  }, [store.isCompleted, submitAnswers]);

  // ---------------------------------------------------------------------------
  // Answer selection handler
  // ---------------------------------------------------------------------------

  const handleAnswerSelect = useCallback(
    (value: string, label: string): void => {
      setPendingValue(value);
      setPendingLabel(label);

      // Optimistically record in store so the answer is preserved if the user
      // re-selects before pressing Next. Guard against missing question id.
      const activeId = store.questions[store.currentIndex]?.id;
      if (activeId) {
        store.answerQuestion(activeId, value, label);
      }
    },
    [store],
  );

  // ---------------------------------------------------------------------------
  // Advance to next question
  // ---------------------------------------------------------------------------

  const handleNext = useCallback(() => {
    if (!pendingValue || !pendingLabel) return;

    const currentQuestion = store.questions[store.currentIndex];
    if (!currentQuestion) return;

    // Persist the answer
    store.answerQuestion(currentQuestion.id, pendingValue, pendingLabel);

    // Medium haptic to confirm advancement
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});

    store.nextQuestion();
  }, [pendingValue, pendingLabel, store]);

  // ---------------------------------------------------------------------------
  // Derived data for completion screen
  // ---------------------------------------------------------------------------

  const recapAnswers = React.useMemo((): AnswerRecap[] => {
    if (!store.isCompleted) return [];

    return store.questions
      .filter((q) => store.answers.has(q.id))
      .map((q) => ({
        questionText: q.text,
        answerLabel: store.answers.get(q.id)!.label,
      }));
  }, [store.isCompleted, store.questions, store.answers]);

  // ---------------------------------------------------------------------------
  // Render: loading
  // ---------------------------------------------------------------------------

  if (status === 'loading' || status === 'idle') {
    return <LoadingScreen />;
  }

  // ---------------------------------------------------------------------------
  // Render: error
  // ---------------------------------------------------------------------------

  if (status === 'error' || !username) {
    return (
      <ErrorScreen
        message={sessionError?.message ?? t('errors.profileNotFound')}
        onGoBack={() => navigation.goBack()}
      />
    );
  }

  // ---------------------------------------------------------------------------
  // Render: submitting (DB write in-flight after all questions answered)
  // ---------------------------------------------------------------------------

  if (status === 'submitting') {
    return <LoadingScreen />;
  }

  // ---------------------------------------------------------------------------
  // Render: completion screen
  // ---------------------------------------------------------------------------

  if (status === 'completed') {
    return (
      <SafeAreaView style={styles.safeArea}>
        <RoastComplete
          roastedName={store.roastedDisplayName ?? username}
          answers={recapAnswers}
          isAuthenticated={!!user}
        />
      </SafeAreaView>
    );
  }

  // ---------------------------------------------------------------------------
  // Render: active question flow
  // ---------------------------------------------------------------------------

  const currentQuestion = store.getCurrentQuestion();
  if (!currentQuestion) {
    return <LoadingScreen />;
  }

  const isLastQuestion = store.currentIndex === store.questions.length - 1;
  const hasSelection = pendingValue !== null;

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* ------------------------------------------------------------------ */}
      {/* Header                                                               */}
      {/* ------------------------------------------------------------------ */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>
          {t('roast.header', { name: store.roastedDisplayName ?? username })} 🔥
        </Text>
        <Text style={styles.headerSubtitle}>{t('roast.subtitle')}</Text>
      </View>

      {/* ------------------------------------------------------------------ */}
      {/* Progress                                                             */}
      {/* ------------------------------------------------------------------ */}
      <RoastProgress total={QUESTION_COUNT} current={store.currentIndex} />

      {/* ------------------------------------------------------------------ */}
      {/* Question counter                                                     */}
      {/* ------------------------------------------------------------------ */}
      <Animated.Text
        entering={FadeIn.duration(300)}
        style={styles.questionCounter}
      >
        {t('roast.questionOf', {
          current: store.currentIndex + 1,
          total: store.questions.length,
        })}
      </Animated.Text>

      {/* ------------------------------------------------------------------ */}
      {/* Question card                                                        */}
      {/* ------------------------------------------------------------------ */}
      <View style={styles.cardContainer}>
        <QuestionCard
          question={currentQuestion}
          selectedValue={pendingValue}
          onAnswer={handleAnswerSelect}
          animationKey={store.currentIndex}
        />
      </View>

      {/* ------------------------------------------------------------------ */}
      {/* Next button — appears after selection                               */}
      {/* ------------------------------------------------------------------ */}
      {hasSelection && (
        <Animated.View
          entering={FadeIn.duration(250)}
          exiting={FadeOut.duration(150)}
          style={styles.nextButtonWrapper}
        >
          <TouchableOpacity
            style={styles.nextButton}
            onPress={handleNext}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityLabel={
              isLastQuestion ? t('common.done') : t('common.next')
            }
          >
            <Text style={styles.nextButtonText}>
              {isLastQuestion ? t('common.done') : t('common.next')}
            </Text>
          </TouchableOpacity>
        </Animated.View>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* Honeypot — must never be visible to real users                      */}
      {/* aria-hidden, height 0, opacity 0                                    */}
      {/* ------------------------------------------------------------------ */}
      {/*
        Honeypot field — hidden from all users. If a bot fills this field,
        submitAnswers silently discards the session. Never visible in the UI.
      */}
      <TextInput
        style={styles.honeypot}
        onChangeText={(v) => {
          honeypotRef.current = v;
        }}
        autoComplete="off"
        autoCorrect={false}
        accessible={false}
        importantForAccessibility="no-hide-descendants"
      />
    </SafeAreaView>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  centerContainer: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
    gap: spacing.md,
  },
  // --
  // Error screen
  // --
  errorEmoji: {
    fontSize: 56,
  },
  errorTitle: {
    fontFamily: typography.fontDisplay,
    fontSize: typography.sizes.xl,
    color: colors.textPrimary,
    textAlign: 'center',
    textTransform: 'uppercase',
  },
  errorSubtitle: {
    fontFamily: typography.fontBody,
    fontSize: typography.sizes.md,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  backButton: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    marginTop: spacing.md,
  },
  backButtonText: {
    fontFamily: typography.fontBody,
    fontSize: typography.sizes.md,
    color: colors.textPrimary,
    fontWeight: '600',
  },
  // --
  // Loading screen
  // --
  loadingText: {
    fontFamily: typography.fontBody,
    fontSize: typography.sizes.md,
    color: colors.textSecondary,
    marginTop: spacing.sm,
  },
  // --
  // Active flow
  // --
  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.xs,
    alignItems: 'center',
  },
  headerTitle: {
    fontFamily: typography.fontDisplay,
    fontSize: typography.sizes.xxl,
    color: colors.textPrimary,
    textTransform: 'uppercase',
    letterSpacing: 1,
    textAlign: 'center',
  },
  headerSubtitle: {
    fontFamily: typography.fontBody,
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.xs,
  },
  questionCounter: {
    fontFamily: typography.fontMono,
    fontSize: typography.sizes.xs,
    color: colors.textMuted,
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  cardContainer: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
  },
  nextButtonWrapper: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
    paddingTop: spacing.sm,
  },
  nextButton: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  nextButtonText: {
    fontFamily: typography.fontDisplay,
    fontSize: typography.sizes.xl,
    color: colors.textPrimary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  // --
  // Honeypot — completely hidden from users and accessibility tree
  // --
  honeypot: {
    height: 0,
    width: 0,
    opacity: 0,
    position: 'absolute',
    top: -9999,
    left: -9999,
    pointerEvents: 'none',
  },
});
