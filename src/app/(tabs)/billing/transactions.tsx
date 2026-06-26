import { useFocusEffect } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  View,
} from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { TxnRow } from '@/components/ui/txn-row';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { fetchData } from '@/lib/api';
import { Transaction, TransactionsPage } from '@/lib/types';

const PAGE_SIZE = 20;

export default function TransactionsScreen() {
  const [items, setItems] = useState<Transaction[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(false);
  const loadingRef = useRef(false);

  const fetchPage = useCallback(async (target: number, replace: boolean) => {
    if (loadingRef.current) return;
    loadingRef.current = true;
    try {
      const res = await fetchData<TransactionsPage>(
        `/user/transactions?page=${target}&limit=${PAGE_SIZE}`,
      );
      setItems((prev) =>
        replace ? res.transactions : [...prev, ...res.transactions],
      );
      setPage(res.page);
      setHasMore(res.hasMore);
      setError(false);
    } catch {
      setError(true);
    } finally {
      loadingRef.current = false;
      setLoading(false);
      setLoadingMore(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchPage(1, true);
    }, [fetchPage]),
  );

  const onRefresh = () => {
    setRefreshing(true);
    setHasMore(true);
    fetchPage(1, true);
  };

  const onEndReached = () => {
    if (loadingRef.current || !hasMore || loading) return;
    setLoadingMore(true);
    fetchPage(page + 1, false);
  };

  if (loading && items.length === 0) {
    return (
      <ThemedView style={styles.centered}>
        <ActivityIndicator />
      </ThemedView>
    );
  }

  if (error && items.length === 0) {
    return (
      <ThemedView style={styles.centered}>
        <ThemedText type="default" themeColor="textSecondary">
          Couldn&apos;t load your transactions.
        </ThemedText>
        <Pressable onPress={() => fetchPage(1, true)}>
          <ThemedText type="linkPrimary">Try again</ThemedText>
        </Pressable>
      </ThemedView>
    );
  }

  return (
    <FlatList
      data={items}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => (
        <ThemedView type="backgroundElement" style={styles.card}>
          <TxnRow txn={item} />
        </ThemedView>
      )}
      style={styles.list}
      contentContainerStyle={styles.listContent}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      onEndReached={onEndReached}
      onEndReachedThreshold={0.4}
      ListFooterComponent={
        loadingMore ? (
          <View style={styles.footer}>
            <ActivityIndicator size="small" />
          </View>
        ) : !hasMore && items.length > 0 ? (
          <ThemedText type="small" themeColor="textSecondary" style={styles.footerText}>
            That&apos;s everything.
          </ThemedText>
        ) : null
      }
      ListEmptyComponent={
        <View style={styles.centered}>
          <ThemedText type="small" themeColor="textSecondary">
            No payments yet.
          </ThemedText>
        </View>
      }
    />
  );
}

const styles = StyleSheet.create({
  list: {
    flex: 1,
  },
  listContent: {
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.three,
    gap: Spacing.two,
    flexGrow: 1,
  },
  card: {
    borderRadius: Spacing.three,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    paddingTop: Spacing.six,
  },
  footer: {
    paddingVertical: Spacing.three,
  },
  footerText: {
    textAlign: 'center',
    paddingVertical: Spacing.three,
  },
});
