import { create } from 'zustand';
import { supabase } from '@/lib/supabase';
import type { Profile } from '@/types/database';
import type { Session, User, Subscription } from '@supabase/supabase-js';

interface AuthState {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  isLoading: boolean;
  isOnboarded: boolean;

  setSession: (session: Session | null) => void;
  setProfile: (profile: Profile | null) => void;
  setIsOnboarded: (value: boolean) => void;
  fetchProfile: () => Promise<void>;
  signOut: () => Promise<void>;
  initialize: () => Promise<void>;
}

// Store the subscription so we can unsubscribe on re-init (C-1 fix)
let authSubscription: Subscription | null = null;

export const useAuthStore = create<AuthState>((set, get) => ({
  session: null,
  user: null,
  profile: null,
  isLoading: true,
  isOnboarded: false,

  setSession: (session) => set({ session, user: session?.user ?? null }),
  setProfile: (profile) => set({ profile, isOnboarded: !!profile }),
  setIsOnboarded: (value) => set({ isOnboarded: value }),

  fetchProfile: async () => {
    const { user } = get();
    if (!user) return;

    // Use maybeSingle() to avoid PGRST116 error for new users (I-1 fix)
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .is('deleted_at', null)
      .maybeSingle();

    if (data) {
      set({ profile: data as Profile, isOnboarded: true });
    } else {
      // No profile row — user needs to complete signup
      set({ profile: null, isOnboarded: false });
    }
  },

  signOut: async () => {
    await supabase.auth.signOut();
    set({
      session: null,
      user: null,
      profile: null,
      isOnboarded: false,
    });
  },

  initialize: async () => {
    set({ isLoading: true });

    // Unsubscribe previous listener if re-initializing (C-1 fix)
    if (authSubscription) {
      authSubscription.unsubscribe();
      authSubscription = null;
    }

    const { data: { session } } = await supabase.auth.getSession();

    if (session) {
      set({ session, user: session.user });
      await get().fetchProfile();
    }

    set({ isLoading: false });

    // Only fetch profile on meaningful events, not TOKEN_REFRESHED (C-2 fix)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      set({ session, user: session?.user ?? null });

      if (event === 'SIGNED_IN' || event === 'USER_UPDATED') {
        get().fetchProfile();
      } else if (event === 'SIGNED_OUT') {
        set({ profile: null, isOnboarded: false });
      }
    });

    authSubscription = subscription;
  },
}));
