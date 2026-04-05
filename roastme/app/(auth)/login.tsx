import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import Toast from 'react-native-toast-message';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/hooks/useAuth';
import { colors, typography, spacing, borderRadius } from '@/constants/theme';

/**
 * Login screen — SSO (Google / Apple) and magic link email flow.
 * All auth operations delegate to useAuth which wraps authStore + Supabase.
 */
export default function LoginScreen(): React.JSX.Element {
  const { t } = useTranslation();
  const { signInWithGoogle, signInWithApple, signInWithEmail } = useAuth();

  const [email, setEmail] = useState<string>('');
  const [isSendingLink, setIsSendingLink] = useState<boolean>(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState<boolean>(false);
  const [isAppleLoading, setIsAppleLoading] = useState<boolean>(false);

  const handleGoogleSignIn = async (): Promise<void> => {
    setIsGoogleLoading(true);
    try {
      await signInWithGoogle();
    } catch (err) {
      Toast.show({
        type: 'error',
        text1: t('common.error'),
        text2: err instanceof Error ? err.message : t('errors.unknown'),
      });
    } finally {
      setIsGoogleLoading(false);
    }
  };

  const handleAppleSignIn = async (): Promise<void> => {
    setIsAppleLoading(true);
    try {
      await signInWithApple();
    } catch (err) {
      Toast.show({
        type: 'error',
        text1: t('common.error'),
        text2: err instanceof Error ? err.message : t('errors.unknown'),
      });
    } finally {
      setIsAppleLoading(false);
    }
  };

  const handleMagicLink = async (): Promise<void> => {
    const trimmed = email.trim();
    if (!trimmed) return;

    setIsSendingLink(true);
    try {
      await signInWithEmail(trimmed);
      Toast.show({
        type: 'success',
        text1: t('auth.emailSent'),
      });
      setEmail('');
    } catch (err) {
      Toast.show({
        type: 'error',
        text1: t('common.error'),
        text2: err instanceof Error ? err.message : t('errors.unknown'),
      });
    } finally {
      setIsSendingLink(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* ── Logo / Hero ── */}
        <View style={styles.hero}>
          <Text style={styles.logoText} accessibilityRole="header">
            ROASTME
          </Text>
          <Text style={styles.tagline}>{t('onboarding.tagline')}</Text>
        </View>

        {/* ── OAuth buttons ── */}
        <View style={styles.oauthSection}>
          <TouchableOpacity
            style={styles.oauthButton}
            onPress={handleGoogleSignIn}
            disabled={isGoogleLoading || isAppleLoading || isSendingLink}
            accessibilityLabel={t('auth.continueGoogle')}
            accessibilityRole="button"
          >
            {isGoogleLoading ? (
              <ActivityIndicator size="small" color={colors.textMuted} />
            ) : (
              <Ionicons name="logo-google" size={20} color="#DB4437" />
            )}
            <Text style={styles.oauthButtonText}>{t('auth.continueGoogle')}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.oauthButton}
            onPress={handleAppleSignIn}
            disabled={isGoogleLoading || isAppleLoading || isSendingLink}
            accessibilityLabel={t('auth.continueApple')}
            accessibilityRole="button"
          >
            {isAppleLoading ? (
              <ActivityIndicator size="small" color={colors.textMuted} />
            ) : (
              <Ionicons name="logo-apple" size={22} color="#000000" />
            )}
            <Text style={styles.oauthButtonText}>{t('auth.continueApple')}</Text>
          </TouchableOpacity>
        </View>

        {/* ── Divider ── */}
        <View style={styles.dividerRow}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>{t('auth.divider')}</Text>
          <View style={styles.dividerLine} />
        </View>

        {/* ── Magic link ── */}
        <View style={styles.magicSection}>
          <Text style={styles.sectionLabel}>{t('auth.magicLink')}</Text>

          <TextInput
            style={styles.emailInput}
            value={email}
            onChangeText={setEmail}
            placeholder={t('auth.emailPlaceholder')}
            placeholderTextColor={colors.textMuted}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="send"
            onSubmitEditing={handleMagicLink}
            editable={!isSendingLink}
            accessibilityLabel={t('auth.emailPlaceholder')}
          />

          <TouchableOpacity
            style={[
              styles.magicButton,
              (!email.trim() || isSendingLink) && styles.magicButtonDisabled,
            ]}
            onPress={handleMagicLink}
            disabled={!email.trim() || isSendingLink}
            accessibilityLabel={t('auth.magicLink')}
            accessibilityRole="button"
          >
            {isSendingLink ? (
              <ActivityIndicator size="small" color={colors.textPrimary} />
            ) : (
              <Text style={styles.magicButtonText}>{t('auth.login')}</Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xxl + spacing.lg,
    paddingBottom: spacing.xxl,
  },

  // Hero
  hero: {
    alignItems: 'center',
    marginBottom: spacing.xxl,
  },
  logoText: {
    fontFamily: typography.fontDisplay,
    fontSize: 72,
    color: colors.primary,
    letterSpacing: 2,
    lineHeight: 76,
  },
  tagline: {
    fontFamily: typography.fontBody,
    fontSize: typography.sizes.md,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.sm,
    lineHeight: 22,
  },

  // OAuth
  oauthSection: {
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  oauthButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: borderRadius.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
    minHeight: 52,
  },
  oauthButtonText: {
    fontFamily: typography.fontBody,
    fontSize: typography.sizes.md,
    color: '#1A1A1A',
    fontWeight: '600',
  },

  // Divider
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: spacing.lg,
    gap: spacing.sm,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.surfaceBorder,
  },
  dividerText: {
    fontFamily: typography.fontBody,
    fontSize: typography.sizes.sm,
    color: colors.textMuted,
  },

  // Magic link
  magicSection: {
    gap: spacing.sm,
  },
  sectionLabel: {
    fontFamily: typography.fontBody,
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  emailInput: {
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
  magicButton: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
  },
  magicButtonDisabled: {
    opacity: 0.45,
  },
  magicButtonText: {
    fontFamily: typography.fontBody,
    fontSize: typography.sizes.md,
    fontWeight: '700',
    color: colors.textPrimary,
  },
});
