import React, { useCallback, useState } from 'react';
import {
  Alert,
  Linking,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import * as Sharing from 'expo-sharing';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { colors, typography, spacing, borderRadius } from '@/constants/theme';
import { useAuthStore } from '@/stores/authStore';
import { config } from '@/constants/config';
import { copyToClipboard, shareToWhatsApp, shareToInstagram } from '@/utils/shareLink';
import { ShareCard } from '@/components/roast/ShareCard';
import { Button } from '@/components/ui/Button';

interface ShareOption {
  key: string;
  label: string;
  icon: string;
  color: string;
  action: (link: string) => Promise<void>;
}

/**
 * Share screen — lets the user copy or share their unique roast link.
 * Shows a visual share card preview and platform-specific share buttons.
 */
export default function ShareScreen(): React.ReactElement {
  const { t } = useTranslation();
  const router = useRouter();
  const profile = useAuthStore((s) => s.profile);

  const [copied, setCopied] = useState(false);

  const shareLink = profile?.share_link
    ?? `${config.app.url}/${profile?.username ?? ''}`;

  const statText = profile?.roast_count
    ? `${profile.roast_count} personnes m'ont roasté !`
    : 'Viens découvrir ce que tes amis pensent de moi...';

  const handleCopy = useCallback(async (): Promise<void> => {
    try {
      await copyToClipboard(shareLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      Alert.alert(t('common.error'), t('errors.unknown'));
    }
  }, [shareLink, t]);

  const shareOptions: ShareOption[] = [
    {
      key: 'instagram',
      label: t('share.shareInstagram'),
      icon: '📸',
      color: '#E1306C',
      action: async (_link) => {
        await shareToInstagram(profile?.username ?? '');
      },
    },
    {
      key: 'whatsapp',
      label: t('share.shareWhatsApp'),
      icon: '💬',
      color: '#25D366',
      action: async (_link) => {
        await shareToWhatsApp(profile?.username ?? '', `${statText}\n\n${shareLink}`);
      },
    },
    {
      key: 'tiktok',
      label: t('share.shareTikTok'),
      icon: '🎵',
      color: '#010101',
      action: async (link) => {
        await handleNativeShare(link, t);
      },
    },
    {
      key: 'other',
      label: t('share.shareOther'),
      icon: '↗',
      color: colors.surfaceElevated,
      action: async (link) => {
        await handleNativeShare(link, t);
      },
    },
  ];

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* ── Header ─────────────────────────────────────────────── */}
      <View style={styles.header}>
        <Pressable
          style={styles.backButton}
          onPress={() => router.back()}
          accessibilityLabel="Retour"
          accessibilityRole="button"
        >
          <Text style={styles.backIcon}>←</Text>
        </Pressable>
        <Text style={styles.pageTitle}>{t('share.title')}</Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.subtitle}>{t('share.subtitle')}</Text>

        {/* ── Share Card Preview ─────────────────────────────────── */}
        <View style={styles.cardPreview}>
          <ShareCard
            statText={statText}
            username={profile?.username ?? ''}
            link={shareLink}
          />
        </View>

        {/* ── Link Display + Copy ───────────────────────────────── */}
        <View style={styles.linkBox}>
          <Text style={styles.linkText} numberOfLines={1} selectable>
            {shareLink}
          </Text>
          <Button
            label={copied ? t('common.copied') : t('share.copyLink')}
            variant={copied ? 'secondary' : 'primary'}
            size="sm"
            onPress={() => void handleCopy()}
            accessibilityLabel={t('share.copyLink')}
            style={styles.copyButton}
          />
        </View>

        {/* ── Platform Share Buttons ─────────────────────────────── */}
        <View style={styles.shareGrid}>
          {shareOptions.map((opt) => (
            <Pressable
              key={opt.key}
              style={({ pressed }) => [
                styles.shareOption,
                pressed && styles.shareOptionPressed,
              ]}
              onPress={() => void opt.action(shareLink)}
              accessibilityLabel={opt.label}
              accessibilityRole="button"
            >
              <View style={[styles.shareIconBg, { backgroundColor: opt.color }]}>
                <Text style={styles.shareIconEmoji}>{opt.icon}</Text>
              </View>
              <Text style={styles.shareOptionLabel} numberOfLines={2}>
                {opt.label}
              </Text>
            </Pressable>
          ))}
        </View>

        <Button
          label={t('share.seeResults')}
          variant="ghost"
          size="md"
          onPress={() => router.back()}
          accessibilityLabel={t('share.seeResults')}
          style={styles.seeResultsButton}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function handleNativeShare(link: string, t: (key: string) => string): Promise<void> {
  const isAvailable = await Sharing.isAvailableAsync();
  if (!isAvailable) {
    Alert.alert(t('common.error'), 'Le partage n\'est pas disponible sur cet appareil.');
    return;
  }
  // expo-sharing primarily shares files; for text/URL sharing use Linking
  await Linking.openURL(`sms:?body=${encodeURIComponent(link)}`);
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    gap: spacing.md,
  },
  backButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 18,
  },
  backIcon: {
    fontSize: 20,
    color: colors.textPrimary,
  },
  pageTitle: {
    fontFamily: typography.fontDisplay,
    fontSize: typography.sizes.xl,
    color: colors.textPrimary,
    letterSpacing: 1,
  },
  scrollContent: {
    padding: spacing.md,
    paddingBottom: spacing.xxl,
    gap: spacing.lg,
    alignItems: 'center',
  },
  subtitle: {
    fontFamily: typography.fontBody,
    fontSize: typography.sizes.md,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  cardPreview: {
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 12,
  },
  linkBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceElevated,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    paddingLeft: spacing.md,
    gap: spacing.sm,
    width: '100%',
    overflow: 'hidden',
  },
  linkText: {
    fontFamily: typography.fontMono,
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
    flex: 1,
  },
  copyButton: {
    borderRadius: 0,
    borderTopRightRadius: borderRadius.md,
    borderBottomRightRadius: borderRadius.md,
  },
  shareGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: spacing.md,
    width: '100%',
  },
  shareOption: {
    alignItems: 'center',
    gap: spacing.sm,
    width: 76,
  },
  shareOptionPressed: {
    opacity: 0.7,
  },
  shareIconBg: {
    width: 56,
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shareIconEmoji: {
    fontSize: 26,
  },
  shareOptionLabel: {
    fontFamily: typography.fontBody,
    fontSize: typography.sizes.xs,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 16,
  },
  seeResultsButton: {
    marginTop: spacing.sm,
  },
});
