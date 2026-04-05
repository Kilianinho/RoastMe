import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { colors, typography, spacing, borderRadius } from '@/constants/theme';
import { useMatches } from '@/hooks/useMatches';
import { MatchCard } from '@/components/matching/MatchCard';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { supabase } from '@/lib/supabase';
import type { Gender } from '@/types/database';

type GenderFilter = 'all' | Gender;

const FILTERS: { key: GenderFilter; labelKey: string }[] = [
  { key: 'all', labelKey: 'matches.filterAll' },
  { key: 'male', labelKey: 'matches.filterMen' },
  { key: 'female', labelKey: 'matches.filterWomen' },
];

/**
 * Matches tab screen.
 * Shows a gender-filtered list of potential matches.
 * Free users are limited to 3 views per day — excess shows a paywall card.
 */
export default function MatchesScreen(): React.ReactElement {
  const { t } = useTranslation();
  const {
    matches,
    isLoading,
    error,
    isAtDailyLimit,
    genderFilter,
    setGenderFilter,
    handleLike,
    handlePass,
    refetch,
  } = useMatches();

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isTriggeringMatch, setIsTriggeringMatch] = useState(false);
  const [triggerError, setTriggerError] = useState<string | null>(null);

  const onRefresh = useCallback(async (): Promise<void> => {
    setIsRefreshing(true);
    await refetch();
    setIsRefreshing(false);
  }, [refetch]);

  /**
   * Manually invoke the compute-matches Edge Function, then refresh the list.
   * Useful when the matches list is empty and the user doesn't want to wait for
   * the next 15-minute cron tick.
   */
  const onTriggerCompute = useCallback(async (): Promise<void> => {
    setIsTriggeringMatch(true);
    setTriggerError(null);
    try {
      const { error } = await supabase.functions.invoke('compute-matches', {
        method: 'POST',
        body: {},
      });
      if (error) throw error;
      await refetch();
    } catch (err) {
      const message = err instanceof Error ? err.message : t('common.error');
      setTriggerError(message);
    } finally {
      setIsTriggeringMatch(false);
    }
  }, [refetch, t]);

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* ── Header ─────────────────────────────────────────────── */}
      <View style={styles.pageHeader}>
        <Text style={styles.pageTitle}>{t('matches.title')}</Text>
      </View>

      {/* ── Gender Filter ──────────────────────────────────────── */}
      <View style={styles.filterRow} accessibilityRole="tablist">
        {FILTERS.map(({ key, labelKey }) => (
          <Pressable
            key={key}
            style={[styles.filterChip, genderFilter === key && styles.filterChipActive]}
            onPress={() => setGenderFilter(key)}
            accessibilityLabel={t(labelKey)}
            accessibilityRole="tab"
            accessibilityState={{ selected: genderFilter === key }}
          >
            <Text
              style={[styles.filterLabel, genderFilter === key && styles.filterLabelActive]}
            >
              {t(labelKey)}
            </Text>
          </Pressable>
        ))}
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={() => void onRefresh()}
            tintColor={colors.primary}
          />
        }
      >
        {isLoading && !isRefreshing ? (
          <ActivityIndicator color={colors.primary} style={styles.loader} />
        ) : error ? (
          <ErrorState message={t('common.error')} onRetry={() => void refetch()} t={t} />
        ) : matches.length === 0 ? (
          <EmptyState
            t={t}
            onTriggerCompute={() => void onTriggerCompute()}
            isTriggeringMatch={isTriggeringMatch}
            triggerError={triggerError}
          />
        ) : (
          <>
            {matches.map((match, index) => {
              // Free users: show first 3, then paywall
              if (isAtDailyLimit && index >= 3) return null;

              return (
                <MatchCard
                  key={match.id}
                  match={match}
                  onLike={() => void handleLike(match.id, match.other_user?.id ?? '')}
                  onPass={() => void handlePass(match.id, match.other_user?.id ?? '')}
                />
              );
            })}

            {isAtDailyLimit && matches.length > 3 && (
              <PaywallCard t={t} />
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Sub-components ──────────────────────────────────────────────────────────

interface EmptyStateProps {
  t: (key: string) => string;
  onTriggerCompute: () => void;
  isTriggeringMatch: boolean;
  triggerError: string | null;
}

function EmptyState({
  t,
  onTriggerCompute,
  isTriggeringMatch,
  triggerError,
}: EmptyStateProps): React.ReactElement {
  return (
    <View style={styles.emptyState} accessibilityLabel={t('matches.noMatches')}>
      <Text style={styles.emptyEmoji}>💔</Text>
      <Text style={styles.emptyTitle}>{t('matches.noMatches')}</Text>
      <Text style={styles.emptySubtitle}>{t('matches.noMatchesSubtitle')}</Text>

      {/* Manual trigger — lets users skip the 15-min cron wait */}
      <Button
        label={isTriggeringMatch ? t('matches.findingMatches') : t('matches.findMatchesNow')}
        variant="secondary"
        size="sm"
        onPress={onTriggerCompute}
        disabled={isTriggeringMatch}
        accessibilityLabel={t('matches.findMatchesNow')}
        style={styles.triggerButton}
      />

      {triggerError !== null && (
        <Text style={styles.triggerError}>{triggerError}</Text>
      )}
    </View>
  );
}

function PaywallCard({ t }: { t: (key: string, opts?: Record<string, unknown>) => string }): React.ReactElement {
  return (
    <Card style={styles.paywallCard} elevated>
      <Text style={styles.paywallIcon}>🔒</Text>
      <Text style={styles.paywallTitle}>{t('matches.dailyLimit', { count: 3 })}</Text>
      <Text style={styles.paywallSubtitle}>{t('matches.unlockMore')}</Text>
      <Button
        label={t('common.premium')}
        variant="primary"
        size="md"
        onPress={() => {/* Navigate to premium screen */}}
        accessibilityLabel={t('matches.unlockMore')}
        style={styles.paywallButton}
      />
    </Card>
  );
}

function ErrorState({
  message,
  onRetry,
  t,
}: {
  message: string;
  onRetry: () => void;
  t: (key: string) => string;
}): React.ReactElement {
  return (
    <View style={styles.errorState}>
      <Text style={styles.errorText}>{message}</Text>
      <Button
        label={t('common.retry')}
        variant="secondary"
        size="sm"
        onPress={onRetry}
        accessibilityLabel={t('matches.retryLoading')}
      />
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  pageHeader: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.lg,
    paddingBottom: spacing.sm,
  },
  pageTitle: {
    fontFamily: typography.fontDisplay,
    fontSize: typography.sizes.xxl,
    color: colors.textPrimary,
    letterSpacing: 1,
  },
  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  filterChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderRadius: borderRadius.full,
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
  },
  filterChipActive: {
    backgroundColor: colors.primaryOverlay,
    borderColor: colors.primary,
  },
  filterLabel: {
    fontFamily: typography.fontBody,
    fontSize: typography.sizes.sm,
    color: colors.textMuted,
    fontWeight: '500',
  },
  filterLabelActive: {
    color: colors.primary,
    fontWeight: '700',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.md,
    paddingBottom: spacing.xxl,
  },
  loader: {
    marginVertical: spacing.xl,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: spacing.xxl,
    gap: spacing.md,
  },
  emptyEmoji: {
    fontSize: 64,
  },
  emptyTitle: {
    fontFamily: typography.fontBody,
    fontSize: typography.sizes.xl,
    fontWeight: '700',
    color: colors.textPrimary,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontFamily: typography.fontBody,
    fontSize: typography.sizes.md,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    maxWidth: 280,
  },
  triggerButton: {
    marginTop: spacing.sm,
  },
  triggerError: {
    fontFamily: typography.fontBody,
    fontSize: typography.sizes.sm,
    color: colors.error,
    textAlign: 'center',
    maxWidth: 280,
  },
  paywallCard: {
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.xl,
    marginTop: spacing.md,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  paywallIcon: {
    fontSize: 40,
  },
  paywallTitle: {
    fontFamily: typography.fontBody,
    fontSize: typography.sizes.md,
    fontWeight: '700',
    color: colors.textPrimary,
    textAlign: 'center',
  },
  paywallSubtitle: {
    fontFamily: typography.fontBody,
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  paywallButton: {
    minWidth: 200,
  },
  errorState: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
    gap: spacing.md,
  },
  errorText: {
    fontFamily: typography.fontBody,
    fontSize: typography.sizes.md,
    color: colors.error,
    textAlign: 'center',
  },
});
