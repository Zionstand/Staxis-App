import { create } from 'zustand';

import { getUnreadCount } from '@/lib/notifications';

type NotificationsState = {
  unreadCount: number;
  setUnreadCount: (count: number) => void;
  /** Fetch the latest unread count from the server (best-effort). */
  refreshUnreadCount: () => Promise<void>;
  /** The Expo push token registered for this device, if any. */
  pushToken: string | null;
  setPushToken: (token: string | null) => void;
  reset: () => void;
};

/**
 * Lightweight global store for the unread-notifications badge. Not persisted —
 * it's refreshed from the server whenever the app/home regains focus.
 */
export const useNotifications = create<NotificationsState>((set) => ({
  unreadCount: 0,
  setUnreadCount: (unreadCount) => set({ unreadCount: Math.max(0, unreadCount) }),
  refreshUnreadCount: async () => {
    try {
      const count = await getUnreadCount();
      set({ unreadCount: Math.max(0, count ?? 0) });
    } catch {
      // Non-critical — leave the last known count in place.
    }
  },
  pushToken: null,
  setPushToken: (pushToken) => set({ pushToken }),
  reset: () => set({ unreadCount: 0, pushToken: null }),
}));
