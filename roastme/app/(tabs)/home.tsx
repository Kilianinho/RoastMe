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
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { colors, typography, spacing, borderRadius } from '@/constants/theme';
import { useAuthStore } from '@/stores/authStore';
import { useRoastResults } from '@/hooks/useRoastResults';
import { config } from '@/constants/config';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { FireScoreGauge } from '@/components/roast/FireScoreGauge';
import { ResultCard } from '@/components/roast/ResultCard';

const FREE_QUESTIONS_LIMIT = config.limits.freeQuestionsVisible;
const MIN_RESPONSES = config.limits.minRoastsForResults;

/**
 * Home / Dashboard screen.
 * Displays the user's fire score, per-question result cards,
 * and a share CTA. Free users see only the first 5 questions.
 */
export default function HomeScreen(): React.ReactElement {
  const { t } = useTranslation();
  const router = useRouter();
  const profile = useAuthStore((s) => s.profile);
  const isPremium = profile?.is_premium ?? false;

  const { results, fireScore, isLoading, error, refetch } = useRoastResults();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const onRefresh = useCallback(async (): Promise<void> => {
    setIsRefreshing(true);
    await refetch();
    setIsRefreshing(false);
  }, [refetch]);

  const fireScoreSubtitle = getFireScoreSubtitle(fireScore, t);
  const newRoastCount = profile?.roast_count ?? 0;

  return (
    <SafeAreaView style={styles.safeArea}>
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
        {/* ── Header ─────────────────────────────────────────────── */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Avatar
              uri={profile?.avatar_url}
              name={profile?.display_name}
              size="md"
              isPremium={isPremium}
            />
            <View style={styles.headerText}>
              <Text style={styles.greeting}>
                {t('home.greeting', { name: profile?.display_name ?? '' })} 🔥
              </Text>
            </View>
          </View>

          <Pressable
            onPress={() => router.push('/share')}
            style={styles.shareButton}
            accessibilityLabel={t('home.shareLink')}
            accessibilityRole="button"
          >
            <Text style={styles.shareIcon}>🔗</Text>
          </Pressable>
        </View>

        {newRoastCount > 0 && (
          <Badge
            label={t('home.newRoasts', { count: newRoastCount })}
            color="primary"
            style={styles.roastCountBadge}
          />
        )}

        {/* ── Fire Score ─────────────────────────────────────────── */}
        <Card style={styles.scoreCard}>
          <Text style={styles.sectionTitle}>{t('home.fireScore')}</Text>
          {isLoading ? (
            <ActivityIndicator color={colors.primary} style={styles.loader} />
          ) : (
            <FireScoreGauge score={fireScore} subtitle={fireScoreSubtitle} />
          )}
        </Card>

        {/* ── Results ────────────────────────────────────────────── */}
        <Text style={styles.sectionTitle}>{t('home.results')}</Text>

        {isLoading && !isRefreshing ? (
          <ActivityIndicator color={colors.primary} style={styles.loader} />
        ) : error ? (
          <ErrorState message={t('common.error')} onRetry={() => void refetch()} t={t} />
        ) : results.length === 0 ? (
          <EmptyState onShare={() => router.push('/share')} t={t} />
        ) : (
          <>
            {results.map((item, index) => {
              const isLocked = item.total_responses < MIN_RESPONSES;
              const isPremiumLocked = !isPremium && index >= FREE_QUESTIONS_LIMIT;

              return (
                <ResultCard
                  key={item.id}
                  result={item}
                  question={item.question}
                  isLocked={isLocked}
                  isPremiumLocked={isPremiumLocked}
                  onUnlockPress={() => router.push('/share')}
                />
              );
            })}
          </>
        )}

        {/* ── Activity Feed ───────────────────────────────────────── */}
        {results.length > 0 && (
          <ActivitySection roastCount={profile?.roast_count ?? 0} t={t} />
        )}

        {/* ── Share CTA (floating bottom) ────────────────────────── */}
        <Button
          label={t('home.shareLink')}
          variant="primary"
          size="lg"
          onPress={() => router.push('/share')}
          accessibilityLabel={t('home.shareLink')}
          style={styles.shareCTA}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function EmptyState({ onShare, t }: { onShare: () => void; t: (key: string) => string }): React.ReactElement {
  return (
    <View style={styles.emptyState} accessibilityLabel={t('home.noRoasts')}>
      <Text style={styles.emptyEmoji}>🔥</Text>
      <Text style={styles.emptyTitle}>{t('home.noRoasts')}</Text>
      <Text style={styles.emptySubtitle}>{t('home.noRoastsSubtitle')}</Text>
      <Button
        label={t('home.shareLink')}
        variant="primary"
        size="md"
        onPress={onShare}
        accessibilityLabel={t('home.shareLink')}
        style={styles.emptyButton}
      />
    </View>
  );
}

function ActivitySection({
  roastCount,
  t,
}: {
  roastCount: number;
  t: (key: string, opts?: Record<string, unknown>) => string;
}): React.ReactElement {
  // I-3 fix: only show count summary, not fake timestamps
  return (
    <View style={styles.activitySection}>
      <Text style={styles.sectionTitle}>{t('home.activity')}</Text>
      {roastCount === 0 ? (
        <Text style={styles.noActivity}>{t('home.noRoasts')}</Text>
      ) : (
        <Card style={styles.activityItem}>
          <Text style={styles.activityDot}>🔥</Text>
          <Text style={styles.activityText}>
            {t('home.responses', { count: roastCount })}
          </Text>
        </Card>
      )}
    </View>
  );
}

function ErrorState({ message, onRetry, t }: { message: string; onRetry: () => void; t: (key: string) => string }): React.ReactElement {
  return (
    <View style={styles.errorState}>
      <Text style={styles.errorText}>{message}</Text>
      <Button
        label={t('common.retry')}
        variant="secondary"
        size="sm"
        onPress={onRetry}
        accessibilityLabel={t('common.retry')}
      />
    </View>
  );
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getFireScoreSubtitle(score: number, t: (key: string) => string): string {
  if (score >= 80) return t('home.fireScoreVeryHigh');
  if (score >= 60) return t('home.fireScoreHigh');
  if (score >= 40) return t('home.fireScoreMedium');
  if (score >= 20) return t('home.fireScoreLow');
  return t('home.fireScoreVeryLow');
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.md,
    paddingBottom: spacing.xxl,
    gap: spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
  },
  headerText: {
    flex: 1,
  },
  greeting: {
    fontFamily: typography.fontBody,
    fontSize: typography.sizes.lg,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  shareButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shareIcon: {
    fontSize: 18,
  },
  roastCountBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.sm,
    height: 24,
    borderRadius: borderRadius.full,
    minWidth: undefined,
  },
  scoreCard: {
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.lg,
  },
  sectionTitle: {
    fontFamily: typography.fontBody,
    fontSize: typography.sizes.lg,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  loader: {
    marginVertical: spacing.xl,
  },
  activitySection: {
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
  },
  activityDot: {
    fontSize: 16,
  },
  activityText: {
    fontFamily: typography.fontBody,
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
    flex: 1,
  },
  noActivity: {
    fontFamily: typography.fontBody,
    fontSize: typography.sizes.sm,
    color: colors.textMuted,
    textAlign: 'center',
    paddingVertical: spacing.md,
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
  },
  emptyButton: {
    marginTop: spacing.sm,
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
  shareCTA: {
    marginTop: spacing.lg,
  },
});
