import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, typography, spacing, borderRadius } from '@/constants/theme';

interface ShareCardProps {
  /** e.g. "X personnes pensent que je suis un golden retriever" */
  statText: string;
  username: string;
  link: string;
}

/**
 * Visual card for social sharing.
 * Rendered off-screen and captured via ViewShot or expo-image-manipulator.
 *
 * @param statText - Highlight stat sentence for the card
 * @param username - User's username (@kilian)
 * @param link - Full share link (roast.me/kilian)
 */
export function ShareCard({ statText, username, link }: ShareCardProps): React.ReactElement {
  return (
    <View
      style={styles.card}
      accessibilityLabel={`Carte de partage pour @${username}`}
    >
      <View style={styles.topRow}>
        <Text style={styles.logo}>🔥 RoastMe</Text>
        <Text style={styles.handle}>@{username}</Text>
      </View>

      <View style={styles.statContainer}>
        <Text style={styles.quoteMarks}>"</Text>
        <Text style={styles.statText}>{statText}</Text>
        <Text style={styles.quoteMarks}>"</Text>
      </View>

      <View style={styles.bottomRow}>
        <Text style={styles.cta}>Découvre ce que tes amis pensent de toi</Text>
        <Text style={styles.link}>{link}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: 320,
    minHeight: 200,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    gap: spacing.md,
    // Simulates gradient using a rich base color — install expo-linear-gradient
    // and swap View → LinearGradient for a true gradient effect.
    backgroundColor: colors.primary,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  logo: {
    fontFamily: typography.fontDisplay,
    fontSize: typography.sizes.xl,
    color: colors.textPrimary,
    letterSpacing: 1,
  },
  handle: {
    fontFamily: typography.fontBody,
    fontSize: typography.sizes.sm,
    color: 'rgba(255,255,255,0.8)',
    fontWeight: '600',
  },
  statContainer: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  quoteMarks: {
    fontFamily: typography.fontDisplay,
    fontSize: 48,
    color: 'rgba(255,255,255,0.3)',
    lineHeight: 36,
  },
  statText: {
    fontFamily: typography.fontBody,
    fontSize: typography.sizes.lg,
    color: colors.textPrimary,
    fontWeight: '700',
    textAlign: 'center',
    lineHeight: 26,
    paddingHorizontal: spacing.sm,
  },
  bottomRow: {
    gap: spacing.xs,
  },
  cta: {
    fontFamily: typography.fontBody,
    fontSize: typography.sizes.xs,
    color: 'rgba(255,255,255,0.7)',
    textAlign: 'center',
  },
  link: {
    fontFamily: typography.fontMono,
    fontSize: typography.sizes.sm,
    color: colors.textPrimary,
    textAlign: 'center',
    fontWeight: '700',
  },
});
