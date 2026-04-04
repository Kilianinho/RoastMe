import { useCallback, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import { config } from '@/constants/config';
import type { Gender, Match, MatchStatus } from '@/types/database';

const DAILY_VIEW_KEY_PREFIX = 'matches_viewed_';

type GenderFilter = 'all' | Gender;

interface UseMatchesReturn {
  matches: Match[];
  dailyViewCount: number;
  isAtDailyLimit: boolean;
  isLoading: boolean;
  error: string | null;
  genderFilter: GenderFilter;
  setGenderFilter: (filter: GenderFilter) => void;
  handleLike: (matchId: string, targetId: string) => Promise<void>;
  handlePass: (matchId: string, targetId: string) => Promise<void>;
  refetch: () => Promise<void>;
}

/**
 * Manages matches for the current user.
 *
 * - Fetches matches with joined other_user profile
 * - Filters by gender preference
 * - Tracks daily view count in AsyncStorage (keyed by date)
 * - Handles like/pass actions and mutual match detection
 *
 * @returns Full match state and action handlers
 */
export function useMatches(): UseMatchesReturn {
  const userId = useAuthStore((s) => s.user?.id);
  const [allMatches, setAllMatches] = useState<Match[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [genderFilter, setGenderFilter] = useState<GenderFilter>('all');
  const [dailyViewCount, setDailyViewCount] = useState(0);

  const todayKey = `${DAILY_VIEW_KEY_PREFIX}${getTodayString()}`;

  const loadDailyCount = useCallback(async (): Promise<void> => {
    try {
      const stored = await AsyncStorage.getItem(todayKey);
      setDailyViewCount(stored ? parseInt(stored, 10) : 0);
    } catch {
      // Non-fatal — default to 0
    }
  }, [todayKey]);

  const incrementDailyCount = useCallback(async (): Promise<void> => {
    try {
      const next = dailyViewCount + 1;
      await AsyncStorage.setItem(todayKey, String(next));
      setDailyViewCount(next);
    } catch {
      // Non-fatal
    }
  }, [dailyViewCount, todayKey]);

  const fetchMatches = useCallback(async (): Promise<void> => {
    if (!userId) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Fetch matches where current user is either user_a or user_b
      const [resA, resB] = await Promise.all([
        supabase
          .from('matches')
          .select('*, other_user:profiles!matches_user_b_id_fkey(*)')
          .eq('user_a_id', userId)
          .in('status', ['pending', 'liked', 'matched'])
          .order('created_at', { ascending: false }),
        supabase
          .from('matches')
          .select('*, other_user:profiles!matches_user_a_id_fkey(*)')
          .eq('user_b_id', userId)
          .in('status', ['pending', 'liked', 'matched'])
          .order('created_at', { ascending: false }),
      ]);

      if (resA.error) throw resA.error;
      if (resB.error) throw resB.error;

      const combined = [...(resA.data ?? []), ...(resB.data ?? [])] as Match[];
      // Sort by compatibility score descending
      combined.sort((a, b) => b.compatibility_score - a.compatibility_score);
      setAllMatches(combined);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error fetching matches';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    void fetchMatches();
    void loadDailyCount();
  }, [fetchMatches, loadDailyCount]);

  const handleLike = useCallback(async (matchId: string, targetId: string): Promise<void> => {
    if (!userId) return;

    try {
      // Insert the like action
      const { error: actionError } = await supabase.from('match_actions').insert({
        actor_id: userId,
        target_id: targetId,
        action: 'like',
      });

      if (actionError && actionError.code !== '23505') throw actionError;

      // Check if target has already liked us back (mutual match)
      const { data: reverseAction } = await supabase
        .from('match_actions')
        .select('id')
        .eq('actor_id', targetId)
        .eq('target_id', userId)
        .eq('action', 'like')
        .maybeSingle();

      const isMutual = reverseAction !== null;
      const newStatus: MatchStatus = isMutual ? 'matched' : 'liked';

      // Update match status
      const { error: updateError } = await supabase
        .from('matches')
        .update({ status: newStatus })
        .eq('id', matchId);

      if (updateError) throw updateError;

      if (isMutual) {
        // Create mutual match notification for the other user
        await supabase.from('notifications').insert({
          user_id: targetId,
          type: 'new_match',
          title: 'C\'est un match !',
          body: 'Vous vous êtes tous les deux likés. Lancez la conversation !',
          data: { match_id: matchId },
        });
      }

      // Optimistic update
      setAllMatches((prev) =>
        prev.map((m) => (m.id === matchId ? { ...m, status: newStatus } : m))
      );
      await incrementDailyCount();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error on like';
      setError(message);
    }
  }, [userId, incrementDailyCount]);

  const handlePass = useCallback(async (matchId: string, targetId: string): Promise<void> => {
    if (!userId) return;

    try {
      const { error: actionError } = await supabase.from('match_actions').insert({
        actor_id: userId,
        target_id: targetId,
        action: 'pass',
      });

      if (actionError && actionError.code !== '23505') throw actionError;

      const { error: updateError } = await supabase
        .from('matches')
        .update({ status: 'passed' })
        .eq('id', matchId);

      if (updateError) throw updateError;

      // Remove from local list
      setAllMatches((prev) => prev.filter((m) => m.id !== matchId));
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error on pass';
      setError(message);
    }
  }, [userId]);

  // Use reactive selector so premium status changes are reflected (C-3 fix)
  const isPremium = useAuthStore((s) => s.profile?.is_premium ?? false);
  const filteredMatches = filterByGender(allMatches, genderFilter);
  const isAtDailyLimit = !isPremium && dailyViewCount >= config.limits.freeMatchesPerDay;

  return {
    matches: filteredMatches,
    dailyViewCount,
    isAtDailyLimit,
    isLoading,
    error,
    genderFilter,
    setGenderFilter,
    handleLike,
    handlePass,
    refetch: fetchMatches,
  };
}

function filterByGender(matches: Match[], filter: GenderFilter): Match[] {
  if (filter === 'all') return matches;
  return matches.filter((m) => m.other_user?.gender === filter);
}

function getTodayString(): string {
  return new Date().toISOString().slice(0, 10); // YYYY-MM-DD
}
