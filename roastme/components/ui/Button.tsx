import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  type PressableProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { colors, spacing, borderRadius, typography } from '@/constants/theme';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost';
export type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends Omit<PressableProps, 'style'> {
  label: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel: string;
}

/**
 * Reusable button component with variant and size support.
 *
 * @param label - Button text content
 * @param variant - Visual style: primary (filled), secondary (outlined), ghost (text only)
 * @param size - Dimensions: sm, md, lg
 * @param isLoading - Shows ActivityIndicator and disables interaction
 * @param accessibilityLabel - Required ARIA label for screen readers
 */
export function Button({
  label,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  disabled,
  style,
  accessibilityLabel,
  ...rest
}: ButtonProps): React.ReactElement {
  const isDisabled = disabled || isLoading;

  return (
    <Pressable
      style={({ pressed }) => [
        styles.base,
        styles[variant],
        styles[`size_${size}`],
        isDisabled && styles.disabled,
        pressed && !isDisabled && styles.pressed,
        style,
      ]}
      disabled={isDisabled}
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled, busy: isLoading }}
      {...rest}
    >
      {isLoading ? (
        <ActivityIndicator
          size="small"
          color={variant === 'primary' ? colors.textPrimary : colors.primary}
        />
      ) : (
        <Text style={[styles.label, styles[`label_${variant}`], styles[`labelSize_${size}`]]}>
          {label}
        </Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: borderRadius.md,
    flexDirection: 'row',
  },
  pressed: {
    opacity: 0.8,
  },
  disabled: {
    opacity: 0.4,
  },

  // Variants
  primary: {
    backgroundColor: colors.primary,
  },
  secondary: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: colors.primary,
  },
  ghost: {
    backgroundColor: 'transparent',
  },

  // Sizes
  size_sm: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    minHeight: 36,
  },
  size_md: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm + 2,
    minHeight: 48,
  },
  size_lg: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    minHeight: 56,
  },

  // Label base
  label: {
    fontFamily: typography.fontBody,
    fontWeight: '600',
  },
  label_primary: {
    color: colors.textPrimary,
  },
  label_secondary: {
    color: colors.primary,
  },
  label_ghost: {
    color: colors.primary,
  },

  // Label sizes
  labelSize_sm: {
    fontSize: typography.sizes.sm,
  },
  labelSize_md: {
    fontSize: typography.sizes.md,
  },
  labelSize_lg: {
    fontSize: typography.sizes.lg,
  },
});
