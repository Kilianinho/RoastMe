import React from 'react';
import { StyleSheet, Text, View, Pressable } from 'react-native';
import { useTranslation } from 'react-i18next';
import { colors, typography, spacing, borderRadius } from '@/constants/theme';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import type { RoastResult, Question } from '@/types/database';

interface ResultCardProps {
  result: RoastResult;
  question: Question;
  /** True if the question index is beyond the free tier limit */
  isPremiumLocked: boolean;
  /** True if total_responses < minRoastsForResults */
  isLocked: boolean;
  onUnlockPress?: () => void;
}

/**
 * Displays aggregated answer distribution for a single roast question.
 * Shows a horizontal bar chart with percentage labels.
 * Renders a locked state if below minimum response threshold.
 * Renders a premium-locked overlay if the question exceeds the free tier.
 *
 * @param result - Aggregated roast result from DB
 * @param question - Full question object with options
 * @param isPremiumLocked - Whether this card is behind the premium paywall
 * @param isLocked - Whether there are too few responses to reveal results
 * @param onUnlockPress - Callback when "Unlock with Premium" is pressed
 */
export function ResultCard({
  result,
  question,
  isPremiumLocked,
  isLocked,
  onUnlockPress,
}: ResultCardProps): React.ReactElement {
  const { t } = useTranslation();

  if (isPremiumLocked) {
    return (
      <Card style={styles.card}>
        <View style={styles.lockedOverlay} accessibilityLabel="Question verrouillée — Premium requis">
          <Text style={styles.lockIcon}>🔒</Text>
          <Text style={styles.lockedText}>{t('home.premiumLocked')}</Text>
          <Button
            label={t('common.premium')}
            variant="primary"
            size="sm"
            onPress={onUnlockPress}
            accessibilityLabel={t('home.premiumLocked')}
          />
        </View>
      </Card>
    );
  }

  if (isLocked) {
    return (
      <Card style={styles.card}>
        <Text style={styles.questionText} numberOfLines={2}>
          {question.text}
        </Text>
        <View style={styles.lockedMinimum} accessibilityLabel="Pas assez de réponses">
          <Text style={styles.lockIcon}>🔒</Text>
          <Text style={styles.lockedText}>
            {t('home.locked', { count: 3 })}
          </Text>
        </View>
      </Card>
    );
  }

  const sortedOptions = getSortedOptions(result, question);

  return (
    <Card style={styles.card}>
      <Text style={styles.questionText} numberOfLines={3}>
        {question.text}
      </Text>

      <View style={styles.barsContainer} accessibilityLabel={`Résultats pour: ${question.text}`}>
        {sortedOptions.map(({ label, value, percentage, isTop }) => (
          <View key={value} style={styles.barRow}>
            <Text style={styles.optionLabel} numberOfLines={1}>
              {label}
            </Text>
            <View style={styles.barTrack}>
              <View
                style={[
                  styles.barFill,
                  { width: `${percentage}%` },
                  isTop ? styles.barFillTop : styles.barFillOther,
                ]}
                accessibilityLabel={`${label}: ${percentage}%`}
              />
            </View>
            <Text style={[styles.percentLabel, isTop && styles.percentLabelTop]}>
              {percentage}%
            </Text>
          </View>
        ))}
      </View>

      <Text style={styles.footer}>
        {t('home.responses', { count: result.total_responses })}
      </Text>
    </Card>
  );
}

interface OptionRow {
  label: string;
  value: string;
  count: number;
  percentage: number;
  isTop: boolean;
}

function getSortedOptions(result: RoastResult, question: Question): OptionRow[] {
  const dist = result.answer_distribution;
  const total = result.total_responses || 1;

  const rows: OptionRow[] = question.options.map((opt) => {
    const count = dist[opt.value] ?? 0;
    const percentage = Math.round((count / total) * 100);
    return {
      label: opt.label,
      value: opt.value,
      count,
      percentage,
      isTop: opt.value === result.top_answer,
    };
  });

  return rows.sort((a, b) => b.count - a.count);
}

const styles = StyleSheet.create({
  card: {
    marginBottom: spacing.sm,
    gap: spacing.md,
  },
  questionText: {
    fontFamily: typography.fontBody,
    fontSize: typography.sizes.md,
    fontWeight: '600',
    color: colors.textPrimary,
    lineHeight: 22,
  },
  barsContainer: {
    gap: spacing.sm,
  },
  barRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  optionLabel: {
    fontFamily: typography.fontBody,
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
    width: 90,
    flexShrink: 0,
  },
  barTrack: {
    flex: 1,
    height: 8,
    backgroundColor: colors.surfaceBorder,
    borderRadius: borderRadius.full,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: borderRadius.full,
  },
  barFillTop: {
    backgroundColor: colors.primary,
  },
  barFillOther: {
    backgroundColor: colors.surfaceElevated,
  },
  percentLabel: {
    fontFamily: typography.fontMono,
    fontSize: typography.sizes.xs,
    color: colors.textMuted,
    width: 30,
    textAlign: 'right',
  },
  percentLabelTop: {
    color: colors.primary,
    fontWeight: '700',
  },
  footer: {
    fontFamily: typography.fontBody,
    fontSize: typography.sizes.xs,
    color: colors.textMuted,
    textAlign: 'right',
  },
  lockedOverlay: {
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
  },
  lockedMinimum: {
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
  },
  lockIcon: {
    fontSize: 24,
  },
  lockedText: {
    fontFamily: typography.fontBody,
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
    textAlign: 'center',
  },
});
