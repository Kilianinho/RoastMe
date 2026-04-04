import React from 'react';
import { StyleSheet, View, type ViewProps, type StyleProp, type ViewStyle } from 'react-native';
import { colors, spacing, borderRadius } from '@/constants/theme';

interface CardProps extends ViewProps {
  children: React.ReactNode;
  elevated?: boolean;
  style?: StyleProp<ViewStyle>;
}

/**
 * Reusable dark card container.
 *
 * @param elevated - Uses slightly lighter surface (#252525) for layering
 * @param children - Card content
 */
export function Card({ children, elevated = false, style, ...rest }: CardProps): React.ReactElement {
  return (
    <View
      style={[styles.card, elevated && styles.elevated, style]}
      {...rest}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
  },
  elevated: {
    backgroundColor: colors.surfaceElevated,
  },
});
