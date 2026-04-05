import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { colors, typography } from '@/constants/theme';
import { useChat } from '@/hooks/useChat';

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

interface TabIconProps {
  name: IoniconName;
  nameFocused: IoniconName;
  color: string;
  focused: boolean;
  badgeCount?: number;
}

function TabIcon({ name, nameFocused, color, focused, badgeCount }: TabIconProps): React.ReactElement {
  return (
    <View style={styles.iconWrapper}>
      <Ionicons name={focused ? nameFocused : name} size={24} color={color} />
      {badgeCount !== undefined && badgeCount > 0 && (
        <View style={styles.badge} accessibilityLabel={`${badgeCount}`}>
          <Text style={styles.badgeText}>{badgeCount > 99 ? '99+' : String(badgeCount)}</Text>
        </View>
      )}
    </View>
  );
}

/**
 * Root tab bar layout.
 * 4 tabs: Home (Dashboard), Matches, Chat (with unread badge), Profile.
 * Dark background with primary active tint per spec.
 */
export default function TabLayout(): React.ReactElement {
  const { t } = useTranslation();
  const { unreadTotal } = useChat();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: styles.tabBar,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarLabelStyle: styles.tabLabel,
        tabBarItemStyle: styles.tabItem,
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          tabBarLabel: t('home.tab'),
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name="home-outline" nameFocused="home" color={color} focused={focused} />
          ),
          tabBarAccessibilityLabel: t('home.tab'),
        }}
      />

      <Tabs.Screen
        name="matches"
        options={{
          tabBarLabel: t('matches.title'),
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name="heart-outline" nameFocused="heart" color={color} focused={focused} />
          ),
          tabBarAccessibilityLabel: t('matches.title'),
        }}
      />

      <Tabs.Screen
        name="chat"
        options={{
          tabBarLabel: t('chat.title'),
          tabBarIcon: ({ color, focused }) => (
            <TabIcon
              name="chatbubble-outline"
              nameFocused="chatbubble"
              color={color}
              focused={focused}
              badgeCount={unreadTotal}
            />
          ),
          tabBarAccessibilityLabel: t('chat.title'),
        }}
      />

      <Tabs.Screen
        name="profile"
        options={{
          tabBarLabel: t('profile.title'),
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name="person-outline" nameFocused="person" color={color} focused={focused} />
          ),
          tabBarAccessibilityLabel: t('profile.title'),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: colors.background,
    borderTopColor: colors.surfaceElevated,
    borderTopWidth: 1,
    height: 60,
    paddingBottom: 8,
    paddingTop: 6,
  },
  tabLabel: {
    fontFamily: typography.fontBody,
    fontSize: 10,
    fontWeight: '500',
  },
  tabItem: {
    paddingTop: 2,
  },
  iconWrapper: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -8,
    backgroundColor: colors.primary,
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
    borderWidth: 1.5,
    borderColor: colors.background,
  },
  badgeText: {
    fontSize: 9,
    fontFamily: typography.fontBody,
    fontWeight: '700',
    color: colors.textPrimary,
  },
});
