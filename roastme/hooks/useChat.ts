import { useCallback, useEffect, useRef, useState } from 'react';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import type { Match, Message } from '@/types/database';

export interface ConversationListItem extends Match {
  lastMessage?: Message;
  unreadCount: number;
}

interface UseChatReturn {
  conversations: ConversationListItem[];
  conversationsLoading: boolean;
  conversationsError: string | null;
  fetchConversations: () => Promise<void>;

  messages: Message[];
  messagesLoading: boolean;
  messagesError: string | null;
  fetchMessages: (matchId: string) => Promise<void>;

  sendMessage: (matchId: string, content: string) => Promise<void>;
  subscribeToMessages: (matchId: string) => () => void;
  markAsRead: (matchId: string) => Promise<void>;

  unreadTotal: number;
}

/**
 * Comprehensive chat hook covering conversation list, message fetching,
 * sending, Realtime subscription, and unread tracking.
 *
 * subscribeToMessages returns an unsubscribe function — call it in useEffect cleanup.
 */
export function useChat(): UseChatReturn {
  const userId = useAuthStore((s) => s.user?.id);

  const [conversations, setConversations] = useState<ConversationListItem[]>([]);
  const [conversationsLoading, setConversationsLoading] = useState(false);
  const [conversationsError, setConversationsError] = useState<string | null>(null);

  const [messages, setMessages] = useState<Message[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [messagesError, setMessagesError] = useState<string | null>(null);

  const channelRef = useRef<RealtimeChannel | null>(null);

  const fetchConversations = useCallback(async (): Promise<void> => {
    if (!userId) return;

    setConversationsLoading(true);
    setConversationsError(null);

    try {
      // Fetch matches with status 'matched' on both sides
      const [resA, resB] = await Promise.all([
        supabase
          .from('matches')
          .select('*, other_user:profiles!matches_user_b_id_fkey(*)')
          .eq('user_a_id', userId)
          .eq('status', 'matched')
          .order('created_at', { ascending: false }),
        supabase
          .from('matches')
          .select('*, other_user:profiles!matches_user_a_id_fkey(*)')
          .eq('user_b_id', userId)
          .eq('status', 'matched')
          .order('created_at', { ascending: false }),
      ]);

      if (resA.error) throw resA.error;
      if (resB.error) throw resB.error;

      const matchedConvos = [...(resA.data ?? []), ...(resB.data ?? [])] as Match[];

      // Fetch last message + unread count for each conversation
      const enriched: ConversationListItem[] = await Promise.all(
        matchedConvos.map(async (match) => {
          const [lastMsgRes, unreadRes] = await Promise.all([
            supabase
              .from('messages')
              .select('*')
              .eq('match_id', match.id)
              .order('created_at', { ascending: false })
              .limit(1)
              .maybeSingle(),
            supabase
              .from('messages')
              .select('id', { count: 'exact', head: true })
              .eq('match_id', match.id)
              .eq('is_read', false)
              .neq('sender_id', userId),
          ]);

          return {
            ...match,
            lastMessage: lastMsgRes.data ?? undefined,
            unreadCount: unreadRes.count ?? 0,
          };
        })
      );

      // Sort by last message time, most recent first
      enriched.sort((a, b) => {
        const aTime = a.lastMessage?.created_at ?? a.created_at;
        const bTime = b.lastMessage?.created_at ?? b.created_at;
        return bTime.localeCompare(aTime);
      });

      setConversations(enriched);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error fetching conversations';
      setConversationsError(message);
    } finally {
      setConversationsLoading(false);
    }
  }, [userId]);

  const fetchMessages = useCallback(async (matchId: string): Promise<void> => {
    setMessagesLoading(true);
    setMessagesError(null);

    try {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('match_id', matchId)
        .order('created_at', { ascending: true });

      if (error) throw error;

      setMessages((data ?? []) as Message[]);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error fetching messages';
      setMessagesError(message);
    } finally {
      setMessagesLoading(false);
    }
  }, []);

  const sendMessage = useCallback(async (matchId: string, content: string): Promise<void> => {
    if (!userId) return;
    const trimmed = content.trim();
    if (!trimmed) return;

    const { error } = await supabase.from('messages').insert({
      match_id: matchId,
      sender_id: userId,
      content: trimmed,
    });

    if (error) throw new Error(`Failed to send message: ${error.message}`);
  }, [userId]);

  const subscribeToMessages = useCallback((matchId: string): (() => void) => {
    // Clean up any existing subscription
    if (channelRef.current) {
      void supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }

    const channel = supabase
      .channel(`messages:${matchId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `match_id=eq.${matchId}`,
        },
        (payload) => {
          const newMessage = payload.new as Message;
          setMessages((prev) => {
            // Guard against duplicates
            if (prev.some((m) => m.id === newMessage.id)) return prev;
            return [...prev, newMessage];
          });
        }
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      void supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, []);

  const markAsRead = useCallback(async (matchId: string): Promise<void> => {
    if (!userId) return;

    const { error } = await supabase
      .from('messages')
      .update({ is_read: true })
      .eq('match_id', matchId)
      .eq('is_read', false)
      .neq('sender_id', userId);

    if (error) {
      // Non-fatal — don't throw; unread state will self-correct on next fetch
    }

    // Update local unread count
    setConversations((prev) =>
      prev.map((c) => (c.id === matchId ? { ...c, unreadCount: 0 } : c))
    );
  }, [userId]);

  // Load conversations on mount
  useEffect(() => {
    void fetchConversations();
  }, [fetchConversations]);

  // Clean up realtime channel on unmount
  useEffect(() => {
    return () => {
      if (channelRef.current) {
        void supabase.removeChannel(channelRef.current);
      }
    };
  }, []);

  const unreadTotal = conversations.reduce((sum, c) => sum + c.unreadCount, 0);

  return {
    conversations,
    conversationsLoading,
    conversationsError,
    fetchConversations,

    messages,
    messagesLoading,
    messagesError,
    fetchMessages,

    sendMessage,
    subscribeToMessages,
    markAsRead,

    unreadTotal,
  };
}
