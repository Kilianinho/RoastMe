import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { colors, typography, spacing, borderRadius } from '@/constants/theme';
import { formatTimeAgo } from '@/utils/formatters';
import { useChat } from '@/hooks/useChat';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import type { ConversationListItem } from '@/hooks/useChat';

/**
 * Chat tab — list of active conversations (matched users).
 * Each row shows avatar, name, last message preview, timestamp, and unread badge.
 */
export default function ChatListScreen(): React.ReactElement {
  const { t } = useTranslation();
  const router = useRouter();
  const { conversations, conversationsLoading, conversationsError, fetchConversations } = useChat();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const onRefresh = useCallback(async (): Promise<void> => {
    setIsRefreshing(true);
    await fetchConversations();
    setIsRefreshing(false);
  }, [fetchConversations]);

  const renderItem = useCallback(
    ({ item }: { item: ConversationListItem }) => (
      <ConversationRow
        conversation={item}
        onPress={() => router.push(`/(tabs)/chat/${item.id}`)}
      />
    ),
    [router]
  );

  if (conversationsLoading && !isRefreshing) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <PageHeader title={t('chat.title')} />
        <ActivityIndicator color={colors.primary} style={styles.loader} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <PageHeader title={t('chat.title')} />

      {conversationsError && (
        <Text style={styles.errorText}>{t('common.error')}</Text>
      )}

      <FlatList
        data={conversations}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        ListEmptyComponent={<EmptyState t={t} />}
        contentContainerStyle={conversations.length === 0 ? styles.emptyContainer : styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={() => void onRefresh()}
            tintColor={colors.primary}
          />
        }
      />
    </SafeAreaView>
  );
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function PageHeader({ title }: { title: string }): React.ReactElement {
  return (
    <View style={styles.header}>
      <Text style={styles.pageTitle}>{title}</Text>
    </View>
  );
}

interface ConversationRowProps {
  conversation: ConversationListItem;
  onPress: () => void;
}

function ConversationRow({ conversation, onPress }: ConversationRowProps): React.ReactElement {
  const { t } = useTranslation();
  const otherUser = conversation.other_user;
  const lastMsg = conversation.lastMessage;
  const unread = conversation.unreadCount;

  return (
    <Pressable
      style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
      onPress={onPress}
      accessibilityLabel={t('chat.conversationWith', { name: otherUser?.display_name ?? '—' })}
      accessibilityRole="button"
    >
      <Avatar
        uri={otherUser?.avatar_url}
        name={otherUser?.display_name}
        size="md"
        isPremium={otherUser?.is_premium}
      />

      <View style={styles.rowContent}>
        <View style={styles.rowTop}>
          <Text style={[styles.displayName, unread > 0 && styles.displayNameUnread]} numberOfLines={1}>
            {otherUser?.display_name ?? '—'}
          </Text>
          {lastMsg && (
            <Text style={styles.timestamp}>{formatTimeAgo(lastMsg.created_at)}</Text>
          )}
        </View>

        <View style={styles.rowBottom}>
          <Text
            style={[styles.lastMessage, unread > 0 && styles.lastMessageUnread]}
            numberOfLines={1}
          >
            {lastMsg?.content ?? '—'}
          </Text>
          {unread > 0 && <Badge count={unread} color="primary" />}
        </View>
      </View>
    </Pressable>
  );
}

function EmptyState({ t }: { t: (key: string) => string }): React.ReactElement {
  return (
    <View style={styles.emptyState} accessibilityLabel={t('chat.noChats')}>
      <Text style={styles.emptyEmoji}>💬</Text>
      <Text style={styles.emptyTitle}>{t('chat.noChats')}</Text>
      <Text style={styles.emptySubtitle}>{t('chat.noChatsSubtitle')}</Text>
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.surfaceBorder,
  },
  pageTitle: {
    fontFamily: typography.fontDisplay,
    fontSize: typography.sizes.xxl,
    color: colors.textPrimary,
    letterSpacing: 1,
  },
  loader: {
    marginTop: spacing.xxl,
  },
  errorText: {
    fontFamily: typography.fontBody,
    fontSize: typography.sizes.sm,
    color: colors.error,
    textAlign: 'center',
    padding: spacing.md,
  },
  listContent: {
    paddingBottom: spacing.xxl,
  },
  emptyContainer: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    gap: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.surfaceBorder,
  },
  rowPressed: {
    backgroundColor: colors.surfaceElevated,
  },
  rowContent: {
    flex: 1,
    gap: spacing.xs,
  },
  rowTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  displayName: {
    fontFamily: typography.fontBody,
    fontSize: typography.sizes.md,
    color: colors.textPrimary,
    fontWeight: '500',
    flex: 1,
  },
  displayNameUnread: {
    fontWeight: '700',
  },
  timestamp: {
    fontFamily: typography.fontBody,
    fontSize: typography.sizes.xs,
    color: colors.textMuted,
    marginLeft: spacing.sm,
  },
  rowBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  lastMessage: {
    fontFamily: typography.fontBody,
    fontSize: typography.sizes.sm,
    color: colors.textMuted,
    flex: 1,
  },
  lastMessageUnread: {
    color: colors.textSecondary,
    fontWeight: '500',
  },
  emptyState: {
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.xxl,
    paddingHorizontal: spacing.xl,
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
});
