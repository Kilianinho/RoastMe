import React from 'react';
import { Image, StyleSheet, Text, View, type ViewStyle, type ImageStyle, type StyleProp } from 'react-native';
import { colors, typography, borderRadius } from '@/constants/theme';

export type AvatarSize = 'sm' | 'md' | 'lg' | 'xl';

const SIZE_MAP: Record<AvatarSize, number> = {
  sm: 32,
  md: 48,
  lg: 64,
  xl: 96,
};

const FONT_SIZE_MAP: Record<AvatarSize, number> = {
  sm: 12,
  md: 16,
  lg: 22,
  xl: 34,
};

interface AvatarProps {
  uri?: string | null;
  name?: string;
  size?: AvatarSize;
  isPremium?: boolean;
  style?: StyleProp<ViewStyle>;
}

/**
 * Circular user avatar with fallback initials and optional premium badge.
 *
 * @param uri - Remote image URL; falls back to initials if null/undefined
 * @param name - Display name used to derive initials fallback
 * @param size - sm (32), md (48), lg (64), xl (96)
 * @param isPremium - Renders a small crown badge overlay when true
 */
export function Avatar({
  uri,
  name,
  size = 'md',
  isPremium = false,
  style,
}: AvatarProps): React.ReactElement {
  const dimension = SIZE_MAP[size];
  const fontSize = FONT_SIZE_MAP[size];
  const initials = getInitials(name);

  const containerStyle: ViewStyle = {
    width: dimension,
    height: dimension,
    borderRadius: dimension / 2,
  };

  return (
    <View style={[styles.wrapper, containerStyle, style]}>
      {uri ? (
        <Image
          source={{ uri }}
          style={[styles.image, containerStyle as ImageStyle]}
          accessibilityLabel={name ? `Photo de ${name}` : 'Avatar utilisateur'}
        />
      ) : (
        <View style={[styles.fallback, containerStyle]}>
          <Text style={[styles.initials, { fontSize }]}>{initials}</Text>
        </View>
      )}

      {isPremium && (
        <View style={[styles.premiumBadge, getPremiumBadgePosition(size)]}>
          <Text style={styles.premiumIcon}>👑</Text>
        </View>
      )}
    </View>
  );
}

function getInitials(name?: string): string {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

function getPremiumBadgePosition(size: AvatarSize): ViewStyle {
  const badgeSize = size === 'sm' ? 12 : size === 'xl' ? 22 : 16;
  return {
    width: badgeSize,
    height: badgeSize,
    borderRadius: badgeSize / 2,
    bottom: 0,
    right: 0,
  };
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'relative',
  },
  image: {
    resizeMode: 'cover',
  },
  fallback: {
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1.5,
    borderColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  initials: {
    color: colors.textPrimary,
    fontFamily: typography.fontBody,
    fontWeight: '700',
  },
  premiumBadge: {
    position: 'absolute',
    backgroundColor: colors.secondary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: colors.background,
  },
  premiumIcon: {
    fontSize: 8,
  },
});
