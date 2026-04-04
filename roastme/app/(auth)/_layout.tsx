import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { colors } from '@/constants/theme';

/**
 * Auth group layout.
 * Forces a dark, headerless Stack navigator for all auth screens.
 * No ThemeProvider wrapping — we own the entire visual context here.
 */
export default function AuthLayout(): React.JSX.Element {
  return (
    <>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.background },
          animation: 'slide_from_right',
        }}
      />
    </>
  );
}
