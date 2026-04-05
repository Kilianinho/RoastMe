import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { colors, typography, spacing, borderRadius } from '@/constants/theme';
import { Button } from '@/components/ui/Button';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import type { ReportReason } from '@/types/database';

const REPORT_REASONS: ReportReason[] = [
  'spam',
  'harassment',
  'inappropriate',
  'fake_profile',
  'other',
];

interface ReportModalProps {
  visible: boolean;
  onClose: () => void;
  reportedUserId?: string;
  reportedMessageId?: string;
}

/**
 * Modal for reporting a user or a specific message.
 * Inserts a row into the reports table via Supabase.
 *
 * @param visible - Controls modal visibility
 * @param onClose - Callback when the modal is dismissed
 * @param reportedUserId - ID of the user being reported (optional)
 * @param reportedMessageId - ID of the message being reported (optional)
 */
export function ReportModal({
  visible,
  onClose,
  reportedUserId,
  reportedMessageId,
}: ReportModalProps): React.ReactElement {
  const { t } = useTranslation();
  const userId = useAuthStore((s) => s.user?.id);

  const [selectedReason, setSelectedReason] = useState<ReportReason | null>(null);
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const reasonKey: Record<ReportReason, string> = {
    spam: t('moderation.reportReasons.spam'),
    harassment: t('moderation.reportReasons.harassment'),
    inappropriate: t('moderation.reportReasons.inappropriate'),
    fake_profile: t('moderation.reportReasons.fakeProfile'),
    other: t('moderation.reportReasons.other'),
  };

  const handleSubmit = async (): Promise<void> => {
    if (!selectedReason || !userId) return;

    setIsSubmitting(true);
    try {
      const { error } = await supabase.from('reports').insert({
        reporter_id: userId,
        reported_user_id: reportedUserId ?? null,
        reported_message_id: reportedMessageId ?? null,
        reason: selectedReason,
        description: description.trim() || null,
      });

      if (error) throw error;

      Alert.alert('', t('moderation.reportSent'));
      handleClose();
    } catch {
      Alert.alert(t('common.error'), t('errors.unknown'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = (): void => {
    setSelectedReason(null);
    setDescription('');
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={handleClose}
      accessibilityViewIsModal
    >
      <Pressable style={styles.backdrop} onPress={handleClose} accessibilityLabel={t('common.close')}>
        <Pressable style={styles.sheet} onPress={() => undefined}>
          <View style={styles.handle} />

          <Text style={styles.title}>{t('moderation.report')}</Text>

          <ScrollView style={styles.reasonsList} showsVerticalScrollIndicator={false}>
            {REPORT_REASONS.map((reason) => (
              <Pressable
                key={reason}
                style={[styles.reasonRow, selectedReason === reason && styles.reasonRowSelected]}
                onPress={() => setSelectedReason(reason)}
                accessibilityRole="radio"
                accessibilityState={{ checked: selectedReason === reason }}
                accessibilityLabel={reasonKey[reason]}
              >
                <View style={[styles.radio, selectedReason === reason && styles.radioSelected]}>
                  {selectedReason === reason && <View style={styles.radioDot} />}
                </View>
                <Text style={[styles.reasonLabel, selectedReason === reason && styles.reasonLabelSelected]}>
                  {reasonKey[reason]}
                </Text>
              </Pressable>
            ))}
          </ScrollView>

          <TextInput
            style={styles.descriptionInput}
            placeholder={t('moderation.reportDescription')}
            placeholderTextColor={colors.textMuted}
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={3}
            maxLength={500}
            accessibilityLabel={t('moderation.reportDescription')}
            textAlignVertical="top"
          />

          <View style={styles.actions}>
            <Button
              label={t('common.cancel')}
              variant="ghost"
              size="md"
              onPress={handleClose}
              accessibilityLabel={t('common.cancel')}
              style={styles.cancelButton}
            />
            <Button
              label={t('moderation.report')}
              variant="primary"
              size="md"
              onPress={handleSubmit}
              isLoading={isSubmitting}
              disabled={!selectedReason}
              accessibilityLabel={`Soumettre le signalement: ${selectedReason ? reasonKey[selectedReason] : ''}`}
              style={styles.submitButton}
            />
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
    gap: spacing.md,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: borderRadius.full,
    backgroundColor: colors.surfaceBorder,
    alignSelf: 'center',
    marginBottom: spacing.xs,
  },
  title: {
    fontFamily: typography.fontBody,
    fontSize: typography.sizes.xl,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  reasonsList: {
    maxHeight: 260,
  },
  reasonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.sm,
  },
  reasonRowSelected: {
    backgroundColor: colors.primaryOverlay,
  },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: colors.textMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioSelected: {
    borderColor: colors.primary,
  },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.primary,
  },
  reasonLabel: {
    fontFamily: typography.fontBody,
    fontSize: typography.sizes.md,
    color: colors.textSecondary,
  },
  reasonLabelSelected: {
    color: colors.textPrimary,
    fontWeight: '600',
  },
  descriptionInput: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    fontFamily: typography.fontBody,
    fontSize: typography.sizes.sm,
    color: colors.textPrimary,
    minHeight: 80,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  cancelButton: {
    flex: 1,
  },
  submitButton: {
    flex: 2,
  },
});
