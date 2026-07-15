import { Href, router, Stack } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  View,
} from 'react-native';

import { BrandTitle } from '@/components/logo';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import {
  AppNotification,
  getNotificationLink,
  getNotifications,
  markAllRead,
  markOneRead,
  NOTIFICATION_CONFIG,
  deleteNotification,
} from '@/lib/notifications';
import { fromNow } from '@/lib/utils';
import { useNotifications } from '@/store/use-notifications';

const PAGE_SIZE = 20;
type Tab = 'all' | 'unread';

export default function NotificationsScreen() {
  const theme = useTheme();
  const refreshUnreadCount = useNotifications((s) => s.refreshUnreadCount);
  const setUnreadCount = useNotifications((s) => s.setUnreadCount);

  const [items, setItems] = useState<AppNotification[]>([]);
  const [tab, setTab] = useState<Tab>('all');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);

  const load = useCallback(
    async (nextPage: number, currentTab: Tab) => {
      try {
        const res = await getNotifications({
          page: nextPage,
          limit: PAGE_SIZE,
          unreadOnly: currentTab === 'unread',
        });
        setItems((prev) => (nextPage === 1 ? res.items : [...prev, ...res.items]));
        setHasMore(res.page * res.limit < res.total);
        setPage(res.page);
        setError(false);
      } catch {
        if (nextPage === 1) setError(true);
      } finally {
        setLoading(false);
        setRefreshing(false);
        setLoadingMore(false);
      }
    },
    [],
  );

  // Reload from the top whenever the tab changes.
  useEffect(() => {
    setLoading(true);
    load(1, tab);
  }, [tab, load]);

  const onRefresh = () => {
    setRefreshing(true);
    load(1, tab);
    refreshUnreadCount();
  };

  const onEndReached = () => {
    if (!loadingMore && hasMore && !loading) {
      setLoadingMore(true);
      load(page + 1, tab);
    }
  };

  const markRead = async (id: string) => {
    setItems((prev) =>
      tab === 'unread'
        ? prev.filter((n) => n.id !== id)
        : prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)),
    );
    try {
      await markOneRead(id);
    } catch {
      // best-effort; server stays source of truth on next refresh
    }
    refreshUnreadCount();
  };

  const onMarkAll = async () => {
    setItems((prev) => (tab === 'unread' ? [] : prev.map((n) => ({ ...n, isRead: true }))));
    setUnreadCount(0);
    try {
      await markAllRead();
    } catch {
      refreshUnreadCount();
    }
  };

  const onDelete = async (id: string) => {
    setItems((prev) => prev.filter((n) => n.id !== id));
    try {
      await deleteNotification(id);
    } catch {
      // ignore — will reappear on refresh if it failed
    }
    refreshUnreadCount();
  };

  const onPressItem = (n: AppNotification) => {
    if (!n.isRead) markRead(n.id);
    const link = getNotificationLink(n);
    if (link) router.push(link as Href);
  };

  const renderItem = ({ item }: { item: AppNotification }) => {
    const config = NOTIFICATION_CONFIG[item.type];
    return (
      <Pressable
        onPress={() => onPressItem(item)}
        style={({ pressed }) => [
          styles.row,
          { backgroundColor: item.isRead ? theme.background : theme.backgroundElement },
          pressed && styles.pressed,
        ]}>
        <View style={[styles.iconBadge, { backgroundColor: theme.backgroundSelected }]}>
          <ThemedText style={styles.icon}>{config?.icon ?? '🔔'}</ThemedText>
        </View>

        <View style={styles.rowBody}>
          <View style={styles.rowTop}>
            <ThemedText type={item.isRead ? 'small' : 'smallBold'} numberOfLines={1} style={styles.title}>
              {item.title}
            </ThemedText>
            {!item.isRead && <View style={styles.unreadDot} />}
          </View>
          <ThemedText type="small" themeColor="textSecondary" numberOfLines={2}>
            {item.message}
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary" style={styles.time}>
            {config?.label ? `${config.label} · ` : ''}
            {fromNow(item.createdAt)}
          </ThemedText>
        </View>

        <Pressable onPress={() => onDelete(item.id)} hitSlop={10} style={styles.delete}>
          <ThemedText type="small" themeColor="textSecondary">
            ✕
          </ThemedText>
        </Pressable>
      </Pressable>
    );
  };

  return (
    <ThemedView style={styles.container}>
      <Stack.Screen
        options={{
          title: 'Notifications',
          headerTitle: ({ children }) => <BrandTitle title={children} />,
          headerRight: () =>
            items.some((n) => !n.isRead) ? (
              <Pressable onPress={onMarkAll} hitSlop={8}>
                <ThemedText type="smallBold" themeColor="primary">
                  Mark all read
                </ThemedText>
              </Pressable>
            ) : null,
        }}
      />

      {/* Tabs */}
      <View style={styles.tabs}>
        {(['all', 'unread'] as Tab[]).map((t) => {
          const active = tab === t;
          return (
            <Pressable
              key={t}
              onPress={() => setTab(t)}
              style={[
                styles.tab,
                {
                  backgroundColor: active ? theme.backgroundSelected : theme.backgroundElement,
                },
              ]}>
              <ThemedText type="smallBold" style={{ color: active ? theme.text : theme.textSecondary }}>
                {t === 'all' ? 'All' : 'Unread'}
              </ThemedText>
            </Pressable>
          );
        })}
      </View>

      <FlatList
        data={items}
        keyExtractor={(n) => n.id}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        onEndReached={onEndReached}
        onEndReachedThreshold={0.4}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ItemSeparatorComponent={() => (
          <View style={[styles.separator, { backgroundColor: theme.backgroundElement }]} />
        )}
        ListEmptyComponent={
          loading ? (
            <View style={styles.centered}>
              <ActivityIndicator />
            </View>
          ) : error ? (
            <View style={styles.centered}>
              <ThemedText type="default" themeColor="textSecondary">
                Couldn&apos;t load notifications.
              </ThemedText>
              <Pressable onPress={() => load(1, tab)}>
                <ThemedText type="linkPrimary">Try again</ThemedText>
              </Pressable>
            </View>
          ) : (
            <View style={styles.centered}>
              <ThemedText style={styles.emptyIcon}>🔔</ThemedText>
              <ThemedText type="subtitle" style={styles.emptyTitle}>
                {tab === 'unread' ? 'All caught up' : 'No notifications yet'}
              </ThemedText>
              <ThemedText type="small" themeColor="textSecondary" style={styles.emptyText}>
                {tab === 'unread'
                  ? 'You have no unread notifications.'
                  : "We'll let you know when something needs your attention."}
              </ThemedText>
            </View>
          )
        }
        ListFooterComponent={
          loadingMore ? (
            <View style={styles.footer}>
              <ActivityIndicator size="small" />
            </View>
          ) : null
        }
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  tabs: {
    flexDirection: 'row',
    gap: Spacing.two,
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.two,
    paddingBottom: Spacing.two,
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
  },
  tab: {
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.two,
    borderRadius: Spacing.five,
  },
  listContent: {
    flexGrow: 1,
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    paddingBottom: Spacing.six,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.three,
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.three,
  },
  pressed: { opacity: 0.7 },
  iconBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: { fontSize: 18, lineHeight: 22 },
  rowBody: { flex: 1, gap: Spacing.half },
  rowTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  title: { flexShrink: 1 },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#e5484d',
  },
  time: { marginTop: Spacing.half },
  delete: { padding: Spacing.one },
  separator: { height: StyleSheet.hairlineWidth },
  centered: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: Spacing.six,
    paddingHorizontal: Spacing.four,
    gap: Spacing.two,
  },
  emptyIcon: { fontSize: 40, lineHeight: 46 },
  emptyTitle: { fontSize: 22, lineHeight: 28 },
  emptyText: { textAlign: 'center', maxWidth: 280 },
  footer: { paddingVertical: Spacing.three },
});
