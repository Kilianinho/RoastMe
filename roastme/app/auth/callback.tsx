/**
 * /auth/callback
 *
 * Handles the redirect from Supabase magic link / OAuth.
 * Extracts the auth tokens from the URL hash fragment,
 * sets the session in Supabase, then redirects to the app.
 */

import { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, Text, View, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import { colors, typography } from '@/constants/theme';

export default function AuthCallbackScreen() {
  const router = useRouter();
  const { t } = useTranslation();

  useEffect(() => {
    handleCallback();
  }, []);

  async function handleCallback() {
    try {
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        // On web, Supabase tokens come in the URL hash fragment
        const hashParams = new URLSearchParams(
          window.location.hash.substring(1),
        );

        const accessToken = hashParams.get('access_token');
        const refreshToken = hashParams.get('refresh_token');
        const error = hashParams.get('error');
        const errorDescription = hashParams.get('error_description');

        if (error) {
          console.error('Auth callback error:', errorDescription);
          router.replace('/');
          return;
        }

        if (accessToken && refreshToken) {
          const { error: sessionError } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });

          if (sessionError) {
            console.error('Failed to set session:', sessionError.message);
            router.replace('/');
            return;
          }

          // Session is set — auth store will pick it up via onAuthStateChange
          // and AuthGate will redirect to signup or tabs
          await useAuthStore.getState().fetchProfile();
          const profile = useAuthStore.getState().profile;

          if (profile) {
            router.replace('/(tabs)/home' as never);
          } else {
            router.replace('/(auth)/signup');
          }
          return;
        }
      }

      // Fallback — just go home, AuthGate will handle routing
      router.replace('/');
    } catch (err) {
      console.error('Auth callback unexpected error:', err);
      router.replace('/');
    }
  }

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color={colors.primary} />
      <Text style={styles.text}>{t('auth.connecting')}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  text: {
    fontFamily: typography.fontBody,
    fontSize: typography.sizes.md,
    color: colors.textSecondary,
  },
});
