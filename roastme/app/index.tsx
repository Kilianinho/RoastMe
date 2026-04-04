import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  SafeAreaView,
  Dimensions,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'expo-router';
import { colors, typography, spacing, borderRadius } from '@/constants/theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

/**
 * Landing / onboarding screen — the first thing a new (unauthenticated) user sees.
 * The tagline fades and slides in after mount to create a subtle hero effect.
 * Routing from here goes to (auth)/login for all entry points.
 */
export default function LandingScreen(): React.JSX.Element {
  const { t } = useTranslation();
  const router = useRouter();

  // ─── Tagline animation ───────────────────────────────────────────────────────
  const taglineOpacity = useRef(new Animated.Value(0)).current;
  const taglineTranslateY = useRef(new Animated.Value(16)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(taglineOpacity, {
        toValue: 1,
        duration: 700,
        delay: 300,
        useNativeDriver: true,
      }),
      Animated.timing(taglineTranslateY, {
        toValue: 0,
        duration: 700,
        delay: 300,
        useNativeDriver: true,
      }),
    ]).start();
  }, [taglineOpacity, taglineTranslateY]);

  // ─── Handlers ────────────────────────────────────────────────────────────────

  const handleCreateProfile = (): void => {
    router.push('/(auth)/login');
  };

  const handleRoastLink = (): void => {
    // Navigates to login; after auth the deep-link resolver will handle the
    // roast URL. We keep this as a login entry point for now.
    router.push('/(auth)/login');
  };

  const handleSignIn = (): void => {
    router.push('/(auth)/login');
  };

  // ─── Render ──────────────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={styles.root}>
      {/* Decorative ember glow behind title */}
      <View style={styles.glowCircle} />

      <View style={styles.hero}>
        <Text style={styles.logoText} accessibilityRole="header">
          ROASTME
        </Text>

        <Animated.Text
          style={[
            styles.tagline,
            { opacity: taglineOpacity, transform: [{ translateY: taglineTranslateY }] },
          ]}
        >
          {t('onboarding.tagline')}
        </Animated.Text>
      </View>

      <View style={styles.ctaSection}>
        {/* Primary CTA */}
        <TouchableOpacity
          style={styles.primaryButton}
          onPress={handleCreateProfile}
          accessibilityLabel={t('onboarding.createProfile')}
          accessibilityRole="button"
        >
          <Text style={styles.primaryButtonText}>{t('onboarding.createProfile')}</Text>
        </TouchableOpacity>

        {/* Secondary CTA — have a roast link */}
        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={handleRoastLink}
          accessibilityLabel={t('onboarding.haveLink')}
          accessibilityRole="button"
        >
          <Text style={styles.secondaryButtonText}>{t('onboarding.haveLink')}</Text>
        </TouchableOpacity>

        {/* Sign-in link */}
        <TouchableOpacity
          onPress={handleSignIn}
          accessibilityLabel={t('onboarding.alreadyAccount')}
          accessibilityRole="link"
          style={styles.signinLink}
        >
          <Text style={styles.signinLinkText}>{t('onboarding.alreadyAccount')}</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const GLOW_SIZE = SCREEN_WIDTH * 0.85;

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },

  // Decorative radial glow
  glowCircle: {
    position: 'absolute',
    top: -GLOW_SIZE * 0.35,
    alignSelf: 'center',
    width: GLOW_SIZE,
    height: GLOW_SIZE,
    borderRadius: GLOW_SIZE / 2,
    backgroundColor: colors.primaryOverlay,
    // No shadow — pure colour bleed effect for dark-mode.
  },

  // Hero section
  hero: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xxl,
  },
  logoText: {
    fontFamily: typography.fontDisplay,
    fontSize: 88,
    color: colors.primary,
    letterSpacing: 4,
    lineHeight: 92,
    textAlign: 'center',
  },
  tagline: {
    fontFamily: typography.fontBody,
    fontSize: typography.sizes.lg,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 26,
    marginTop: spacing.md,
    maxWidth: 300,
  },

  // CTA section
  ctaSection: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl,
    gap: spacing.sm,
  },
  primaryButton: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 56,
  },
  primaryButtonText: {
    fontFamily: typography.fontBody,
    fontSize: typography.sizes.lg,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  secondaryButton: {
    borderRadius: borderRadius.md,
    borderWidth: 1.5,
    borderColor: colors.surfaceBorder,
    paddingVertical: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 56,
  },
  secondaryButtonText: {
    fontFamily: typography.fontBody,
    fontSize: typography.sizes.lg,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  signinLink: {
    alignItems: 'center',
    paddingVertical: spacing.sm,
    marginTop: spacing.xs,
  },
  signinLinkText: {
    fontFamily: typography.fontBody,
    fontSize: typography.sizes.sm,
    color: colors.textMuted,
    textDecorationLine: 'underline',
  },
});
