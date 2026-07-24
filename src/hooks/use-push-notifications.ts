import Constants, { ExecutionEnvironment } from 'expo-constants';
import * as Device from 'expo-device';
import { Href, router } from 'expo-router';
import { useEffect } from 'react';
import { Platform } from 'react-native';

import {
  AppNotification,
  getNotificationLink,
  registerPushToken,
} from '@/lib/notifications';
import { useAuth } from '@/store/use-auth';
import { useNotifications } from '@/store/use-notifications';

// Remote push notifications were removed from Expo Go in SDK 53 — even *importing*
// expo-notifications there throws and crashes the layout. Detect Expo Go and skip
// all notification wiring; it works in a dev/production build.
const isExpoGo =
  Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

// Lazily load the module so it never evaluates in Expo Go (a static import would
// run regardless of the guard above). Null in Expo Go and on web.
type NotificationsModule = typeof import('expo-notifications');
const Notifications: NotificationsModule | null = isExpoGo
  ? null
  : (require('expo-notifications') as NotificationsModule);

// Show a banner (and update the list) when a push arrives while the app is open.
if (Notifications) {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
}

// Build a router link from a push's data payload (mirrors getNotificationLink).
// Forward whichever id fields the payload carries so on-tap deep-links land on
// the exact ticket / order / request.
function linkFromData(data: Record<string, unknown> | undefined): string | null {
  if (!data?.type) return null;
  const metadata: Record<string, unknown> = {};
  for (const key of ['ticketId', 'orderId', 'requestId'] as const) {
    if (typeof data[key] === 'string') metadata[key] = data[key];
  }
  return getNotificationLink({
    type: data.type as AppNotification['type'],
    metadata: Object.keys(metadata).length > 0 ? metadata : null,
    recipientType: 'USER',
  } as AppNotification);
}

/**
 * Registers this device for Expo push (when authenticated on a real device),
 * refreshes the unread badge on incoming pushes, and deep-links on tap.
 * Remote push requires a dev/production build — it no-ops in Expo Go and on web.
 */
export function usePushNotifications() {
  const user = useAuth((s) => s.user);
  const refreshUnreadCount = useNotifications((s) => s.refreshUnreadCount);
  const setPushToken = useNotifications((s) => s.setPushToken);

  // Register the device token once we have an authenticated user.
  useEffect(() => {
    const N = Notifications;
    if (!N || !user || Platform.OS === 'web' || !Device.isDevice) return;
    let cancelled = false;

    (async () => {
      try {
        let { status } = await N.getPermissionsAsync();
        if (status !== 'granted') {
          status = (await N.requestPermissionsAsync()).status;
        }
        if (status !== 'granted') return;

        if (Platform.OS === 'android') {
          await N.setNotificationChannelAsync('default', {
            name: 'Default',
            importance: N.AndroidImportance.DEFAULT,
          });
        }

        const projectId =
          Constants.expoConfig?.extra?.eas?.projectId ??
          Constants.easConfig?.projectId;
        const { data: token } = await N.getExpoPushTokenAsync(
          projectId ? { projectId } : undefined,
        );
        if (cancelled || !token) return;

        setPushToken(token);
        await registerPushToken(token, Platform.OS === 'ios' ? 'ios' : 'android');
      } catch {
        // Best-effort — never block the app on push registration.
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [user, setPushToken]);

  // Foreground receipt + tap handling.
  useEffect(() => {
    const N = Notifications;
    if (!N) return;
    const received = N.addNotificationReceivedListener(() => {
      refreshUnreadCount();
    });
    const responded = N.addNotificationResponseReceivedListener((response) => {
      refreshUnreadCount();
      const link = linkFromData(
        response.notification.request.content.data as Record<string, unknown> | undefined,
      );
      if (link) router.push(link as Href);
    });

    return () => {
      received.remove();
      responded.remove();
    };
  }, [refreshUnreadCount]);
}
