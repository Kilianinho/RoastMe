/**
 * useRoastSession
 *
 * Orchestrates the full roast flow:
 *   1. createSession(username)  — resolve profile, create DB session, fetch questions
 *   2. submitAnswers()          — batch-insert answers, mark session complete
 *
 * All Supabase I/O lives here; the page component stays thin.
 */

import { useCallback, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Toast from 'react-native-toast-message';
import { useTranslation } from 'react-i18next';
import i18n from '@/lib/i18n';

import { supabase } from '@/lib/supabase';
import { useRoastStore } from '@/stores/roastStore';
import { useAuthStore } from '@/stores/authStore';
import { generateUUID } from '@/utils/uuid';
import { logger } from '@/utils/logger';
import { getFallbackQuestions } from '@/constants/questions';
import type { Profile, Question } from '@/types/database';

/** Key used to persist the anonymous roaster session ID across app restarts. */
const STORAGE_KEY_SESSION_ID = 'roastme:roaster_session_id';

/** Number of questions to fetch per roast session. */
const QUESTION_COUNT = 10;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type RoastSessionStatus =
  | 'idle'
  | 'loading'
  | 'ready'
  | 'submitting'
  | 'completed'
  | 'error';

export interface RoastSessionError {
  code: 'PROFILE_NOT_FOUND' | 'ROAST_SELF' | 'NETWORK' | 'NO_QUESTIONS' | 'SUBMIT_FAILED';
  message: string;
}

export interface UseRoastSessionReturn {
  status: RoastSessionStatus;
  sessionError: RoastSessionError | null;
  /** Resolve profile + create DB session + fetch questions. */
  createSession: (username: string) => Promise<void>;
  /** Batch-insert all answers and mark the session complete. */
  submitAnswers: () => Promise<void>;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Retrieves or generates the persistent anonymous roaster session ID.
 * Stored in AsyncStorage so repeat visits don't create duplicate sessions.
 *
 * @returns A UUID string identifying this device's anonymous identity.
 */
async function getOrCreateRoasterSessionId(): Promise<string> {
  try {
    const stored = await AsyncStorage.getItem(STORAGE_KEY_SESSION_ID);
    if (stored) return stored;

    const fresh = generateUUID();
    await AsyncStorage.setItem(STORAGE_KEY_SESSION_ID, fresh);
    return fresh;
  } catch (err) {
    // Storage failure is non-fatal — generate a fresh ID for this session only.
    logger.warn('useRoastSession: AsyncStorage read failed, using ephemeral ID', {
      error: String(err),
    });
    return generateUUID();
  }
}

/**
 * Fetches QUESTION_COUNT random active questions for the given locale,
 * falling back to 'fr' if insufficient results are returned.
 *
 * @param locale - BCP 47 language code, e.g. 'fr' or 'en'.
 * @returns Array of Question rows.
 * @throws {RoastSessionError} when Supabase returns an error.
 */
async function fetchQuestions(locale: string): Promise<Question[]> {
  const { data, error } = await supabase
    .from('questions')
    .select('*')
    .eq('is_active', true)
    .eq('locale', locale)
    .limit(50); // fetch pool, shuffle client-side for true randomness

  if (error) {
    throw {
      code: 'NETWORK',
      message: error.message,
    } satisfies RoastSessionError;
  }

  let pool: Question[] = (data as Question[]) ?? [];

  // If the locale pool is too small, fall back to 'fr'
  if (pool.length < QUESTION_COUNT && locale !== 'fr') {
    logger.info('useRoastSession: locale pool too small, falling back to fr', {
      locale,
      poolSize: pool.length,
    });

    const { data: frData, error: frError } = await supabase
      .from('questions')
      .select('*')
      .eq('is_active', true)
      .eq('locale', 'fr')
      .limit(50);

    if (!frError && frData) {
      pool = frData as Question[];
    }
  }

  if (pool.length === 0) {
    logger.warn('useRoastSession: no questions from Supabase, using offline fallback', {
      locale,
    });
    pool = getFallbackQuestions(locale);
  }

  // Fisher-Yates shuffle then take QUESTION_COUNT
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }

  return pool.slice(0, QUESTION_COUNT);
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

/**
 * Manages the full lifecycle of a roast session.
 *
 * @example
 * ```tsx
 * const { status, sessionError, createSession, submitAnswers } = useRoastSession();
 *
 * useEffect(() => { createSession(username); }, [username]);
 * ```
 */
export function useRoastSession(): UseRoastSessionReturn {
  const { t } = useTranslation();

  const [status, setStatus] = useState<RoastSessionStatus>('idle');
  const [sessionError, setSessionError] = useState<RoastSessionError | null>(null);

  // ---------------------------------------------------------------------------
  // createSession
  // ---------------------------------------------------------------------------

  const createSession = useCallback(
    async (username: string): Promise<void> => {
      // Read store actions via getState() to avoid capturing the store object
      // reference as a dep — Zustand re-creates the object each render, which
      // would make this callback a new reference every render and cause loops.
      const store = useRoastStore.getState();

      setStatus('loading');
      setSessionError(null);

      try {
        // 1. Fetch the target profile
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('id, display_name, username, is_suspended, deleted_at')
          .eq('username', username.toLowerCase())
          .is('deleted_at', null)
          .single();

        if (profileError || !profileData) {
          const err: RoastSessionError = {
            code: 'PROFILE_NOT_FOUND',
            message: t('errors.profileNotFound'),
          };
          setSessionError(err);
          setStatus('error');
          return;
        }

        const targetProfile = profileData as Pick<
          Profile,
          'id' | 'display_name' | 'username' | 'is_suspended' | 'deleted_at'
        >;

        // 2. Guard: suspended profiles cannot be roasted
        if (targetProfile.is_suspended) {
          const err: RoastSessionError = {
            code: 'PROFILE_NOT_FOUND',
            message: t('errors.profileNotFound'),
          };
          setSessionError(err);
          setStatus('error');
          return;
        }

        // 3. Guard: authenticated users cannot roast themselves
        // Use local session instead of getUser() to avoid network round-trip (I-2 fix)
        const currentUser = useAuthStore.getState().user;

        if (currentUser && currentUser.id === targetProfile.id) {
          const err: RoastSessionError = {
            code: 'ROAST_SELF',
            message: t('errors.roastSelf'),
          };
          setSessionError(err);
          setStatus('error');
          return;
        }

        // 4. Get or create the anonymous roaster session ID
        const roasterSessionId = await getOrCreateRoasterSessionId();

        // 5. Create roast_session row in Supabase
        const sessionPayload = {
          roasted_user_id: targetProfile.id,
          roaster_session_id: roasterSessionId,
          roaster_user_id: currentUser?.id ?? null,
          roaster_gender: null, // not collected on the roast page
          is_completed: false,
        };

        const { data: sessionData, error: sessionInsertError } = await supabase
          .from('roast_sessions')
          .insert(sessionPayload)
          .select('id')
          .single();

        if (sessionInsertError || !sessionData) {
          logger.error('useRoastSession: failed to create session', {
            error: sessionInsertError?.message,
          });
          throw {
            code: 'NETWORK',
            message: t('errors.network'),
          } satisfies RoastSessionError;
        }

        const newSessionId = (sessionData as { id: string }).id;

        // 6. Fetch questions filtered by device locale
        const locale = i18n.language ?? 'fr';
        const questions = await fetchQuestions(locale);

        // 7. Hydrate the store
        store.startSession({
          sessionId: newSessionId,
          roastedUserId: targetProfile.id,
          roastedDisplayName: targetProfile.display_name,
          questions,
        });

        logger.info('useRoastSession: session created', {
          sessionId: newSessionId,
          roastedUserId: targetProfile.id,
          questionCount: questions.length,
        });

        setStatus('ready');
      } catch (err: unknown) {
        if (
          typeof err === 'object' &&
          err !== null &&
          'code' in err &&
          'message' in err
        ) {
          // Already a typed RoastSessionError
          setSessionError(err as RoastSessionError);
        } else {
          logger.error('useRoastSession: unexpected error in createSession', {
            error: String(err),
          });
          setSessionError({
            code: 'NETWORK',
            message: t('errors.unknown'),
          });
        }
        setStatus('error');
      }
    },
    [t],
  );

  // ---------------------------------------------------------------------------
  // submitAnswers
  // ---------------------------------------------------------------------------

  const submitAnswers = useCallback(async (): Promise<void> => {
    // Same pattern: read store state at call time, not at hook render time.
    const store = useRoastStore.getState();
    const { sessionId, answers, questions } = store;

    if (!sessionId) {
      logger.error('useRoastSession: submitAnswers called with no active session');
      return;
    }

    setStatus('submitting');
    store.setSubmitting(true);

    try {
      // Build the batch payload
      const rows = questions
        .filter((q) => answers.has(q.id))
        .map((q) => {
          const ans = answers.get(q.id)!;
          return {
            session_id: sessionId,
            question_id: q.id,
            answer_value: ans.value,
            answer_label: ans.label,
          };
        });

      if (rows.length === 0) {
        logger.error('useRoastSession: submitAnswers called with no answers — aborting');
        setSessionError({
          code: 'SUBMIT_FAILED',
          message: t('errors.unknown'),
        });
        setStatus('error');
        return;
      }

      // Batch insert roast_answers
      const { error: insertError } = await supabase
        .from('roast_answers')
        .insert(rows);

      if (insertError) {
        logger.error('useRoastSession: failed to insert answers', {
          error: insertError.message,
          sessionId,
          rowCount: rows.length,
        });
        throw {
          code: 'SUBMIT_FAILED',
          message: t('errors.unknown'),
        } satisfies RoastSessionError;
      }

      // Mark session as completed
      const { error: updateError } = await supabase
        .from('roast_sessions')
        .update({
          is_completed: true,
          completed_at: new Date().toISOString(),
        })
        .eq('id', sessionId);

      if (updateError) {
        // Non-fatal: answers were saved — log but do not block completion UX
        logger.warn('useRoastSession: failed to mark session complete', {
          error: updateError.message,
          sessionId,
        });
      }

      // Trigger aggregate-roast Edge Function (fire-and-forget — DB trigger handles it)
      // The edge function is called asynchronously; we don't block on it.
      supabase.functions
        .invoke('aggregate-roast', { body: { roast_session_id: sessionId } })
        .catch((fnErr: unknown) => {
          logger.warn('useRoastSession: aggregate-roast invocation failed', {
            error: String(fnErr),
            sessionId,
          });
        });

      logger.info('useRoastSession: answers submitted successfully', {
        sessionId,
        answerCount: rows.length,
      });

      store.setCompleted();
      setStatus('completed');
    } catch (err: unknown) {
      if (
        typeof err === 'object' &&
        err !== null &&
        'code' in err &&
        'message' in err
      ) {
        const typed = err as RoastSessionError;
        setSessionError(typed);
        Toast.show({
          type: 'error',
          text1: t('common.error'),
          text2: typed.message,
        });
      } else {
        logger.error('useRoastSession: unexpected error in submitAnswers', {
          error: String(err),
        });
        Toast.show({
          type: 'error',
          text1: t('common.error'),
          text2: t('errors.unknown'),
        });
        setSessionError({
          code: 'SUBMIT_FAILED',
          message: t('errors.unknown'),
        });
      }
      setStatus('error');
    } finally {
      store.setSubmitting(false);
    }
  }, [t]);

  return { status, sessionError, createSession, submitAnswers };
}
