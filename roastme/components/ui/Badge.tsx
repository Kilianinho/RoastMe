import React from 'react';
import { StyleSheet, Text, View, type ViewStyle, type StyleProp } from 'react-native';
import { colors, typography } from '@/constants/theme';

export type BadgeColor = 'primary' | 'gold' | 'success';

interface BadgeProps {
  count?: number;
  label?: string;
  color?: BadgeColor;
  style?: StyleProp<ViewStyle>;
}

/**
 * Small circular badge for counts or status indicators.
 *
 * @param count - Numeric value displayed; capped at 99+ for display
 * @param label - Text label (used when count is not provided)
 * @param color - primary (#FF4500), gold (#FFD700), success (#22C55E)
 */
export function Badge({ count, label, color = 'primary', style }: BadgeProps): React.ReactElement | null {
  const displayText = getDisplayText(count, label);

  if (displayText === null) return null;

  return (
    <View
      style={[styles.badge, styles[color], style]}
      accessibilityLabel={count !== undefined ? `${count} notification${count !== 1 ? 's' : ''}` : label}
    >
      <Text style={[styles.text, styles[`text_${color}`]]}>{displayText}</Text>
    </View>
  );
}

function getDisplayText(count?: number, label?: string): string | null {
  if (count !== undefined) {
    if (count <= 0) return null;
    return count > 99 ? '99+' : String(count);
  }
  return label ?? null;
}

const styles = StyleSheet.create({
  badge: {
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primary: {
    backgroundColor: colors.primary,
  },
  gold: {
    backgroundColor: colors.matchGold,
  },
  success: {
    backgroundColor: colors.success,
  },
  text: {
    fontSize: 10,
    fontFamily: typography.fontBody,
    fontWeight: '700',
    lineHeight: 13,
  },
  text_primary: {
    color: colors.textPrimary,
  },
  text_gold: {
    color: colors.background,
  },
  text_success: {
    color: colors.background,
  },
});
