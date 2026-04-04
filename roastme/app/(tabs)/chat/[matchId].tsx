import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { colors, typography, spacing, borderRadius } from '@/constants/theme';
import { useChat } from '@/hooks/useChat';
import { useAuthStore } from '@/stores/authStore';
import { supabase } from '@/lib/supabase';
import { Avatar } from '@/components/ui/Avatar';
import { ReportModal } from '@/components/moderation/ReportModal';
import type { Message } from '@/types/database';

/**
 * Individual conversation screen.
 * Subscribes to Supabase Realtime for live messages.
 * Auto-scrolls to the latest message.
 */
export default function ConversationScreen(): React.ReactElement {
  const { t } = useTranslation();
  const router = useRouter();
  const { matchId } = useLocalSearchParams<{ matchId: string }>();

  const userId = useAuthStore((s) => s.user?.id);
  const { messages, messagesLoading, fetchMessages, sendMessage, subscribeToMessages, markAsRead, conversations } =
    useChat();

  const [inputText, setInputText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);

  const flatListRef = useRef<FlatList<Message>>(null);

  // Derive the other user from the conversation list, with fallback fetch (C-6 fix)
  const conversation = conversations.find((c) => c.id === matchId);
  const [otherUser, setOtherUser] = useState(conversation?.other_user ?? null);

  useEffect(() => {
    if (conversation?.other_user) {
      setOtherUser(conversation.other_user);
      return;
    }
    // Fallback: fetch match data independently (e.g., deep link navigation)
    if (!matchId || !userId) return;
    (async () => {
      const { data } = await supabase
        .from('matches')
        .select('*, user_a:profiles!matches_user_a_id_fkey(*), user_b:profiles!matches_user_b_id_fkey(*)')
        .eq('id', matchId)
        .single();
      if (data) {
        const other = (data as Record<string, unknown>).user_a_id === userId
          ? (data as Record<string, unknown>).user_b
          : (data as Record<string, unknown>).user_a;
        if (other) setOtherUser(other as typeof otherUser);
      }
    })();
  }, [matchId, userId, conversation?.other_user]);

  useEffect(() => {
    if (!matchId) return;
    void fetchMessages(matchId);
    void markAsRead(matchId);

    const unsubscribe = subscribeToMessages(matchId);
    return unsubscribe;
  }, [matchId, fetchMessages, markAsRead, subscribeToMessages]);

  // Auto-scroll handled via onContentSizeChange on FlatList (M-5 fix)

  const handleSend = useCallback(async (): Promise<void> => {
    const trimmed = inputText.trim();
    if (!trimmed || isSending || !matchId) return;

    setIsSending(true);
    setInputText('');
    try {
      await sendMessage(matchId, trimmed);
    } catch {
      Alert.alert(t('common.error'), t('errors.unknown'));
      setInputText(trimmed); // restore on failure
    } finally {
      setIsSending(false);
    }
  }, [inputText, isSending, matchId, sendMessage, t]);

  const handleBlock = async (): Promise<void> => {
    if (!otherUser || !userId) return;
    try {
      const { error } = await supabase.from('blocks').insert({
        blocker_id: userId,
        blocked_id: otherUser.id,
      });
      if (error && error.code !== '23505') throw error;
      Alert.alert('', t('moderation.blocked'));
      router.back();
    } catch {
      Alert.alert(t('common.error'), t('errors.unknown'));
    }
  };

  const handleModerationMenu = (): void => {
    if (!otherUser) return;

    Alert.alert(
      otherUser.display_name,
      '',
      [
        { text: t('moderation.report'), onPress: () => setShowReportModal(true) },
        {
          text: t('moderation.block'),
          style: 'destructive',
          onPress: () => {
            Alert.alert(
              t('moderation.block'),
              t('moderation.blockConfirm', { name: otherUser.display_name }),
              [
                { text: t('common.cancel'), style: 'cancel' },
                { text: t('moderation.block'), style: 'destructive', onPress: () => void handleBlock() },
              ]
            );
          },
        },
        { text: t('common.cancel'), style: 'cancel' },
      ]
    );
  };

  const renderMessage = useCallback(
    ({ item }: { item: Message }) => (
      <MessageBubble message={item} isMine={item.sender_id === userId} />
    ),
    [userId]
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* ── Header ─────────────────────────────────────────────── */}
      <View style={styles.header}>
        <Pressable
          style={styles.backButton}
          onPress={() => router.back()}
          accessibilityLabel={t('common.back')}
          accessibilityRole="button"
        >
          <Text style={styles.backIcon}>←</Text>
        </Pressable>

        <Avatar
          uri={otherUser?.avatar_url}
          name={otherUser?.display_name}
          size="sm"
          isPremium={otherUser?.is_premium}
        />
        <Text style={styles.headerName} numberOfLines={1}>
          {otherUser?.display_name ?? '—'}
        </Text>

        <Pressable
          style={styles.moreButton}
          onPress={handleModerationMenu}
          accessibilityLabel={t('moderation.report')}
          accessibilityRole="button"
        >
          <Text style={styles.moreIcon}>⋯</Text>
        </Pressable>
      </View>

      {/* ── Messages ───────────────────────────────────────────── */}
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={60}
      >
        {messagesLoading && messages.length === 0 ? (
          <View style={styles.loadingContainer}>
            <Text style={styles.loadingText}>{t('common.loading')}</Text>
          </View>
        ) : messages.length === 0 ? (
          <View style={styles.emptyMessages}>
            <Text style={styles.newMatchText}>{t('chat.newMatch')}</Text>
          </View>
        ) : (
          <FlatList
            ref={flatListRef}
            data={messages}
            keyExtractor={(item) => item.id}
            renderItem={renderMessage}
            contentContainerStyle={styles.messageList}
            showsVerticalScrollIndicator={false}
            onLayout={() => flatListRef.current?.scrollToEnd({ animated: false })}
            onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
          />
        )}

        {/* ── Input Bar ──────────────────────────────────────────── */}
        <View style={styles.inputBar}>
          <TextInput
            style={styles.input}
            value={inputText}
            onChangeText={setInputText}
            placeholder={t('chat.placeholder')}
            placeholderTextColor={colors.textMuted}
            multiline
            maxLength={1000}
            accessibilityLabel={t('chat.placeholder')}
            returnKeyType="default"
          />
          <Pressable
            style={[styles.sendButton, (!inputText.trim() || isSending) && styles.sendButtonDisabled]}
            onPress={() => void handleSend()}
            disabled={!inputText.trim() || isSending}
            accessibilityLabel={t('chat.send')}
            accessibilityRole="button"
          >
            <Text style={styles.sendIcon}>↑</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>

      {/* ── Moderation Modals ──────────────────────────────────── */}
      <ReportModal
        visible={showReportModal}
        onClose={() => setShowReportModal(false)}
        reportedUserId={otherUser?.id}
      />

      {/* BlockButton is invoked imperatively via handleModerationMenu Alert chain */}
    </SafeAreaView>
  );
}

// ─── Message Bubble ──────────────────────────────────────────────────────────

interface MessageBubbleProps {
  message: Message;
  isMine: boolean;
}

function MessageBubble({ message, isMine }: MessageBubbleProps): React.ReactElement {
  return (
    <View style={[styles.bubbleWrapper, isMine ? styles.bubbleWrapperMine : styles.bubbleWrapperTheirs]}>
      <View
        style={[styles.bubble, isMine ? styles.bubbleMine : styles.bubbleTheirs]}
        accessibilityLabel={`Message: ${message.content}`}
      >
        <Text style={[styles.bubbleText, isMine ? styles.bubbleTextMine : styles.bubbleTextTheirs]}>
          {message.content}
        </Text>
      </View>
      <Text style={[styles.timestamp, isMine ? styles.timestampMine : styles.timestampTheirs]}>
        {formatTime(message.created_at)}
      </Text>
    </View>
  );
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatTime(isoString: string): string {
  return new Date(isoString).toLocaleTimeString(undefined, {
    hour: '2-digit',
    minute: '2-digit',
  });
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  flex: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.surfaceBorder,
    gap: spacing.sm,
  },
  backButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 22,
  },
  backIcon: {
    fontSize: 20,
    color: colors.textPrimary,
  },
  headerName: {
    fontFamily: typography.fontBody,
    fontSize: typography.sizes.md,
    fontWeight: '600',
    color: colors.textPrimary,
    flex: 1,
  },
  moreButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  moreIcon: {
    fontSize: 22,
    color: colors.textSecondary,
    letterSpacing: 2,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    fontFamily: typography.fontBody,
    fontSize: typography.sizes.sm,
    color: colors.textMuted,
  },
  emptyMessages: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  newMatchText: {
    fontFamily: typography.fontBody,
    fontSize: typography.sizes.md,
    color: colors.textSecondary,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  messageList: {
    padding: spacing.md,
    gap: spacing.sm,
    paddingBottom: spacing.lg,
  },
  bubbleWrapper: {
    maxWidth: '80%',
    gap: 2,
  },
  bubbleWrapperMine: {
    alignSelf: 'flex-end',
    alignItems: 'flex-end',
  },
  bubbleWrapperTheirs: {
    alignSelf: 'flex-start',
    alignItems: 'flex-start',
  },
  bubble: {
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  bubbleMine: {
    backgroundColor: colors.primary,
    borderBottomRightRadius: borderRadius.sm,
  },
  bubbleTheirs: {
    backgroundColor: colors.surfaceElevated,
    borderBottomLeftRadius: borderRadius.sm,
  },
  bubbleText: {
    fontFamily: typography.fontBody,
    fontSize: typography.sizes.md,
    lineHeight: 22,
  },
  bubbleTextMine: {
    color: colors.textPrimary,
  },
  bubbleTextTheirs: {
    color: colors.textPrimary,
  },
  timestamp: {
    fontFamily: typography.fontBody,
    fontSize: typography.sizes.xs,
    color: colors.textMuted,
    marginHorizontal: spacing.xs,
  },
  timestampMine: {
    textAlign: 'right',
  },
  timestampTheirs: {
    textAlign: 'left',
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.surfaceBorder,
    gap: spacing.sm,
    backgroundColor: colors.background,
  },
  input: {
    flex: 1,
    backgroundColor: colors.surfaceElevated,
    borderRadius: borderRadius.xl,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    fontFamily: typography.fontBody,
    fontSize: typography.sizes.md,
    color: colors.textPrimary,
    maxHeight: 120,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: colors.surfaceBorder,
  },
  sendIcon: {
    fontSize: 20,
    color: colors.textPrimary,
    fontWeight: '700',
  },
});
