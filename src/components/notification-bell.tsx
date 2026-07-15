import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';
import { useNotifications } from '@/store/use-notifications';

/** Header bell button with an unread badge; opens the notifications screen. */
export function NotificationBell() {
  const theme = useTheme();
  const count = useNotifications((s) => s.unreadCount);

  return (
    <Pressable
      onPress={() => router.push('/notifications')}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityLabel={count > 0 ? `Notifications, ${count} unread` : 'Notifications'}
      style={[styles.button, { backgroundColor: theme.backgroundElement }]}>
      <ThemedText style={styles.bell}>🔔</ThemedText>
      {count > 0 && (
        <View style={styles.badge}>
          <ThemedText style={styles.badgeText}>{count > 9 ? '9+' : String(count)}</ThemedText>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bell: {
    fontSize: 20,
    lineHeight: 24,
  },
  badge: {
    position: 'absolute',
    top: 4,
    right: 4,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    paddingHorizontal: 4,
    backgroundColor: '#e5484d',
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    color: '#ffffff',
    fontSize: 10,
    lineHeight: 14,
    fontWeight: '700',
  },
});
