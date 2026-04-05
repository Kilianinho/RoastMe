// NOTE: Before running this screen, install the image picker package:
//   npx expo install expo-image-picker

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  Modal,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import * as ImagePicker from 'expo-image-picker';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as Notifications from 'expo-notifications';
import i18n from '@/lib/i18n';
import { colors, typography, spacing, borderRadius } from '@/constants/theme';
import { useAuthStore } from '@/stores/authStore';
import { supabase } from '@/lib/supabase';
import type { Gender } from '@/types/database';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';

// ─── Constants ───────────────────────────────────────────────────────────────

const LEGAL_URLS = {
  tos: 'https://roast.me/legal/terms',
  privacy: 'https://roast.me/legal/privacy',
} as const;

const SUPABASE_URL = 'https://hxnndjxqyyfxzxxagpoj.supabase.co';

/** Max characters enforced on the client; mirror these in DB CHECK constraints. */
const DISPLAY_NAME_MAX = 50;
const BIO_MAX = 200;

// ─── Types ───────────────────────────────────────────────────────────────────

interface EditProfileForm {
  displayName: string;
  bio: string;
  gender: Gender | null;
  lookingFor: Gender[];
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Builds the public CDN URL for a file in Supabase Storage.
 * The URL format is stable for public buckets; no signed URL needed.
 */
function buildAvatarPublicUrl(userId: string): string {
  return `${SUPABASE_URL}/storage/v1/object/public/avatars/${userId}/avatar.jpg`;
}

/**
 * Reads a local file URI as a Uint8Array so we can upload it via the
 * Supabase JS client, which expects ArrayBuffer/Blob on React Native.
 */
async function readImageAsArrayBuffer(uri: string): Promise<ArrayBuffer> {
  const response = await fetch(uri);
  return response.arrayBuffer();
}

/**
 * Validates the edit-profile form fields.
 * Returns the first error key (for i18n) or null if valid.
 */
function validateEditForm(form: EditProfileForm): string | null {
  if (!form.displayName.trim()) return 'errors.displayNameRequired';
  if (form.displayName.trim().length > DISPLAY_NAME_MAX) return 'errors.displayNameTooLong';
  if ((form.bio ?? '').length > BIO_MAX) return 'errors.bioTooLong';
  return null;
}

// ─── Component ───────────────────────────────────────────────────────────────

/**
 * Profile tab screen.
 *
 * Features:
 * - Tappable avatar with camera overlay → opens image picker → uploads to Supabase Storage
 * - Edit profile modal (display_name, bio, gender, looking_for)
 * - Stats card (roasts, matches, avg compatibility)
 * - Settings (notifications, matching, language)
 * - Premium CTA
 * - Legal links
 * - Danger zone (download data, delete account)
 */
export default function ProfileScreen(): React.ReactElement {
  const { t } = useTranslation();
  const profile = useAuthStore((s) => s.profile);
  const setProfile = useAuthStore((s) => s.setProfile);
  const signOut = useAuthStore((s) => s.signOut);

  // ── Settings state ────────────────────────────────────────────────────────
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [matchingEnabled, setMatchingEnabled] = useState(profile?.allow_matching ?? true);

  // ── Stats state ───────────────────────────────────────────────────────────
  const [matchesCount, setMatchesCount] = useState<number | null>(null);
  const [avgCompatibility, setAvgCompatibility] = useState<number | null>(null);

  // ── Avatar upload state ───────────────────────────────────────────────────
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);

  // ── Edit profile modal state ──────────────────────────────────────────────
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editForm, setEditForm] = useState<EditProfileForm>({
    displayName: profile?.display_name ?? '',
    bio: profile?.bio ?? '',
    gender: profile?.gender ?? null,
    lookingFor: profile?.looking_for ?? [],
  });
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  // ── Delete account modal state ────────────────────────────────────────────
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const [isDownloadingData, setIsDownloadingData] = useState(false);
  const [deleteConfirmVisible, setDeleteConfirmVisible] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');

  // Keep a ref to the latest profile so async callbacks always read fresh data
  // without adding `profile` as a dep in useCallback (avoids stale closures).
  const profileRef = useRef(profile);
  useEffect(() => {
    profileRef.current = profile;
  }, [profile]);

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

  // ── Avatar upload ─────────────────────────────────────────────────────────

  const handleAvatarPress = useCallback(async (): Promise<void> => {
    const current = profileRef.current;
    if (!current) return;

    // Request media library permission
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        t('common.error'),
        t('errors.cameraPermissionDenied'),
        [
          { text: t('common.cancel'), style: 'cancel' },
          { text: t('profile.openSettings'), onPress: () => void Linking.openSettings() },
        ]
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (result.canceled || result.assets.length === 0) return;

    const asset = result.assets[0];

    setIsUploadingAvatar(true);
    try {
      const arrayBuffer = await readImageAsArrayBuffer(asset.uri);

      const storagePath = `${current.id}/avatar.jpg`;

      // upsert: overwrite if the file already exists
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(storagePath, arrayBuffer, {
          contentType: 'image/jpeg',
          upsert: true,
        });

      if (uploadError) throw uploadError;

      // Cache-bust by appending a timestamp query param so the Image component
      // doesn't serve the old image from its in-memory cache.
      const publicUrl = `${buildAvatarPublicUrl(current.id)}?t=${Date.now()}`;

      const { error: dbError } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('id', current.id);

      if (dbError) throw dbError;

      // Optimistically update the Zustand store so the UI reflects immediately
      setProfile({ ...current, avatar_url: publicUrl });
    } catch (err) {
      Alert.alert(
        t('common.error'),
        err instanceof Error ? err.message : t('errors.avatarUploadFailed')
      );
    } finally {
      setIsUploadingAvatar(false);
    }
  }, [t, setProfile]);

  // ── Edit profile modal ────────────────────────────────────────────────────

  const openEditModal = useCallback((): void => {
    const current = profileRef.current;
    // Re-seed form with latest profile values each time the modal opens
    setEditForm({
      displayName: current?.display_name ?? '',
      bio: current?.bio ?? '',
      gender: current?.gender ?? null,
      lookingFor: current?.looking_for ?? [],
    });
    setEditModalVisible(true);
  }, []);

  const handleSaveProfile = useCallback(async (): Promise<void> => {
    const current = profileRef.current;
    if (!current) return;

    const errorKey = validateEditForm(editForm);
    if (errorKey) {
      Alert.alert(t('common.error'), t(errorKey));
      return;
    }

    setIsSavingProfile(true);
    try {
      const updates = {
        display_name: editForm.displayName.trim(),
        bio: editForm.bio.trim() || null,
        gender: editForm.gender,
        looking_for: editForm.lookingFor,
      };

      const { error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', current.id);

      if (error) throw error;

      setProfile({ ...current, ...updates });
      setEditModalVisible(false);
    } catch (err) {
      Alert.alert(
        t('common.error'),
        err instanceof Error ? err.message : t('errors.profileUpdateFailed')
      );
    } finally {
      setIsSavingProfile(false);
    }
  }, [editForm, t, setProfile]);

  const toggleLookingFor = useCallback((value: Gender): void => {
    setEditForm((prev) => ({
      ...prev,
      lookingFor: prev.lookingFor.includes(value)
        ? prev.lookingFor.filter((g) => g !== value)
        : [...prev.lookingFor, value],
    }));
  }, []);

  // ── Settings handlers ─────────────────────────────────────────────────────

  const handleMatchingToggle = async (value: boolean): Promise<void> => {
    setMatchingEnabled(value);
    const current = profileRef.current;
    if (!current) return;

    const { error } = await supabase
      .from('profiles')
      .update({ allow_matching: value })
      .eq('id', current.id);

    if (error) {
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
      const { status } = await Notifications.requestPermissionsAsync();
      const granted = status === 'granted';
      setNotificationsEnabled(granted);

      if (!granted) {
        Alert.alert(
          t('profile.notifications'),
          t('errors.notificationsPermissionDenied'),
          [
            { text: t('common.cancel'), style: 'cancel' },
            { text: t('profile.openSettings'), onPress: () => void Linking.openSettings() },
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
      Notifications.setNotificationHandler(null);
      setNotificationsEnabled(false);

      Alert.alert(
        t('profile.notifications'),
        t('errors.notificationsCannotRevoke'),
        [
          { text: t('common.ok') },
          { text: t('profile.openSettings'), onPress: () => void Linking.openSettings() },
        ]
      );
    }
  };

  // ── Data download ─────────────────────────────────────────────────────────

  const handleDownloadData = async (): Promise<void> => {
    const current = profileRef.current;
    if (!current) return;

    setIsDownloadingData(true);
    try {
      const [profileRes, resultsRes, matchesRes, messagesRes] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', current.id).single(),
        supabase.from('roast_results').select('*, question:questions(*)').eq('profile_id', current.id),
        supabase.from('matches').select('*').or(`user_a_id.eq.${current.id},user_b_id.eq.${current.id}`),
        supabase.from('messages').select('*').eq('sender_id', current.id),
      ]);

      const firstError =
        profileRes.error ?? resultsRes.error ?? matchesRes.error ?? messagesRes.error;
      if (firstError) throw new Error(firstError.message);

      const exportPayload = {
        exported_at: new Date().toISOString(),
        profile: profileRes.data,
        roast_results: resultsRes.data ?? [],
        matches: matchesRes.data ?? [],
        messages: messagesRes.data ?? [],
      };

      const json = JSON.stringify(exportPayload, null, 2);
      const filename = `roastme-data-${current.username}-${Date.now()}.json`;
      const file = new File(Paths.cache, filename);
      file.create();
      file.write(json);

      const canShare = await Sharing.isAvailableAsync();
      if (!canShare) {
        Alert.alert(t('profile.downloadData'), t('errors.sharingNotAvailable'));
        return;
      }

      await Sharing.shareAsync(file.uri, {
        mimeType: 'application/json',
        dialogTitle: t('profile.downloadData'),
        UTI: 'public.json',
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

  // ── Delete account ────────────────────────────────────────────────────────

  const handleDeleteAccount = async (): Promise<void> => {
    const current = profileRef.current;
    if (!current || deleteConfirmText !== current.username) return;

    setIsDeletingAccount(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', current.id);

      if (error) throw error;

      await supabase.functions.invoke('delete-auth-user', {
        body: { user_id: current.id },
      }).catch(() => {
        // Non-blocking — the profile is already soft-deleted;
        // admin can clean up auth.users in a batch sweep if this fails.
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
        { text: t('auth.logout'), style: 'destructive', onPress: () => void signOut() },
      ]
    );
  };

  const currentLang = i18n.language === 'fr' ? 'Français' : 'English';

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ── User Info Header ───────────────────────────────────── */}
        <View style={styles.profileHeader}>
          {/* Tappable avatar with camera overlay */}
          <Pressable
            onPress={() => void handleAvatarPress()}
            disabled={isUploadingAvatar}
            accessibilityLabel={t('profile.changeAvatar')}
            accessibilityRole="button"
            style={styles.avatarWrapper}
          >
            <Avatar
              uri={profile?.avatar_url}
              name={profile?.display_name}
              size="xl"
              isPremium={profile?.is_premium}
            />
            {/* Camera badge overlay */}
            <View style={styles.cameraOverlay} pointerEvents="none">
              {isUploadingAvatar ? (
                <ActivityIndicator size="small" color={colors.textPrimary} />
              ) : (
                <Text style={styles.cameraIcon}>📷</Text>
              )}
            </View>
          </Pressable>

          <Text style={styles.displayName}>{profile?.display_name ?? '—'}</Text>
          <Text style={styles.username}>@{profile?.username ?? '—'}</Text>
          {profile?.bio ? (
            <Text style={styles.bio} numberOfLines={3}>{profile.bio}</Text>
          ) : null}

          {/* Edit profile button */}
          <Button
            label={t('profile.editProfile')}
            variant="secondary"
            size="sm"
            onPress={openEditModal}
            accessibilityLabel={t('profile.editProfile')}
            style={styles.editProfileButton}
          />
        </View>

        {/* ── Stats ──────────────────────────────────────────────── */}
        <Card style={styles.statsCard}>
          <Text style={styles.sectionTitle}>{t('profile.stats')}</Text>
          <View style={styles.statsRow}>
            <StatItem value={profile?.roast_count ?? 0} label={t('profile.roastsReceived')} />
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

      {/* ── Edit Profile Modal ─────────────────────────────────── */}
      <Modal
        visible={editModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setEditModalVisible(false)}
        accessibilityViewIsModal
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.editModal}>
            <Text style={styles.editModalTitle}>{t('profile.editProfileTitle')}</Text>

            {/* Display name */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>{t('profile.displayName')}</Text>
              <TextInput
                style={styles.fieldInput}
                value={editForm.displayName}
                onChangeText={(text) =>
                  setEditForm((prev) => ({ ...prev, displayName: text }))
                }
                placeholder={profile?.display_name ?? ''}
                placeholderTextColor={colors.textMuted}
                maxLength={DISPLAY_NAME_MAX}
                autoCapitalize="words"
                accessibilityLabel={t('profile.displayName')}
              />
            </View>

            {/* Bio */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>{t('profile.bio')}</Text>
              <TextInput
                style={[styles.fieldInput, styles.bioInput]}
                value={editForm.bio}
                onChangeText={(text) =>
                  setEditForm((prev) => ({ ...prev, bio: text }))
                }
                placeholder={t('profile.bioPlaceholder')}
                placeholderTextColor={colors.textMuted}
                maxLength={BIO_MAX}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
                accessibilityLabel={t('profile.bio')}
              />
              <Text style={styles.charCount}>
                {editForm.bio.length}/{BIO_MAX}
              </Text>
            </View>

            {/* Gender */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>{t('profile.gender')}</Text>
              <View style={styles.chipRow}>
                {GENDER_OPTIONS.map(({ value, labelKey }) => (
                  <GenderChip
                    key={value}
                    label={t(labelKey)}
                    selected={editForm.gender === value}
                    onPress={() =>
                      setEditForm((prev) => ({
                        ...prev,
                        gender: prev.gender === value ? null : value,
                      }))
                    }
                  />
                ))}
              </View>
            </View>

            {/* Looking for */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>{t('profile.lookingFor')}</Text>
              <View style={styles.chipRow}>
                {LOOKING_FOR_OPTIONS.map(({ value, labelKey }) => (
                  <GenderChip
                    key={value}
                    label={t(labelKey)}
                    selected={editForm.lookingFor.includes(value)}
                    onPress={() => toggleLookingFor(value)}
                  />
                ))}
              </View>
            </View>

            {/* Actions */}
            <View style={styles.editActions}>
              <Button
                label={t('profile.discardChanges')}
                variant="secondary"
                size="md"
                onPress={() => setEditModalVisible(false)}
                disabled={isSavingProfile}
                accessibilityLabel={t('profile.discardChanges')}
                style={styles.editActionButton}
              />
              <Button
                label={t('profile.saveChanges')}
                variant="primary"
                size="md"
                onPress={() => void handleSaveProfile()}
                isLoading={isSavingProfile}
                accessibilityLabel={t('profile.saveChanges')}
                style={styles.editActionButton}
              />
            </View>
          </View>
        </View>
      </Modal>

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
              {t('profile.deleteConfirm')}{' '}
              <Text style={styles.confirmUsername}>@{profile?.username}</Text>
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

// ─── Gender / looking-for option definitions ──────────────────────────────────

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

const LOOKING_FOR_OPTIONS: GenderOption[] = [
  { value: 'male', labelKey: 'signup.genderMale' },
  { value: 'female', labelKey: 'signup.genderFemale' },
  { value: 'other', labelKey: 'signup.genderOther' },
];

// ─── Sub-components ───────────────────────────────────────────────────────────

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

interface GenderChipProps {
  label: string;
  selected: boolean;
  onPress: () => void;
}

function GenderChip({ label, selected, onPress }: GenderChipProps): React.ReactElement {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: selected }}
      accessibilityLabel={label}
      style={[styles.chip, selected && styles.chipSelected]}
    >
      <Text style={[styles.chipLabel, selected && styles.chipLabelSelected]}>{label}</Text>
    </Pressable>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

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

  // ── Profile header ──────────────────────────────────────────────────────
  profileHeader: {
    alignItems: 'center',
    paddingVertical: spacing.lg,
    gap: spacing.sm,
  },
  avatarWrapper: {
    position: 'relative',
    marginBottom: spacing.xs,
  },
  cameraOverlay: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.background,
  },
  cameraIcon: {
    fontSize: 13,
    // emoji — no fontFamily override needed
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
  editProfileButton: {
    marginTop: spacing.xs,
  },

  // ── Stats ────────────────────────────────────────────────────────────────
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

  // ── Section card ─────────────────────────────────────────────────────────
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

  // ── Premium ──────────────────────────────────────────────────────────────
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

  // ── Legal ────────────────────────────────────────────────────────────────
  legalButton: {
    alignSelf: 'flex-start',
    paddingHorizontal: 0,
  },

  // ── Danger zone ──────────────────────────────────────────────────────────
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

  // ── Shared modal backdrop ─────────────────────────────────────────────────
  modalBackdrop: {
    flex: 1,
    backgroundColor: colors.overlay,
    alignItems: 'center',
    justifyContent: 'flex-end', // slide up from bottom for edit modal
    padding: spacing.md,
    paddingBottom: spacing.xl,
  },

  // ── Edit profile modal ───────────────────────────────────────────────────
  editModal: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    width: '100%',
    gap: spacing.md,
  },
  editModalTitle: {
    fontFamily: typography.fontDisplay,
    fontSize: typography.sizes.xl,
    color: colors.textPrimary,
    letterSpacing: 1,
  },
  fieldGroup: {
    gap: spacing.xs,
  },
  fieldLabel: {
    fontFamily: typography.fontBody,
    fontSize: typography.sizes.sm,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  fieldInput: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontFamily: typography.fontBody,
    fontSize: typography.sizes.md,
    color: colors.textPrimary,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
  },
  bioInput: {
    minHeight: 80,
    paddingTop: spacing.sm,
  },
  charCount: {
    fontFamily: typography.fontBody,
    fontSize: typography.sizes.xs,
    color: colors.textMuted,
    alignSelf: 'flex-end',
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    borderWidth: 1.5,
    borderColor: colors.surfaceBorder,
  },
  chipSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryOverlay,
  },
  chipLabel: {
    fontFamily: typography.fontBody,
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
  },
  chipLabelSelected: {
    color: colors.primary,
    fontWeight: '600',
  },
  editActions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  editActionButton: {
    flex: 1,
  },

  // ── Delete confirm modal ─────────────────────────────────────────────────
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
