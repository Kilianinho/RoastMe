import { useCallback } from 'react';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import { config } from '@/constants/config';
import type { Gender, Profile } from '@/types/database';
import type { Session, User } from '@supabase/supabase-js';

// Required for OAuth redirect flow on native — completes the auth session
// when the app is re-opened via deep link after the provider redirects back.
WebBrowser.maybeCompleteAuthSession();

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CreateProfileData {
  display_name: string;
  username: string;
  gender: Gender | null;
  looking_for: Gender[];
}

export interface UseAuthReturn {
  // Auth store state (read-only surface)
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  isLoading: boolean;
  isOnboarded: boolean;

  // Auth actions
  signInWithGoogle: () => Promise<void>;
  signInWithApple: () => Promise<void>;
  signInWithEmail: (email: string) => Promise<void>;
  signOut: () => Promise<void>;

  // Profile actions
  createProfile: (data: CreateProfileData) => Promise<void>;
  checkUsernameAvailability: (username: string) => Promise<boolean>;
}

/**
 * Builds the OAuth redirect URI using expo-linking's createURL.
 * This handles the scheme://auth/callback deep link that Supabase redirects to
 * after the OAuth provider completes sign-in.
 */
function buildRedirectUri(): string {
  return Linking.createURL('auth/callback');
}

/**
 * Convenience hook that wraps the Zustand auth store with typed Supabase auth
 * actions. Components should import this rather than calling Supabase directly,
 * so auth logic stays in one place.
 */
export function useAuth(): UseAuthReturn {
  const session = useAuthStore((s) => s.session);
  const user = useAuthStore((s) => s.user);
  const profile = useAuthStore((s) => s.profile);
  const isLoading = useAuthStore((s) => s.isLoading);
  const isOnboarded = useAuthStore((s) => s.isOnboarded);
  const setProfile = useAuthStore((s) => s.setProfile);
  const signOutStore = useAuthStore((s) => s.signOut);

  // ─── OAuth: Google ──────────────────────────────────────────────────────────

  const signInWithGoogle = useCallback(async (): Promise<void> => {
    const redirectTo = buildRedirectUri();

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo,
        skipBrowserRedirect: true,
      },
    });

    if (error) throw new Error(error.message);
    if (!data.url) throw new Error('No OAuth URL returned from Supabase');

    const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);

    if (result.type === 'success') {
      // The onAuthStateChange listener in authStore.initialize() will pick up
      // the new session automatically via the deep-link URL fragment.
      // Nothing more to do here.
    }
    // 'cancel' — user dismissed the browser, not an error.
  }, []);

  // ─── OAuth: Apple ───────────────────────────────────────────────────────────

  const signInWithApple = useCallback(async (): Promise<void> => {
    const redirectTo = buildRedirectUri();

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'apple',
      options: {
        redirectTo,
        skipBrowserRedirect: true,
      },
    });

    if (error) throw new Error(error.message);
    if (!data.url) throw new Error('No OAuth URL returned from Supabase');

    await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
    // Session picked up by onAuthStateChange listener in authStore.
  }, []);

  // ─── Magic link ─────────────────────────────────────────────────────────────

  const signInWithEmail = useCallback(async (email: string): Promise<void> => {
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: buildRedirectUri(),
        shouldCreateUser: true,
      },
    });

    if (error) throw new Error(error.message);
  }, []);

  // ─── Sign out ────────────────────────────────────────────────────────────────

  const signOut = useCallback(async (): Promise<void> => {
    await signOutStore();
  }, [signOutStore]);

  // ─── Create profile ──────────────────────────────────────────────────────────

  const createProfile = useCallback(
    async (data: CreateProfileData): Promise<void> => {
      // Read from store singleton — avoids stale closure over `user` state.
      const currentUser = useAuthStore.getState().user;
      if (!currentUser) throw new Error('No authenticated user');

      const shareLink = `${config.app.url}/${data.username}`;

      const { data: inserted, error } = await supabase
        .from('profiles')
        .insert({
          id: currentUser.id,
          display_name: data.display_name,
          username: data.username,
          gender: data.gender,
          looking_for: data.looking_for,
          share_link: shareLink,
        })
        .select()
        .single();

      if (error) {
        // PostgreSQL unique constraint violation — username already taken
        if (error.code === '23505') {
          throw new Error('errors.usernameExists');
        }
        throw new Error(error.message);
      }

      setProfile(inserted);
    },
    [setProfile],
  );

  // ─── Username availability ────────────────────────────────────────────────────

  const checkUsernameAvailability = useCallback(
    async (username: string): Promise<boolean> => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id')
        .eq('username', username)
        .is('deleted_at', null)
        .maybeSingle();

      if (error) throw new Error(error.message);
      // data === null means no row matched — username is free to claim.
      return data === null;
    },
    [],
  );

  return {
    session,
    user,
    profile,
    isLoading,
    isOnboarded,
    signInWithGoogle,
    signInWithApple,
    signInWithEmail,
    signOut,
    createProfile,
    checkUsernameAvailability,
  };
}
