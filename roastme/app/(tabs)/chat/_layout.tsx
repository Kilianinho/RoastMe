import React from 'react';
import { Stack } from 'expo-router';
import { colors } from '@/constants/theme';

export default function ChatLayout(): React.ReactElement {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
      }}
    />
  );
}
