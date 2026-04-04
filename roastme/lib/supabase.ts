import { createClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';
import { config } from '@/constants/config';

// AsyncStorage is not available during SSR (web server rendering).
// Use a no-op storage for SSR, real AsyncStorage for native/client.
let storage: {
  getItem: (key: string) => Promise<string | null>;
  setItem: (key: string, value: string) => Promise<void>;
  removeItem: (key: string) => Promise<void>;
};

if (Platform.OS === 'web' && typeof window === 'undefined') {
  // SSR — no-op storage
  storage = {
    getItem: async () => null,
    setItem: async () => {},
    removeItem: async () => {},
  };
} else {
  // Native or browser client
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const AsyncStorage = require('@react-native-async-storage/async-storage').default;
  storage = AsyncStorage;
}

export const supabase = createClient(
  config.supabase.url,
  config.supabase.anonKey,
  {
    auth: {
      storage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  }
);
