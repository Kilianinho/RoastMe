import '@/lib/i18n'; // Must be the very first import to init i18next before any component renders.

import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { useFonts } from 'expo-font';
import { Stack, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import Toast from 'react-native-toast-message';
import 'react-native-reanimated';

import { BebasNeue_400Regular } from '@expo-google-fonts/bebas-neue';
import { DMSans_400Regular, DMSans_500Medium, DMSans_700Bold } from '@expo-google-fonts/dm-sans';
import { JetBrainsMono_400Regular } from '@expo-google-fonts/jetbrains-mono';

import { useAuthStore } from '@/stores/authStore';
import { colors } from '@/constants/theme';

export {
  ErrorBoundary,
} from 'expo-router';

// Keep the splash screen visible while fonts and auth state are loading.
SplashScreen.preventAutoHideAsync();

// ─── Auth-aware redirect logic ────────────────────────────────────────────────

/**
 * Watches auth state and redirects to the correct screen.
 *
 * Routing rules:
 *   • No session             → (auth)/login   (or landing /index if not yet signed in)
 *   • Session, no profile    → (auth)/signup
 *   • Session + profile      → (tabs)
 *
 * This runs as a child of the Stack so that expo-router's navigation context
 * is available before we call router.replace().
 */
function AuthGate(): null {
  const router = useRouter();
  const segments = useSegments();

  const session = useAuthStore((s) => s.session);
  const profile = useAuthStore((s) => s.profile);
  const isLoading = useAuthStore((s) => s.isLoading);

  useEffect(() => {
    if (isLoading) return;

    // Determine whether the user is currently inside the (auth) group.
    const inAuthGroup = segments[0] === '(auth)';
    const inTabsGroup = segments[0] === '(tabs)';

    if (!session) {
      // No session — send to landing or keep in auth if already there.
      // Allow public routes (roast page, auth callback)
      const publicRoutes = ['roast', 'auth'];
      const isPublicRoute = publicRoutes.includes(segments[0] as string);
      if (inTabsGroup || (!inAuthGroup && !isPublicRoute && segments[0] !== undefined)) {
        router.replace('/');
      }
      return;
    }

    if (session && !profile) {
      // Authenticated but profile not yet created.
      if (!inAuthGroup) {
        router.replace('/(auth)/signup');
      }
      return;
    }

    if (session && profile) {
      // Fully onboarded — go to main app.
      // Allow certain public routes without redirect
      const allowedRoutes = ['share', 'roast', 'auth'];
      const isAllowedRoute = allowedRoutes.includes(segments[0] as string);
      if (!inTabsGroup && !isAllowedRoute) {
        router.replace('/(tabs)/home' as never);
      }
    }
  }, [session, profile, isLoading, segments, router]);

  return null;
}

// ─── Root layout ──────────────────────────────────────────────────────────────

export default function RootLayout(): React.JSX.Element | null {
  // NOTE: Custom font files (BebasNeue, DMSans, JetBrainsMono) must be placed
  // in assets/fonts/ before running the app. Until then the app renders with
  // system fonts. The SpaceMono fallback keeps useFonts happy so the splash
  // screen is hidden correctly.
  const [fontsLoaded, fontError] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
    BebasNeue: BebasNeue_400Regular,
    DMSans: DMSans_400Regular,
    'DMSans-Medium': DMSans_500Medium,
    'DMSans-Bold': DMSans_700Bold,
    JetBrainsMono: JetBrainsMono_400Regular,
  });

  const isAuthLoading = useAuthStore((s) => s.isLoading);

  // Initialize auth store once on mount — sets up session + onAuthStateChange listener.
  useEffect(() => {
    useAuthStore.getState().initialize().catch(() => {
      // If initialization fails the store will have isLoading: false and
      // no session, which sends the user to the landing screen. The error
      // is non-fatal from a UX perspective.
    });
  }, []);

  // Surface font load errors so Expo's ErrorBoundary can catch them.
  useEffect(() => {
    if (fontError) throw fontError;
  }, [fontError]);

  // Hide splash once both fonts and auth are ready.
  useEffect(() => {
    if (fontsLoaded && !isAuthLoading) {
      SplashScreen.hideAsync().catch(() => {
        // Non-fatal — splash may already be hidden in some edge cases.
      });
    }
  }, [fontsLoaded, isAuthLoading]);

  // Render nothing until fonts are loaded — prevents a flash of unstyled text.
  if (!fontsLoaded) {
    return null;
  }

  return (
    <View style={styles.root}>
      <StatusBar style="light" />

      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.background },
          animation: 'fade',
        }}
      >
        {/* Landing */}
        <Stack.Screen name="index" options={{ animation: 'none' }} />

        {/* Auth group — layout handled by (auth)/_layout.tsx */}
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />

        {/* Main app — layout handled by (tabs)/_layout.tsx */}
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />

        {/* Public roast page */}
        <Stack.Screen name="roast/[username]" options={{ headerShown: false }} />
      </Stack>

      {/* AuthGate renders null — just runs redirect side-effects via useEffect */}
      <AuthGate />

      {/* Toast overlay — sits above everything */}
      <Toast />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },
});
