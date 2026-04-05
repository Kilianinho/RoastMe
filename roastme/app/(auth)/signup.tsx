import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod/v4';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'expo-router';
import Toast from 'react-native-toast-message';
import { Ionicons } from '@expo/vector-icons';
import { config } from '@/constants/config';
import { colors, typography, spacing, borderRadius } from '@/constants/theme';
import { useAuth } from '@/hooks/useAuth';
import i18n from '@/lib/i18n';
import type { Gender } from '@/types/database';

// ─── Validation schemas ──────────────────────────────────────────────────────

/** Step 1: email + password registration */
const authSchema = z
  .object({
    email: z.string().email({ error: i18n.t('auth.emailPlaceholder') }),
    password: z
      .string()
      .min(6, { error: i18n.t('auth.passwordTooShort') }),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    error: i18n.t('auth.passwordMismatch'),
    path: ['confirmPassword'],
  });

type AuthFormValues = z.infer<typeof authSchema>;

/** Step 2: profile form */
const signupSchema = z.object({
  display_name: z
    .string()
    .min(2, { error: i18n.t('signup.minChars', { count: 2 }) })
    .max(50, { error: i18n.t('signup.maxChars', { count: 50 }) })
    .trim(),
  username: z
    .string()
    .regex(config.usernameRegex, 'signup.usernameInvalid')
    .refine(
      (val) => !config.reservedUsernames.includes(val),
      'errors.usernameReserved',
    ),
  gender: z.enum(['male', 'female', 'other', 'prefer_not'] as const).nullable(),
  looking_for: z.array(z.enum(['male', 'female', 'other', 'prefer_not'] as const)),
});

type SignupFormValues = z.infer<typeof signupSchema>;

// ─── Username availability status ────────────────────────────────────────────

type UsernameStatus = 'idle' | 'checking' | 'available' | 'taken' | 'invalid';

// ─── Gender option definition ────────────────────────────────────────────────

interface GenderOption {
  value: Gender;
  labelKey: string;
}

const GENDER_OPTIONS: GenderOption[] = [
  { value: 'male', labelKey: 'signup.genderMale' },
  { value: 'female', labelKey: 'signup.genderFemale' },
  { value: 'other', labelKey: 'signup.genderOther' },
  { value: 'prefer_not', labelKey: 'signup.genderPreferNot' },
];

/**
 * Signup screen — two-step flow for new users.
 *
 * Step 1: Authentication — email/password registration OR OAuth.
 *         Once auth succeeds, move to step 2.
 * Step 2: Profile creation — display_name, username, gender, looking_for.
 *         Same form as before; uses React Hook Form + Zod.
 */
export default function SignupScreen(): React.JSX.Element {
  const { t } = useTranslation();
  const router = useRouter();
  const {
    signUpWithPassword,
    signInWithGoogle,
    signInWithApple,
    createProfile,
    checkUsernameAvailability,
    session,
  } = useAuth();

  // Track which step we are on. If the user already has a session when they land
  // here (e.g. they completed OAuth from within the signup flow), skip straight
  // to step 2 — AuthGate will have sent them here because profile is missing.
  const [step, setStep] = useState<1 | 2>(session ? 2 : 1);

  // ─── Step 1 state ────────────────────────────────────────────────────────────

  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [showConfirm, setShowConfirm] = useState<boolean>(false);
  const [isRegistering, setIsRegistering] = useState<boolean>(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState<boolean>(false);
  const [isAppleLoading, setIsAppleLoading] = useState<boolean>(false);

  const authAnyLoading = isRegistering || isGoogleLoading || isAppleLoading;

  const {
    control: authControl,
    handleSubmit: handleAuthSubmit,
    formState: { errors: authErrors },
  } = useForm<AuthFormValues>({
    resolver: zodResolver(authSchema),
    defaultValues: { email: '', password: '', confirmPassword: '' },
  });

  // ─── Step 2 state ────────────────────────────────────────────────────────────

  const [usernameStatus, setUsernameStatus] = useState<UsernameStatus>('idle');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const {
    control,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<SignupFormValues>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      display_name: '',
      username: '',
      gender: null,
      looking_for: [],
    },
  });

  const watchedUsername = watch('username');

  // ─── Debounced username availability check ────────────────────────────────

  const checkAvailability = useCallback(
    async (username: string): Promise<void> => {
      if (!config.usernameRegex.test(username)) {
        setUsernameStatus('invalid');
        return;
      }
      if (config.reservedUsernames.includes(username)) {
        setUsernameStatus('taken');
        return;
      }
      setUsernameStatus('checking');
      const available = await checkUsernameAvailability(username);
      setUsernameStatus(available ? 'available' : 'taken');
    },
    [checkUsernameAvailability],
  );

  useEffect(() => {
    if (!watchedUsername) {
      setUsernameStatus('idle');
      return;
    }

    const timer = setTimeout(() => {
      checkAvailability(watchedUsername).catch(() => {
        setUsernameStatus('idle');
      });
    }, 500);

    return () => clearTimeout(timer);
  }, [watchedUsername, checkAvailability]);

  // ─── Step 1: registration handlers ───────────────────────────────────────

  const onAuthSubmit = async (values: AuthFormValues): Promise<void> => {
    setIsRegistering(true);
    try {
      const newSession = await signUpWithPassword(values.email, values.password);
      if (newSession) {
        // Immediate session — move to profile step.
        setStep(2);
      } else {
        // Email confirmation pending — inform the user.
        Toast.show({
          type: 'success',
          text1: t('auth.emailSent'),
        });
      }
    } catch (err) {
      Toast.show({
        type: 'error',
        text1: t('common.error'),
        text2: err instanceof Error ? err.message : t('errors.unknown'),
      });
    } finally {
      setIsRegistering(false);
    }
  };

  const handleGoogleSignUp = async (): Promise<void> => {
    setIsGoogleLoading(true);
    try {
      await signInWithGoogle();
      // AuthGate will redirect to signup (step 2) once session is set and
      // profile is still missing. No explicit setStep needed.
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

  const handleAppleSignUp = async (): Promise<void> => {
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

  // ─── Step 2: profile submit ───────────────────────────────────────────────

  const onProfileSubmit = async (values: SignupFormValues): Promise<void> => {
    if (usernameStatus === 'taken' || usernameStatus === 'checking') return;

    setIsSubmitting(true);
    try {
      await createProfile({
        display_name: values.display_name,
        username: values.username,
        gender: values.gender,
        looking_for: values.looking_for,
      });
      router.replace('/(auth)/consent');
    } catch (err) {
      Toast.show({
        type: 'error',
        text1: t('common.error'),
        text2: err instanceof Error ? err.message : t('errors.unknown'),
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // ─── Username status indicator ────────────────────────────────────────────

  const renderUsernameStatus = (): React.ReactNode => {
    switch (usernameStatus) {
      case 'checking':
        return <ActivityIndicator size="small" color={colors.textMuted} />;
      case 'available':
        return (
          <View style={styles.statusRow}>
            <Ionicons name="checkmark-circle" size={16} color={colors.success} />
            <Text style={[styles.statusText, { color: colors.success }]}>
              {t('signup.usernameAvailable')}
            </Text>
          </View>
        );
      case 'taken':
        return (
          <View style={styles.statusRow}>
            <Ionicons name="close-circle" size={16} color={colors.error} />
            <Text style={[styles.statusText, { color: colors.error }]}>
              {t('signup.usernameTaken')}
            </Text>
          </View>
        );
      case 'invalid':
        return (
          <Text style={[styles.statusText, { color: colors.textMuted }]}>
            {t('signup.usernameInvalid')}
          </Text>
        );
      default:
        return null;
    }
  };

  // ─── Render — Step 1 ─────────────────────────────────────────────────────

  if (step === 1) {
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
          <Text style={styles.title} accessibilityRole="header">
            {t('auth.signUpWithPassword')}
          </Text>

          {/* ── Email field ── */}
          <View style={styles.fieldGroup}>
            <Controller
              control={authControl}
              name="email"
              render={({ field: { onChange, onBlur, value } }) => (
                <TextInput
                  style={[styles.input, !!authErrors.email && styles.inputError]}
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  placeholder={t('auth.emailPlaceholder')}
                  placeholderTextColor={colors.textMuted}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  returnKeyType="next"
                  editable={!authAnyLoading}
                  accessibilityLabel={t('auth.emailPlaceholder')}
                />
              )}
            />
            {authErrors.email && (
              <Text style={styles.errorText}>{authErrors.email.message}</Text>
            )}
          </View>

          {/* ── Password field ── */}
          <View style={styles.fieldGroup}>
            <View
              style={[
                styles.passwordWrapper,
                !!authErrors.password && styles.inputError,
              ]}
            >
              <Controller
                control={authControl}
                name="password"
                render={({ field: { onChange, onBlur, value } }) => (
                  <TextInput
                    style={styles.passwordInput}
                    value={value}
                    onChangeText={onChange}
                    onBlur={onBlur}
                    placeholder={t('auth.passwordPlaceholder')}
                    placeholderTextColor={colors.textMuted}
                    secureTextEntry={!showPassword}
                    autoCapitalize="none"
                    autoCorrect={false}
                    returnKeyType="next"
                    editable={!authAnyLoading}
                    accessibilityLabel={t('auth.password')}
                  />
                )}
              />
              <TouchableOpacity
                style={styles.eyeButton}
                onPress={() => setShowPassword((v) => !v)}
                accessibilityLabel={showPassword ? 'Masquer' : 'Afficher'}
              >
                <Ionicons
                  name={showPassword ? 'eye-off' : 'eye'}
                  size={20}
                  color={colors.textMuted}
                />
              </TouchableOpacity>
            </View>
            {authErrors.password && (
              <Text style={styles.errorText}>{authErrors.password.message}</Text>
            )}
          </View>

          {/* ── Confirm password field ── */}
          <View style={styles.fieldGroup}>
            <View
              style={[
                styles.passwordWrapper,
                !!authErrors.confirmPassword && styles.inputError,
              ]}
            >
              <Controller
                control={authControl}
                name="confirmPassword"
                render={({ field: { onChange, onBlur, value } }) => (
                  <TextInput
                    style={styles.passwordInput}
                    value={value}
                    onChangeText={onChange}
                    onBlur={onBlur}
                    placeholder={t('auth.confirmPassword')}
                    placeholderTextColor={colors.textMuted}
                    secureTextEntry={!showConfirm}
                    autoCapitalize="none"
                    autoCorrect={false}
                    returnKeyType="done"
                    onSubmitEditing={handleAuthSubmit(onAuthSubmit)}
                    editable={!authAnyLoading}
                    accessibilityLabel={t('auth.confirmPassword')}
                  />
                )}
              />
              <TouchableOpacity
                style={styles.eyeButton}
                onPress={() => setShowConfirm((v) => !v)}
                accessibilityLabel={showConfirm ? 'Masquer' : 'Afficher'}
              >
                <Ionicons
                  name={showConfirm ? 'eye-off' : 'eye'}
                  size={20}
                  color={colors.textMuted}
                />
              </TouchableOpacity>
            </View>
            {authErrors.confirmPassword && (
              <Text style={styles.errorText}>{authErrors.confirmPassword.message}</Text>
            )}
          </View>

          {/* ── Register button ── */}
          <TouchableOpacity
            style={[styles.submitButton, authAnyLoading && styles.submitButtonDisabled]}
            onPress={handleAuthSubmit(onAuthSubmit)}
            disabled={authAnyLoading}
            accessibilityLabel={t('auth.signUpWithPassword')}
            accessibilityRole="button"
          >
            {isRegistering ? (
              <ActivityIndicator size="small" color={colors.textPrimary} />
            ) : (
              <Text style={styles.submitButtonText}>{t('auth.signUpWithPassword')}</Text>
            )}
          </TouchableOpacity>

          {/* ── Divider ── */}
          <View style={styles.dividerRow}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>{t('auth.divider')}</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* ── OAuth ── */}
          <View style={styles.oauthSection}>
            <TouchableOpacity
              style={styles.oauthButton}
              onPress={handleGoogleSignUp}
              disabled={authAnyLoading}
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
              onPress={handleAppleSignUp}
              disabled={authAnyLoading}
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

          {/* ── Login link ── */}
          <TouchableOpacity
            style={styles.loginLink}
            onPress={() => router.push('/(auth)/login')}
            accessibilityLabel={t('auth.hasAccount')}
            accessibilityRole="link"
          >
            <Text style={styles.loginLinkText}>{t('auth.hasAccount')}</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }

  // ─── Render — Step 2 (profile form) ──────────────────────────────────────

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
        <Text style={styles.title} accessibilityRole="header">
          {t('signup.title')}
        </Text>

        {/* ── Display name ── */}
        <View style={styles.fieldGroup}>
          <Text style={styles.label}>{t('signup.displayName')}</Text>
          <Controller
            control={control}
            name="display_name"
            render={({ field: { onChange, onBlur, value } }) => (
              <TextInput
                style={[styles.input, !!errors.display_name && styles.inputError]}
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                placeholder={t('signup.displayNamePlaceholder')}
                placeholderTextColor={colors.textMuted}
                autoCapitalize="words"
                returnKeyType="next"
                accessibilityLabel={t('signup.displayName')}
              />
            )}
          />
          {errors.display_name && (
            <Text style={styles.errorText}>{errors.display_name.message}</Text>
          )}
        </View>

        {/* ── Username ── */}
        <View style={styles.fieldGroup}>
          <Text style={styles.label}>{t('signup.username')}</Text>
          <Controller
            control={control}
            name="username"
            render={({ field: { onChange, onBlur, value } }) => (
              <TextInput
                style={[
                  styles.input,
                  usernameStatus === 'taken' && styles.inputError,
                  usernameStatus === 'available' && styles.inputSuccess,
                ]}
                value={value}
                onChangeText={(text) => onChange(text.toLowerCase())}
                onBlur={onBlur}
                placeholder={t('signup.usernamePlaceholder')}
                placeholderTextColor={colors.textMuted}
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="next"
                accessibilityLabel={t('signup.username')}
              />
            )}
          />
          {/* Link preview */}
          {watchedUsername.length > 0 && (
            <Text style={styles.linkPreview}>
              roast.me/{watchedUsername}
            </Text>
          )}
          {renderUsernameStatus()}
          {errors.username && (
            <Text style={styles.errorText}>
              {t(errors.username.message ?? 'signup.usernameInvalid')}
            </Text>
          )}
        </View>

        {/* ── Gender ── */}
        <View style={styles.fieldGroup}>
          <Text style={styles.label}>{t('signup.gender')}</Text>
          <Controller
            control={control}
            name="gender"
            render={({ field: { onChange, value } }) => (
              <View style={styles.chipRow}>
                {GENDER_OPTIONS.map((opt) => (
                  <TouchableOpacity
                    key={opt.value}
                    style={[styles.chip, value === opt.value && styles.chipSelected]}
                    onPress={() => onChange(value === opt.value ? null : opt.value)}
                    accessibilityLabel={t(opt.labelKey)}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: value === opt.value }}
                  >
                    <Text
                      style={[
                        styles.chipText,
                        value === opt.value && styles.chipTextSelected,
                      ]}
                    >
                      {t(opt.labelKey)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          />
        </View>

        {/* ── Looking for ── */}
        <View style={styles.fieldGroup}>
          <Text style={styles.label}>{t('signup.lookingFor')}</Text>
          <Controller
            control={control}
            name="looking_for"
            render={({ field: { onChange, value } }) => {
              const toggle = (gender: Gender): void => {
                const updated = value.includes(gender)
                  ? value.filter((g) => g !== gender)
                  : [...value, gender];
                onChange(updated);
              };

              return (
                <View style={styles.chipRow}>
                  {GENDER_OPTIONS.map((opt) => {
                    const selected = value.includes(opt.value);
                    return (
                      <TouchableOpacity
                        key={opt.value}
                        style={[styles.chip, selected && styles.chipSelected]}
                        onPress={() => toggle(opt.value)}
                        accessibilityLabel={t(opt.labelKey)}
                        accessibilityRole="checkbox"
                        accessibilityState={{ checked: selected }}
                      >
                        <Text
                          style={[styles.chipText, selected && styles.chipTextSelected]}
                        >
                          {t(opt.labelKey)}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              );
            }}
          />
        </View>

        {/* ── Submit ── */}
        <TouchableOpacity
          style={[
            styles.submitButton,
            (isSubmitting || usernameStatus === 'taken' || usernameStatus === 'checking') &&
              styles.submitButtonDisabled,
          ]}
          onPress={handleSubmit(onProfileSubmit)}
          disabled={isSubmitting || usernameStatus === 'taken' || usernameStatus === 'checking'}
          accessibilityLabel={t('signup.continue')}
          accessibilityRole="button"
        >
          {isSubmitting ? (
            <ActivityIndicator size="small" color={colors.textPrimary} />
          ) : (
            <Text style={styles.submitButtonText}>{t('signup.continue')}</Text>
          )}
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
    paddingTop: spacing.xxl,
    paddingBottom: spacing.xxl,
  },
  title: {
    fontFamily: typography.fontDisplay,
    fontSize: typography.sizes.xxl,
    color: colors.textPrimary,
    marginBottom: spacing.xl,
    letterSpacing: 1,
  },

  // Field groups
  fieldGroup: {
    marginBottom: spacing.lg,
  },
  label: {
    fontFamily: typography.fontBody,
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
    fontWeight: '500',
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
  inputError: {
    borderColor: colors.error,
  },
  inputSuccess: {
    borderColor: colors.success,
  },
  errorText: {
    fontFamily: typography.fontBody,
    fontSize: typography.sizes.xs,
    color: colors.error,
    marginTop: spacing.xs,
  },

  // Password fields
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

  // Username preview & status
  linkPreview: {
    fontFamily: typography.fontMono,
    fontSize: typography.sizes.sm,
    color: colors.primary,
    marginTop: spacing.xs,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  statusText: {
    fontFamily: typography.fontBody,
    fontSize: typography.sizes.xs,
  },

  // Chips (gender / looking_for)
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    backgroundColor: colors.surface,
  },
  chipSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryOverlay,
  },
  chipText: {
    fontFamily: typography.fontBody,
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
  },
  chipTextSelected: {
    color: colors.primary,
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

  // Submit
  submitButton: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
    marginTop: spacing.md,
  },
  submitButtonDisabled: {
    opacity: 0.45,
  },
  submitButtonText: {
    fontFamily: typography.fontBody,
    fontSize: typography.sizes.md,
    fontWeight: '700',
    color: colors.textPrimary,
  },

  // Login link
  loginLink: {
    alignItems: 'center',
    paddingVertical: spacing.md,
    marginTop: spacing.lg,
  },
  loginLinkText: {
    fontFamily: typography.fontBody,
    fontSize: typography.sizes.md,
    color: colors.primary,
    fontWeight: '600',
  },
});
