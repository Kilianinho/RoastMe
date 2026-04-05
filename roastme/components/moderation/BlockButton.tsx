import React, { useState } from 'react';
import { Alert, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/Button';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import { colors } from '@/constants/theme';

interface BlockButtonProps {
  targetUserId: string;
  targetName: string;
  onBlocked?: () => void;
}

/**
 * Button that confirms and then inserts a block record.
 * Requires a confirmation alert before taking action.
 *
 * @param targetUserId - The ID of the user to block
 * @param targetName - Display name shown in the confirmation dialog
 * @param onBlocked - Callback fired after a successful block
 */
export function BlockButton({
  targetUserId,
  targetName,
  onBlocked,
}: BlockButtonProps): React.ReactElement {
  const { t } = useTranslation();
  const userId = useAuthStore((s) => s.user?.id);
  const [isLoading, setIsLoading] = useState(false);

  const handlePress = (): void => {
    Alert.alert(
      t('moderation.block'),
      t('moderation.blockConfirm', { name: targetName }),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('moderation.block'),
          style: 'destructive',
          onPress: () => void executeBlock(),
        },
      ],
    );
  };

  const executeBlock = async (): Promise<void> => {
    if (!userId) return;

    setIsLoading(true);
    try {
      const { error } = await supabase.from('blocks').insert({
        blocker_id: userId,
        blocked_id: targetUserId,
      });

      if (error && error.code !== '23505') {
        // 23505 = unique violation — already blocked, treat as success
        throw error;
      }

      Alert.alert('', t('moderation.blocked'));
      onBlocked?.();
    } catch {
      Alert.alert(t('common.error'), t('errors.unknown'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button
      label={t('moderation.block')}
      variant="secondary"
      size="md"
      onPress={handlePress}
      isLoading={isLoading}
      accessibilityLabel={t('moderation.blockUser', { name: targetName })}
      style={styles.button}
    />
  );
}

const styles = StyleSheet.create({
  button: {
    borderColor: colors.error,
  },
});
