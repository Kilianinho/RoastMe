import React, { useEffect, useState } from 'react';
import {
  Alert,
  Linking,
  Modal,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as Notifications from 'expo-notifications';
import i18n from '@/lib/i18n';
import { colors, typography, spacing, borderRadius } from '@/constants/theme';
import { useAuthStore } from '@/stores/authStore';
import { supabase } from '@/lib/supabase';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';

const LEGAL_URLS = {
  tos: 'https://roast.me/legal/terms',
  privacy: 'https://roast.me/legal/privacy',
} as const;

/**
 * Profile tab screen.
 * Shows user info, stats, settings toggles, premium CTA, and danger zone.
 */
export default function ProfileScreen(): React.ReactElement {
  const { t } = useTranslation();
  const profile = useAuthStore((s) => s.profile);
  const signOut = useAuthStore((s) => s.signOut);

  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [matchingEnabled, setMatchingEnabled] = useState(profile?.allow_matching ?? true);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const [isDownloadingData, setIsDownloadingData] = useState(false);
  const [deleteConfirmVisible, setDeleteConfirmVisible] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [matchesCount, setMatchesCount] = useState<number | null>(null);
  const [avgCompatibility, setAvgCompatibility] = useState<number | null>(null);

  // ── Seed notification toggle from actual OS permission state ──────────────
  useEffect(() => {
    void (async () => {
      const { status } = await Notifications.getPermissionsAsync();
      setNotificationsEnabled(status === 'granted');
    })();
  }, []);

  // ── Load stats from Supabase ───────────────────────────────────────────────
  useEffect(() => {
    if (!profile) return;

    void (async () => {
      const { data, error } = await supabase
        .from('matches')
        .select('compatibility_score')
        .or(`user_a_id.eq.${profile.id},user_b_id.eq.${profile.id}`)
        .eq('status', 'matched');

      if (error || !data) return;

      setMatchesCount(data.length);
      if (data.length > 0) {
        const sum = data.reduce((acc, row) => acc + row.compatibility_score, 0);
        setAvgCompatibility(Math.round((sum / data.length) * 100));
      } else {
        setAvgCompatibility(0);
      }
    })();
  }, [profile?.id]);

  const handleMatchingToggle = async (value: boolean): Promise<void> => {
    setMatchingEnabled(value);
    if (!profile) return;

    const { error } = await supabase
      .from('profiles')
      .update({ allow_matching: value })
      .eq('id', profile.id);

    if (error) {
      // Revert optimistic update on failure
      setMatchingEnabled(!value);
      Alert.alert(t('common.error'), t('errors.unknown'));
    }
  };

  const handleLanguageChange = (): void => {
    Alert.alert(
      t('profile.language'),
      '',
      [
        { text: 'Français', onPress: () => void i18n.changeLanguage('fr') },
        { text: 'English', onPress: () => void i18n.changeLanguage('en') },
        { text: t('common.cancel'), style: 'cancel' },
      ]
    );
  };

  const handleNotificationsToggle = async (value: boolean): Promise<void> => {
    if (value) {
      // Request permission if toggling on.
      const { status } = await Notifications.requestPermissionsAsync();
      const granted = status === 'granted';
      setNotificationsEnabled(granted);

      if (!granted) {
        // The OS denied the request — direct the user to system settings.
        Alert.alert(
          t('profile.notifications'),
          t('errors.notificationsPermissionDenied'),
          [
            { text: t('common.cancel'), style: 'cancel' },
            {
              text: t('profile.openSettings'),
              onPress: () => void Linking.openSettings(),
            },
          ]
        );
      } else {
        Notifications.setNotificationHandler({
          handleNotification: async () => ({
            shouldShowAlert: true,
            shouldPlaySound: true,
            shouldSetBadge: true,
            shouldShowBanner: true,
            shouldShowList: true,
          }),
        });
      }
    } else {
      // React Native / Expo cannot programmatically revoke permissions once
      // granted — only the user can do this from system settings.
      // We disable the handler so notifications are silently ignored while
      // the user's session is active, and direct them to settings if they
      // want to fully revoke.
      Notifications.setNotificationHandler(null);
      setNotificationsEnabled(false);

      Alert.alert(
        t('profile.notifications'),
        t('errors.notificationsCannotRevoke'),
        [
          { text: t('common.ok') },
          {
            text: t('profile.openSettings'),
            onPress: () => void Linking.openSettings(),
          },
        ]
      );
    }
  };

  const handleDownloadData = async (): Promise<void> => {
    if (!profile) return;

    setIsDownloadingData(true);
    try {
      // Fetch all data in parallel to minimise latency.
      const [profileRes, resultsRes, matchesRes, messagesRes] = await Promise.all([
        supabase
          .from('profiles')
          .select('*')
          .eq('id', profile.id)
          .single(),
        supabase
          .from('roast_results')
          .select('*, question:questions(*)')
          .eq('profile_id', profile.id),
        supabase
          .from('matches')
          .select('*')
          .or(`user_a_id.eq.${profile.id},user_b_id.eq.${profile.id}`),
        supabase
          .from('messages')
          .select('*')
          .eq('sender_id', profile.id),
      ]);

      // Surface the first error encountered rather than silently dropping data.
      const firstError = profileRes.error ?? resultsRes.error ?? matchesRes.error ?? messagesRes.error;
      if (firstError) throw new Error(firstError.message);

      const exportPayload = {
        exported_at: new Date().toISOString(),
        profile: profileRes.data,
        roast_results: resultsRes.data ?? [],
        matches: matchesRes.data ?? [],
        messages: messagesRes.data ?? [],
      };

      const json = JSON.stringify(exportPayload, null, 2);
      const filename = `roastme-data-${profile.username}-${Date.now()}.json`;
      const file = new File(Paths.cache, filename);
      file.create();
      file.write(json);
      const fileUri = file.uri;

      const canShare = await Sharing.isAvailableAsync();
      if (!canShare) {
        // Simulator / unsupported platform: inform the user.
        Alert.alert(t('profile.downloadData'), t('errors.sharingNotAvailable'));
        return;
      }

      await Sharing.shareAsync(fileUri, {
        mimeType: 'application/json',
        dialogTitle: t('profile.downloadData'),
        UTI: 'public.json', // iOS only — ignored on Android
      });
    } catch (err) {
      Alert.alert(
        t('common.error'),
        err instanceof Error ? err.message : t('errors.unknown')
      );
    } finally {
      setIsDownloadingData(false);
    }
  };

  const handleDeleteAccount = async (): Promise<void> => {
    if (!profile || deleteConfirmText !== profile.username) return;

    setIsDeletingAccount(true);
    try {
      // Soft delete — sets deleted_at, RLS policies hide the profile
      const { error } = await supabase
        .from('profiles')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', profile.id);

      if (error) throw error;

      // Also request auth user deletion via Edge Function (C-7 GDPR fix)
      await supabase.functions.invoke('delete-auth-user', {
        body: { user_id: profile.id },
      }).catch(() => {
        // Non-blocking — the profile is already soft-deleted
        // Admin can clean up auth.users in batch if this fails
      });

      await signOut();
    } catch {
      Alert.alert(t('common.error'), t('errors.unknown'));
    } finally {
      setIsDeletingAccount(false);
      setDeleteConfirmVisible(false);
    }
  };

  const handleSignOut = (): void => {
    Alert.alert(
      t('auth.logout'),
      '',
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('auth.logout'),
          style: 'destructive',
          onPress: () => void signOut(),
        },
      ]
    );
  };

  const currentLang = i18n.language === 'fr' ? 'Français' : 'English';

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ── User Info Header ───────────────────────────────────── */}
        <View style={styles.profileHeader}>
          <Avatar
            uri={profile?.avatar_url}
            name={profile?.display_name}
            size="xl"
            isPremium={profile?.is_premium}
          />
          <Text style={styles.displayName}>{profile?.display_name ?? '—'}</Text>
          <Text style={styles.username}>@{profile?.username ?? '—'}</Text>
          {profile?.bio ? (
            <Text style={styles.bio} numberOfLines={3}>{profile.bio}</Text>
          ) : null}
        </View>

        {/* ── Stats ──────────────────────────────────────────────── */}
        <Card style={styles.statsCard}>
          <Text style={styles.sectionTitle}>{t('profile.stats')}</Text>
          <View style={styles.statsRow}>
            <StatItem
              value={profile?.roast_count ?? 0}
              label={t('profile.roastsReceived')}
            />
            <View style={styles.statsDivider} />
            <StatItem
              value={matchesCount !== null ? matchesCount : '—'}
              label={t('profile.matchesCount')}
            />
            <View style={styles.statsDivider} />
            <StatItem
              value={avgCompatibility !== null ? `${avgCompatibility}%` : '—'}
              label={t('profile.avgCompatibility')}
            />
          </View>
        </Card>

        {/* ── Settings ───────────────────────────────────────────── */}
        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>{t('profile.settings')}</Text>

          <SettingRow
            label={t('profile.notifications')}
            accessibilityLabel={t('profile.notifications')}
            right={
              <Switch
                value={notificationsEnabled}
                onValueChange={(v) => void handleNotificationsToggle(v)}
                trackColor={{ false: colors.surfaceBorder, true: colors.primary }}
                thumbColor={colors.textPrimary}
                accessibilityLabel={`${t('profile.notifications')}: ${notificationsEnabled ? 'on' : 'off'}`}
              />
            }
          />

          <SettingRow
            label={t('profile.matching')}
            accessibilityLabel={t('profile.matching')}
            right={
              <Switch
                value={matchingEnabled}
                onValueChange={(v) => void handleMatchingToggle(v)}
                trackColor={{ false: colors.surfaceBorder, true: colors.primary }}
                thumbColor={colors.textPrimary}
                accessibilityLabel={`${t('profile.matching')}: ${matchingEnabled ? 'on' : 'off'}`}
              />
            }
          />

          <SettingRow
            label={t('profile.language')}
            accessibilityLabel={`${t('profile.language')}: ${currentLang}`}
            right={
              <Button
                label={currentLang}
                variant="ghost"
                size="sm"
                onPress={handleLanguageChange}
                accessibilityLabel={`${t('profile.language')}: ${currentLang}`}
              />
            }
          />
        </Card>

        {/* ── Premium ────────────────────────────────────────────── */}
        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>{t('profile.premiumSection')}</Text>
          {profile?.is_premium ? (
            <Text style={styles.premiumActive}>{t('common.premium')} ✓</Text>
          ) : (
            <>
              <Text style={styles.premiumSubtitle}>{t('premium.subtitle')}</Text>
              <Button
                label={t('profile.upgradePremium')}
                variant="primary"
                size="md"
                onPress={() => {/* Navigate to premium screen */}}
                accessibilityLabel={t('profile.upgradePremium')}
                style={styles.premiumButton}
              />
              <Button
                label={t('profile.restorePurchase')}
                variant="ghost"
                size="sm"
                onPress={() => {/* Restore purchase via RevenueCat */}}
                accessibilityLabel={t('profile.restorePurchase')}
              />
            </>
          )}
        </Card>

        {/* ── Legal ──────────────────────────────────────────────── */}
        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>{t('profile.legal')}</Text>
          <Button
            label={t('profile.termsOfService')}
            variant="ghost"
            size="sm"
            onPress={() => void Linking.openURL(LEGAL_URLS.tos)}
            accessibilityLabel={t('profile.termsOfService')}
            style={styles.legalButton}
          />
          <Button
            label={t('profile.privacyPolicy')}
            variant="ghost"
            size="sm"
            onPress={() => void Linking.openURL(LEGAL_URLS.privacy)}
            accessibilityLabel={t('profile.privacyPolicy')}
            style={styles.legalButton}
          />
        </Card>

        {/* ── Danger Zone ─────────────────────────────────────────── */}
        <Card style={[styles.section, styles.dangerCard]}>
          <Text style={[styles.sectionTitle, styles.dangerTitle]}>{t('profile.dangerZone')}</Text>
          <Button
            label={t('profile.downloadData')}
            variant="secondary"
            size="md"
            onPress={() => void handleDownloadData()}
            isLoading={isDownloadingData}
            disabled={isDownloadingData}
            accessibilityLabel={t('profile.downloadData')}
          />
          <Button
            label={t('profile.deleteAccount')}
            variant="secondary"
            size="md"
            onPress={() => setDeleteConfirmVisible(true)}
            accessibilityLabel={t('profile.deleteAccount')}
            style={styles.deleteButton}
          />
        </Card>

        {/* ── Sign Out ────────────────────────────────────────────── */}
        <Button
          label={t('auth.logout')}
          variant="ghost"
          size="lg"
          onPress={handleSignOut}
          accessibilityLabel={t('auth.logout')}
          style={styles.signOutButton}
        />
      </ScrollView>

      {/* ── Delete Account Confirmation Modal ──────────────────── */}
      <Modal
        visible={deleteConfirmVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setDeleteConfirmVisible(false)}
        accessibilityViewIsModal
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.confirmModal}>
            <Text style={styles.confirmTitle}>{t('profile.deleteAccount')}</Text>
            <Text style={styles.confirmBody}>{t('profile.deleteConfirm')}</Text>
            <Text style={styles.confirmHint}>
              {t('profile.deleteConfirm')} <Text style={styles.confirmUsername}>@{profile?.username}</Text>
            </Text>
            <TextInput
              style={styles.confirmInput}
              value={deleteConfirmText}
              onChangeText={setDeleteConfirmText}
              placeholder={profile?.username ?? ''}
              placeholderTextColor={colors.textMuted}
              autoCapitalize="none"
              accessibilityLabel={t('profile.deleteAccount')}
            />
            <View style={styles.confirmActions}>
              <Button
                label={t('common.cancel')}
                variant="secondary"
                size="md"
                onPress={() => {
                  setDeleteConfirmVisible(false);
                  setDeleteConfirmText('');
                }}
                accessibilityLabel={t('common.cancel')}
                style={styles.confirmButton}
              />
              <Button
                label={t('profile.deleteAccount')}
                variant="primary"
                size="md"
                onPress={() => void handleDeleteAccount()}
                isLoading={isDeletingAccount}
                disabled={deleteConfirmText !== profile?.username}
                accessibilityLabel={t('profile.deleteAccount')}
                style={[styles.confirmButton, styles.deleteConfirmButton]}
              />
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function StatItem({ value, label }: { value: number | string; label: string }): React.ReactElement {
  return (
    <View style={styles.statItem} accessibilityLabel={`${label}: ${value}`}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

interface SettingRowProps {
  label: string;
  accessibilityLabel: string;
  right: React.ReactNode;
}

function SettingRow({ label, accessibilityLabel, right }: SettingRowProps): React.ReactElement {
  return (
    <View style={styles.settingRow} accessibilityLabel={accessibilityLabel}>
      <Text style={styles.settingLabel}>{label}</Text>
      {right}
    </View>
  );
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
  profileHeader: {
    alignItems: 'center',
    paddingVertical: spacing.lg,
    gap: spacing.sm,
  },
  displayName: {
    fontFamily: typography.fontDisplay,
    fontSize: typography.sizes.xxl,
    color: colors.textPrimary,
    letterSpacing: 1,
  },
  username: {
    fontFamily: typography.fontBody,
    fontSize: typography.sizes.md,
    color: colors.textMuted,
  },
  bio: {
    fontFamily: typography.fontBody,
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    maxWidth: 280,
  },
  statsCard: {
    gap: spacing.md,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  statItem: {
    alignItems: 'center',
    gap: spacing.xs,
    flex: 1,
  },
  statValue: {
    fontFamily: typography.fontDisplay,
    fontSize: typography.sizes.xxl,
    color: colors.textPrimary,
  },
  statLabel: {
    fontFamily: typography.fontBody,
    fontSize: typography.sizes.xs,
    color: colors.textMuted,
    textAlign: 'center',
  },
  statsDivider: {
    width: 1,
    height: 40,
    backgroundColor: colors.surfaceBorder,
  },
  section: {
    gap: spacing.sm,
  },
  sectionTitle: {
    fontFamily: typography.fontBody,
    fontSize: typography.sizes.md,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.xs,
  },
  settingLabel: {
    fontFamily: typography.fontBody,
    fontSize: typography.sizes.md,
    color: colors.textPrimary,
    flex: 1,
  },
  premiumActive: {
    fontFamily: typography.fontBody,
    fontSize: typography.sizes.md,
    color: colors.matchGold,
    fontWeight: '600',
  },
  premiumSubtitle: {
    fontFamily: typography.fontBody,
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  premiumButton: {
    marginTop: spacing.xs,
  },
  legalButton: {
    alignSelf: 'flex-start',
    paddingHorizontal: 0,
  },
  dangerCard: {
    borderWidth: 1,
    borderColor: colors.error,
  },
  dangerTitle: {
    color: colors.error,
  },
  deleteButton: {
    borderColor: colors.error,
  },
  signOutButton: {
    alignSelf: 'center',
    marginTop: spacing.sm,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: colors.overlay,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  confirmModal: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    width: '100%',
    gap: spacing.md,
  },
  confirmTitle: {
    fontFamily: typography.fontBody,
    fontSize: typography.sizes.xl,
    fontWeight: '700',
    color: colors.error,
  },
  confirmBody: {
    fontFamily: typography.fontBody,
    fontSize: typography.sizes.md,
    color: colors.textSecondary,
    lineHeight: 22,
  },
  confirmHint: {
    fontFamily: typography.fontBody,
    fontSize: typography.sizes.sm,
    color: colors.textMuted,
  },
  confirmUsername: {
    color: colors.primary,
    fontWeight: '700',
  },
  confirmInput: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontFamily: typography.fontMono,
    fontSize: typography.sizes.md,
    color: colors.textPrimary,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
  },
  confirmActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  confirmButton: {
    flex: 1,
  },
  deleteConfirmButton: {
    backgroundColor: colors.error,
  },
});
