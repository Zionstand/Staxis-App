import { useFocusEffect } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  View,
} from 'react-native';

import {
  EmptyState,
  StaxisTag,
  StaxisText,
} from '@/components/staxis';
import { Colors, Palette, Radius, Spacing } from '@/constants/staxis-theme';
import { fetchData } from '@/lib/api';
import { Transaction, TransactionsPage } from '@/lib/types';
import { fmtDate, fmtNaira } from '@/lib/utils';

const PAGE_SIZE = 20;

function statusVariant(status: string) {
  if (status === 'SUCCESS' || status === 'COMPLETED') return 'success' as const;
  if (status === 'PENDING') return 'warn' as const;
  if (status === 'FAILED') return 'danger' as const;
  return 'neutral' as const;
}

function TxnCard({ txn }: { txn: Transaction }) {
  return (
    <View style={styles.card}>
      <View style={styles.txnTop}>
        <StaxisText variant="listTitle" style={{ flex: 1 }} numberOfLines={1}>
          {txn.description}
        </StaxisText>
        <StaxisText variant="listTitle">{fmtNaira(txn.amount)}</StaxisText>
      </View>
      <View style={styles.txnBottom}>
        <StaxisText variant="listTime">{fmtDate(txn.date)}</StaxisText>
        <StaxisTag variant={statusVariant(txn.status)} label={txn.status} />
      </View>
    </View>
  );
}

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
      <View style={styles.centered}>
        <ActivityIndicator color={Palette.signal} />
      </View>
    );
  }

  if (error && items.length === 0) {
    return (
      <View style={styles.centered}>
        <EmptyState
          title="Couldn't load transactions"
          message="Check your connection and try again."
          action={{ label: 'Retry', onPress: () => fetchPage(1, true) }}
        />
      </View>
    );
  }

  return (
    <FlatList
      data={items}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => <TxnCard txn={item} />}
      style={styles.list}
      contentContainerStyle={styles.listContent}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
      onEndReached={onEndReached}
      onEndReachedThreshold={0.4}
      ListFooterComponent={
        loadingMore ? (
          <View style={styles.footer}>
            <ActivityIndicator size="small" color={Palette.signal} />
          </View>
        ) : !hasMore && items.length > 0 ? (
          <StaxisText variant="formHint" style={styles.footerText}>
            That&apos;s everything.
          </StaxisText>
        ) : null
      }
      ListEmptyComponent={
        <EmptyState
          title="No payments yet"
          message="Your transaction history will appear here."
        />
      }
    />
  );
}

const styles = StyleSheet.create({
  list: { flex: 1, backgroundColor: Colors.bgApp },
  listContent: {
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.lg,
    gap: Spacing.md,
    flexGrow: 1,
  },
  centered: {
    flex: 1,
    backgroundColor: Colors.bgApp,
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    backgroundColor: Colors.bgCard,
    borderWidth: 1,
    borderColor: Colors.line,
    borderRadius: Radius.md,
    padding: Spacing.lg,
    gap: Spacing.sm,
  },
  txnTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.md,
  },
  txnBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  footer: { paddingVertical: Spacing.lg },
  footerText: { textAlign: 'center', paddingVertical: Spacing.lg },
});
