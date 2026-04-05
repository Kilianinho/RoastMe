import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'expo-router';
import Toast from 'react-native-toast-message';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import { analytics } from '@/lib/analytics';
import { colors, typography, spacing, borderRadius } from '@/constants/theme';
import type { ConsentType } from '@/types/database';

// ─── Consent state ────────────────────────────────────────────────────────────

interface ConsentState {
  terms: boolean;
  analytics: boolean;
  marketing: boolean;
}

// ─── Individual consent row definition ───────────────────────────────────────

interface ConsentRowDef {
  key: keyof ConsentState;
  consentType: ConsentType;
  labelKey: string;
  hintKey: string | null;
  required: boolean;
}

const CONSENT_ROWS: ConsentRowDef[] = [
  {
    key: 'terms',
    consentType: 'terms',
    labelKey: 'consent.terms',
    hintKey: 'consent.termsRequired',
    required: true,
  },
  {
    key: 'analytics',
    consentType: 'analytics',
    labelKey: 'consent.analytics',
    hintKey: 'consent.analyticsHint',
    required: false,
  },
  {
    key: 'marketing',
    consentType: 'marketing',
    labelKey: 'consent.marketing',
    hintKey: 'consent.marketingHint',
    required: false,
  },
];

/**
 * RGPD consent screen — shown once after profile creation, before main app.
 * Terms checkbox is required; analytics and marketing are optional.
 * On submit, all consents are written to `user_consents` in a single batch.
 */
export default function ConsentScreen(): React.JSX.Element {
  const { t } = useTranslation();
  const router = useRouter();
  const user = useAuthStore((s) => s.user);

  const [consents, setConsents] = useState<ConsentState>({
    terms: false,
    analytics: false,
    marketing: false,
  });
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const toggle = (key: keyof ConsentState): void => {
    setConsents((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleContinue = async (): Promise<void> => {
    if (!consents.terms) return;
    if (!user) {
      Toast.show({ type: 'error', text1: t('common.error') });
      return;
    }

    setIsSubmitting(true);

    try {
      // Build one insert row per consent type.
      // We always record the decision (granted: true/false) so the audit trail
      // reflects what the user actually chose at this moment.
      const rows = CONSENT_ROWS.map((row) => ({
        user_id: user.id,
        consent_type: row.consentType,
        granted: consents[row.key],
        granted_at: new Date().toISOString(),
      }));

      const { error } = await supabase.from('user_consents').insert(rows);

      if (error) {
        throw new Error(error.message);
      }

      // Enable analytics immediately if the user opted in.
      // Must happen after the DB write succeeds so consent is durably recorded
      // before any events are emitted.
      if (consents.analytics) {
        analytics.enable();
      }

      // Navigate into the main app. The root layout will see the profile is
      // set and redirect to (tabs) automatically.
      router.replace('/(tabs)/home' as never);
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

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={styles.scroll}
      showsVerticalScrollIndicator={false}
    >
      <Text style={styles.title} accessibilityRole="header">
        {t('consent.title')}
      </Text>

      <View style={styles.consentList}>
        {CONSENT_ROWS.map((row) => {
          const checked = consents[row.key];
          return (
            <TouchableOpacity
              key={row.key}
              style={styles.consentRow}
              onPress={() => toggle(row.key)}
              accessibilityLabel={t(row.labelKey)}
              accessibilityRole="checkbox"
              accessibilityState={{ checked }}
            >
              {/* Checkbox */}
              <View style={[styles.checkbox, checked && styles.checkboxChecked]}>
                {checked && (
                  <Ionicons name="checkmark" size={14} color={colors.textPrimary} />
                )}
              </View>

              {/* Text content */}
              <View style={styles.consentTextBlock}>
                <Text style={styles.consentLabel}>
                  {t(row.labelKey)}
                  {row.required && (
                    <Text style={styles.requiredMarker}> *</Text>
                  )}
                </Text>
                {row.hintKey && (
                  <Text style={styles.consentHint}>{t(row.hintKey)}</Text>
                )}
              </View>
            </TouchableOpacity>
          );
        })}
      </View>

      <TouchableOpacity
        style={[
          styles.continueButton,
          (!consents.terms || isSubmitting) && styles.continueButtonDisabled,
        ]}
        onPress={handleContinue}
        disabled={!consents.terms || isSubmitting}
        accessibilityLabel={t('consent.continue')}
        accessibilityRole="button"
      >
        {isSubmitting ? (
          <ActivityIndicator size="small" color={colors.textPrimary} />
        ) : (
          <Text style={styles.continueButtonText}>{t('consent.continue')}</Text>
        )}
      </TouchableOpacity>
    </ScrollView>
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

  // Consent list
  consentList: {
    gap: spacing.md,
    marginBottom: spacing.xxl,
  },
  consentRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
  },

  // Checkbox
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: borderRadius.sm - 2,
    borderWidth: 2,
    borderColor: colors.surfaceBorder,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
    flexShrink: 0,
  },
  checkboxChecked: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },

  // Text block
  consentTextBlock: {
    flex: 1,
    gap: spacing.xs,
  },
  consentLabel: {
    fontFamily: typography.fontBody,
    fontSize: typography.sizes.sm,
    color: colors.textPrimary,
    lineHeight: 20,
  },
  requiredMarker: {
    color: colors.primary,
    fontWeight: '700',
  },
  consentHint: {
    fontFamily: typography.fontBody,
    fontSize: typography.sizes.xs,
    color: colors.textMuted,
    lineHeight: 17,
  },

  // CTA
  continueButton: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
  },
  continueButtonDisabled: {
    opacity: 0.45,
  },
  continueButtonText: {
    fontFamily: typography.fontBody,
    fontSize: typography.sizes.md,
    fontWeight: '700',
    color: colors.textPrimary,
  },
});
