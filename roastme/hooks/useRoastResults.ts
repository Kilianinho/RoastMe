import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import type { RoastResult, Question } from '@/types/database';

interface RoastResultWithQuestion extends RoastResult {
  question: Question;
}

interface UseRoastResultsReturn {
  results: RoastResultWithQuestion[];
  fireScore: number;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

/**
 * Fetches all aggregated roast results for the current user,
 * joined with their question data. Computes a fire score (0-100)
 * as the mean of all top_answer_percentages.
 *
 * @returns results, fireScore, isLoading, error, refetch
 */
export function useRoastResults(): UseRoastResultsReturn {
  const userId = useAuthStore((s) => s.user?.id);
  const [results, setResults] = useState<RoastResultWithQuestion[]>([]);
  const [fireScore, setFireScore] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchResults = useCallback(async (): Promise<void> => {
    if (!userId) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await supabase
        .from('roast_results')
        .select(`
          *,
          question:questions (*)
        `)
        .eq('profile_id', userId)
        .order('updated_at', { ascending: false });

      if (fetchError) throw fetchError;

      const typed = (data ?? []) as RoastResultWithQuestion[];
      setResults(typed);
      setFireScore(computeFireScore(typed));
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error fetching results';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    void fetchResults();
  }, [fetchResults]);

  return {
    results,
    fireScore,
    isLoading,
    error,
    refetch: fetchResults,
  };
}

/**
 * Computes fire score as the average of all top_answer_percentages,
 * rounded to the nearest integer.
 *
 * Contract: top_answer_percentage is stored as a 0–100 float by the
 * aggregate-roast Edge Function (e.g. 75.0 means 75%). Do not multiply by 100.
 *
 * @throws Never — returns 0 for empty or null data
 */
function computeFireScore(results: RoastResult[]): number {
  const eligible = results.filter((r) => r.top_answer_percentage !== null);
  if (eligible.length === 0) return 0;

  const sum = eligible.reduce((acc, r) => acc + (r.top_answer_percentage ?? 0), 0);
  return Math.round(sum / eligible.length);
}
