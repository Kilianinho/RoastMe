import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { colors, typography, spacing, borderRadius } from '@/constants/theme';
import { Card } from '@/components/ui/Card';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import type { Match } from '@/types/database';
import { config } from '@/constants/config';

interface MatchCardProps {
  match: Match;
  onLike: () => void;
  onPass: () => void;
}

/**
 * Displays a potential match with compatibility score and action buttons.
 * Shows a "Coup de foudre" badge when compatibility >= 0.85.
 *
 * @param match - Match record including other_user profile
 * @param onLike - Called when the heart button is pressed
 * @param onPass - Called when the X button is pressed
 */
export function MatchCard({ match, onLike, onPass }: MatchCardProps): React.ReactElement {
  const { t } = useTranslation();
  const otherUser = match.other_user;
  const scorePercent = Math.round(match.compatibility_score * 100);
  const isCoupDeFoudre = match.compatibility_score >= config.limits.matchCoupDeFoudreThreshold;

  return (
    <Card style={styles.card} elevated>
      <View style={styles.header}>
        <Avatar
          uri={otherUser?.avatar_url}
          name={otherUser?.display_name}
          size="lg"
          isPremium={otherUser?.is_premium}
        />

        <View style={styles.userInfo}>
          <View style={styles.nameRow}>
            <Text style={styles.displayName} numberOfLines={1}>
              {otherUser?.display_name ?? '—'}
            </Text>
            {isCoupDeFoudre && (
              <Badge
                label={t('matches.coupDeFoudre')}
                color="gold"
                style={styles.coupDeFoudreBadge}
              />
            )}
          </View>

          <Text style={styles.username} numberOfLines={1}>
            @{otherUser?.username ?? '—'}
          </Text>

          <View style={styles.compatibilityRow}>
            <Text style={styles.compatibilityText}>
              {t('matches.compatible', { score: scorePercent })}
            </Text>
            <CompatibilityBar score={match.compatibility_score} />
          </View>
        </View>
      </View>

      {match.common_answers > 0 && (
        <Text style={styles.commonTrait} numberOfLines={2}>
          {t('matches.commonTrait', { trait: getCommonTraitLabel(match.common_answers) })}
        </Text>
      )}

      <View style={styles.actions}>
        <Pressable
          style={[styles.actionButton, styles.passButton]}
          onPress={onPass}
          accessibilityLabel={`Passer ${otherUser?.display_name ?? 'cet utilisateur'}`}
          accessibilityRole="button"
        >
          <Text style={styles.passIcon}>✕</Text>
        </Pressable>

        <Pressable
          style={[styles.actionButton, styles.likeButton]}
          onPress={onLike}
          accessibilityLabel={`Liker ${otherUser?.display_name ?? 'cet utilisateur'}`}
          accessibilityRole="button"
        >
          <Text style={styles.likeIcon}>♥</Text>
        </Pressable>
      </View>
    </Card>
  );
}

function CompatibilityBar({ score }: { score: number }): React.ReactElement {
  const barColor = score >= 0.85 ? colors.matchGold : colors.primary;
  return (
    <View style={styles.compatBarTrack}>
      <View
        style={[styles.compatBarFill, { width: `${score * 100}%`, backgroundColor: barColor }]}
      />
    </View>
  );
}

function getCommonTraitLabel(count: number): string {
  if (count >= 7) return 'des personnes fun et sociables';
  if (count >= 5) return 'des personnes créatives';
  return 'des personnes similaires';
}

const styles = StyleSheet.create({
  card: {
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  header: {
    flexDirection: 'row',
    gap: spacing.md,
    alignItems: 'flex-start',
  },
  userInfo: {
    flex: 1,
    gap: spacing.xs,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    flexWrap: 'wrap',
  },
  displayName: {
    fontFamily: typography.fontBody,
    fontSize: typography.sizes.lg,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  coupDeFoudreBadge: {
    paddingHorizontal: spacing.sm,
    height: 20,
    borderRadius: borderRadius.full,
    minWidth: undefined,
  },
  username: {
    fontFamily: typography.fontBody,
    fontSize: typography.sizes.sm,
    color: colors.textMuted,
  },
  compatibilityRow: {
    gap: spacing.xs,
  },
  compatibilityText: {
    fontFamily: typography.fontBody,
    fontSize: typography.sizes.sm,
    color: colors.matchGold,
    fontWeight: '600',
  },
  compatBarTrack: {
    height: 4,
    backgroundColor: colors.surfaceBorder,
    borderRadius: borderRadius.full,
    overflow: 'hidden',
  },
  compatBarFill: {
    height: '100%',
    borderRadius: borderRadius.full,
  },
  commonTrait: {
    fontFamily: typography.fontBody,
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
    fontStyle: 'italic',
    lineHeight: 20,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.xl,
    paddingTop: spacing.xs,
  },
  actionButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  passButton: {
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1.5,
    borderColor: colors.surfaceBorder,
  },
  likeButton: {
    backgroundColor: colors.primaryOverlay,
    borderWidth: 1.5,
    borderColor: colors.primary,
  },
  passIcon: {
    fontSize: 22,
    color: colors.textMuted,
    fontWeight: '700',
  },
  likeIcon: {
    fontSize: 22,
    color: colors.primary,
  },
});
