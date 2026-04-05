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
import { useRouter } from 'expo-router';
import Toast from 'react-native-toast-message';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/hooks/useAuth';
import { colors, typography, spacing, borderRadius } from '@/constants/theme';

/**
 * Login screen — for existing users only.
 *
 * Primary flow : email + password ("Se connecter").
 * Secondary    : OAuth (Google / Apple).
 * Tertiary     : magic link (collapsible section).
 * Footer       : link to signup for new users.
 */
export default function LoginScreen(): React.JSX.Element {
  const { t } = useTranslation();
  const router = useRouter();
  const {
    signInWithPassword,
    signInWithGoogle,
    signInWithApple,
    signInWithEmail,
  } = useAuth();

  // ─── Email / password state ──────────────────────────────────────────────────
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [isSigningIn, setIsSigningIn] = useState<boolean>(false);

  // ─── OAuth loading state ──────────────────────────────────────────────────────
  const [isGoogleLoading, setIsGoogleLoading] = useState<boolean>(false);
  const [isAppleLoading, setIsAppleLoading] = useState<boolean>(false);

  // ─── Magic link state ─────────────────────────────────────────────────────────
  const [showMagicLink, setShowMagicLink] = useState<boolean>(false);
  const [magicEmail, setMagicEmail] = useState<string>('');
  const [isSendingLink, setIsSendingLink] = useState<boolean>(false);

  const anyLoading = isSigningIn || isGoogleLoading || isAppleLoading || isSendingLink;

  // ─── Handlers ─────────────────────────────────────────────────────────────────

  const handleSignInWithPassword = async (): Promise<void> => {
    const trimmedEmail = email.trim();
    if (!trimmedEmail || !password) return;

    setIsSigningIn(true);
    try {
      await signInWithPassword(trimmedEmail, password);
      // AuthGate in _layout.tsx will redirect once the session is set in the store.
    } catch (err) {
      Toast.show({
        type: 'error',
        text1: t('common.error'),
        text2: err instanceof Error ? err.message : t('errors.unknown'),
      });
    } finally {
      setIsSigningIn(false);
    }
  };

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
    const trimmed = magicEmail.trim();
    if (!trimmed) return;

    setIsSendingLink(true);
    try {
      await signInWithEmail(trimmed);
      Toast.show({
        type: 'success',
        text1: t('auth.emailSent'),
      });
      setMagicEmail('');
      setShowMagicLink(false);
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

  // ─── Render ───────────────────────────────────────────────────────────────────

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
        {/* ── Hero ── */}
        <View style={styles.hero}>
          <Text style={styles.logoText} accessibilityRole="header">
            ROASTME
          </Text>
          <Text style={styles.tagline}>{t('onboarding.tagline')}</Text>
        </View>

        {/* ── Email / password form ── */}
        <View style={styles.formSection}>
          <TextInput
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            placeholder={t('auth.emailPlaceholder')}
            placeholderTextColor={colors.textMuted}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="next"
            editable={!anyLoading}
            accessibilityLabel={t('auth.emailPlaceholder')}
          />

          <View style={styles.passwordWrapper}>
            <TextInput
              style={styles.passwordInput}
              value={password}
              onChangeText={setPassword}
              placeholder={t('auth.passwordPlaceholder')}
              placeholderTextColor={colors.textMuted}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="done"
              onSubmitEditing={handleSignInWithPassword}
              editable={!anyLoading}
              accessibilityLabel={t('auth.password')}
            />
            <TouchableOpacity
              style={styles.eyeButton}
              onPress={() => setShowPassword((v) => !v)}
              accessibilityLabel={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
            >
              <Ionicons
                name={showPassword ? 'eye-off' : 'eye'}
                size={20}
                color={colors.textMuted}
              />
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={[
              styles.primaryButton,
              (!email.trim() || !password || anyLoading) && styles.buttonDisabled,
            ]}
            onPress={handleSignInWithPassword}
            disabled={!email.trim() || !password || anyLoading}
            accessibilityLabel={t('auth.signInWithPassword')}
            accessibilityRole="button"
          >
            {isSigningIn ? (
              <ActivityIndicator size="small" color={colors.textPrimary} />
            ) : (
              <Text style={styles.primaryButtonText}>{t('auth.signInWithPassword')}</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* ── Divider ── */}
        <View style={styles.dividerRow}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>{t('auth.divider')}</Text>
          <View style={styles.dividerLine} />
        </View>

        {/* ── OAuth buttons ── */}
        <View style={styles.oauthSection}>
          <TouchableOpacity
            style={styles.oauthButton}
            onPress={handleGoogleSignIn}
            disabled={anyLoading}
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
            disabled={anyLoading}
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

        {/* ── Magic link (collapsible) ── */}
        <View style={styles.dividerRow}>
          <View style={styles.dividerLine} />
          <TouchableOpacity
            onPress={() => setShowMagicLink((v) => !v)}
            accessibilityRole="button"
          >
            <Text style={styles.dividerText}>
              {t('auth.magicLink')} {showMagicLink ? '▲' : '▼'}
            </Text>
          </TouchableOpacity>
          <View style={styles.dividerLine} />
        </View>

        {showMagicLink && (
          <View style={styles.magicSection}>
            <TextInput
              style={styles.input}
              value={magicEmail}
              onChangeText={setMagicEmail}
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
                styles.primaryButton,
                (!magicEmail.trim() || isSendingLink) && styles.buttonDisabled,
              ]}
              onPress={handleMagicLink}
              disabled={!magicEmail.trim() || isSendingLink}
              accessibilityLabel={t('auth.magicLink')}
              accessibilityRole="button"
            >
              {isSendingLink ? (
                <ActivityIndicator size="small" color={colors.textPrimary} />
              ) : (
                <Text style={styles.primaryButtonText}>{t('auth.login')}</Text>
              )}
            </TouchableOpacity>
          </View>
        )}

        {/* ── Signup link ── */}
        <TouchableOpacity
          style={styles.signupLink}
          onPress={() => router.push('/(auth)/signup')}
          accessibilityLabel={t('auth.noAccount')}
          accessibilityRole="link"
        >
          <Text style={styles.signupLinkText}>{t('auth.noAccount')}</Text>
        </TouchableOpacity>
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

  // Email/password form
  formSection: {
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  input: {
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
  passwordWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    minHeight: 52,
  },
  passwordInput: {
    flex: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    fontFamily: typography.fontBody,
    fontSize: typography.sizes.md,
    color: colors.textPrimary,
  },
  eyeButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  primaryButton: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
  },
  buttonDisabled: {
    opacity: 0.45,
  },
  primaryButtonText: {
    fontFamily: typography.fontBody,
    fontSize: typography.sizes.md,
    fontWeight: '700',
    color: colors.textPrimary,
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

  // OAuth
  oauthSection: {
    gap: spacing.sm,
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

  // Magic link
  magicSection: {
    gap: spacing.sm,
    marginTop: -spacing.sm,
    marginBottom: spacing.sm,
  },

  // Signup link
  signupLink: {
    alignItems: 'center',
    paddingVertical: spacing.md,
    marginTop: spacing.lg,
  },
  signupLinkText: {
    fontFamily: typography.fontBody,
    fontSize: typography.sizes.md,
    color: colors.primary,
    fontWeight: '600',
  },
});
