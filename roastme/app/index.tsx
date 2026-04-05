import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Animated,
  SafeAreaView,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'expo-router';
import { colors, typography, spacing, borderRadius } from '@/constants/theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

/**
 * Landing / onboarding screen — the first thing a new (unauthenticated) user sees.
 *
 * Three distinct CTAs:
 *   1. "Créer mon profil"           → /(auth)/signup  (new user flow)
 *   2. "J'ai un lien de roast"      → inline username input → /roast/[username]
 *   3. "Déjà un compte ? Se connecter" → /(auth)/login (returning user)
 */
export default function LandingScreen(): React.JSX.Element {
  const { t } = useTranslation();
  const router = useRouter();

  // ─── Roast-link inline input state ──────────────────────────────────────────
  const [showRoastInput, setShowRoastInput] = useState<boolean>(false);
  const [roastUsername, setRoastUsername] = useState<string>('');

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
    router.push('/(auth)/signup');
  };

  const handleRoastLinkToggle = (): void => {
    setShowRoastInput((v) => !v);
    setRoastUsername('');
  };

  const handleGoRoast = (): void => {
    const trimmed = roastUsername.trim().toLowerCase();
    if (!trimmed) return;
    // Public route — no authentication required.
    router.push(`/roast/${trimmed}` as never);
  };

  const handleSignIn = (): void => {
    router.push('/(auth)/login');
  };

  // ─── Render ──────────────────────────────────────────────────────────────────

  return (
    <KeyboardAvoidingView
      style={styles.kav}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
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
          {/* Primary CTA — new user signup */}
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
            onPress={handleRoastLinkToggle}
            accessibilityLabel={t('onboarding.haveLink')}
            accessibilityRole="button"
          >
            <Text style={styles.secondaryButtonText}>{t('onboarding.haveLink')}</Text>
          </TouchableOpacity>

          {/* Inline roast-link input (no auth required) */}
          {showRoastInput && (
            <View style={styles.roastInputGroup}>
              <TextInput
                style={styles.roastInput}
                value={roastUsername}
                onChangeText={setRoastUsername}
                placeholder={t('onboarding.roastLinkPlaceholder')}
                placeholderTextColor={colors.textMuted}
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="go"
                onSubmitEditing={handleGoRoast}
                autoFocus
                accessibilityLabel={t('onboarding.roastLinkPlaceholder')}
              />
              <TouchableOpacity
                style={[
                  styles.goRoastButton,
                  !roastUsername.trim() && styles.goRoastButtonDisabled,
                ]}
                onPress={handleGoRoast}
                disabled={!roastUsername.trim()}
                accessibilityLabel={t('onboarding.goRoast')}
                accessibilityRole="button"
              >
                <Text style={styles.goRoastButtonText}>{t('onboarding.goRoast')}</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Sign-in link — returning users, more prominent */}
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
    </KeyboardAvoidingView>
  );
}

const GLOW_SIZE = SCREEN_WIDTH * 0.85;

const styles = StyleSheet.create({
  kav: {
    flex: 1,
    backgroundColor: colors.background,
  },
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

  // Inline roast-link input
  roastInputGroup: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  roastInput: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    fontFamily: typography.fontBody,
    fontSize: typography.sizes.md,
    color: colors.textPrimary,
    minHeight: 52,
  },
  goRoastButton: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
  },
  goRoastButtonDisabled: {
    opacity: 0.45,
  },
  goRoastButtonText: {
    fontFamily: typography.fontBody,
    fontSize: typography.sizes.md,
    fontWeight: '700',
    color: colors.textPrimary,
  },

  // Sign-in link — more prominent than before
  signinLink: {
    alignItems: 'center',
    paddingVertical: spacing.sm,
    marginTop: spacing.xs,
  },
  signinLinkText: {
    fontFamily: typography.fontBody,
    fontSize: typography.sizes.md,
    color: colors.textSecondary,
    fontWeight: '600',
  },
});
