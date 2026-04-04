import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import { useNotificationStore } from '@/stores/notificationStore';
import type { Notification as AppNotification } from '@/types/database';

// Configure how notifications appear when the app is in the foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

/**
 * Hook to manage push notifications:
 * - Registers for push tokens on mount
 * - Subscribes to Supabase Realtime for in-app notifications
 * - Handles notification tap navigation
 */
export function useNotifications() {
  const router = useRouter();
  const profile = useAuthStore((s) => s.profile);
  const { setNotifications, addNotification, setExpoPushToken } = useNotificationStore();
  const notificationListener = useRef<Notifications.Subscription | null>(null);
  const responseListener = useRef<Notifications.Subscription | null>(null);

  // Register for push notifications
  useEffect(() => {
    if (!profile) return;

    registerForPushNotifications().then((token) => {
      if (token) {
        setExpoPushToken(token);
      }
    });

    // Listen for incoming notifications while app is foregrounded
    notificationListener.current = Notifications.addNotificationReceivedListener(
      (notification) => {
        const data = notification.request.content.data as Record<string, unknown>;
        if (data?.id) {
          addNotification(data as unknown as AppNotification);
        }
      },
    );

    // Listen for notification taps (user interacts with notification)
    responseListener.current = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        const data = response.notification.request.content.data as Record<string, unknown>;
        handleNotificationNavigation(data);
      },
    );

    return () => {
      if (notificationListener.current) {
        notificationListener.current.remove();
      }
      if (responseListener.current) {
        responseListener.current.remove();
      }
    };
  }, [profile?.id]);

  // Fetch existing notifications from DB
  useEffect(() => {
    if (!profile) return;

    fetchNotifications();

    // Subscribe to new notifications via Supabase Realtime
    const channel = supabase
      .channel('notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${profile.id}`,
        },
        (payload) => {
          addNotification(payload.new as AppNotification);
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile?.id]);

  async function fetchNotifications() {
    if (!profile) return;

    const { data } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', profile.id)
      .order('created_at', { ascending: false })
      .limit(50);

    if (data) {
      setNotifications(data as AppNotification[]);
    }
  }

  function handleNotificationNavigation(data: Record<string, unknown>) {
    const type = data?.type as string | undefined;

    switch (type) {
      case 'new_roast':
        router.push('/(tabs)/home');
        break;
      case 'new_match':
        router.push('/(tabs)/matches');
        break;
      case 'new_message': {
        const matchId = data?.match_id as string | undefined;
        if (matchId) {
          router.push(`/(tabs)/chat/${matchId}`);
        } else {
          router.push('/(tabs)/chat');
        }
        break;
      }
      default:
        router.push('/(tabs)/home');
    }
  }

  async function markAsRead(notificationId: string) {
    useNotificationStore.getState().markAsRead(notificationId);
    await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', notificationId);
  }

  async function markAllAsRead() {
    if (!profile) return;
    useNotificationStore.getState().markAllAsRead();
    await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', profile.id)
      .eq('is_read', false);
  }

  return {
    markAsRead,
    markAllAsRead,
    refetch: fetchNotifications,
  };
}

async function registerForPushNotifications(): Promise<string | null> {
  if (!Device.isDevice) {
    return null;
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    return null;
  }

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'RoastMe',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF4500',
    });
  }

  const tokenData = await Notifications.getExpoPushTokenAsync();
  return tokenData.data;
}
