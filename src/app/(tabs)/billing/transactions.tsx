import { router, useFocusEffect } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  View,
} from 'react-native';

import {
  EmptyState,
  StaxisTag,
  StaxisButton,
  StaxisText,
} from '@/components/staxis';
import { Colors, Palette, Radius, Spacing } from '@/constants/staxis-theme';
import { fetchData } from '@/lib/api';
import { Transaction, TransactionsPage } from '@/lib/types';
import { fmtDate, fmtNaira } from '@/lib/utils';
import { ErrorModal } from '@/components/error-modal';
import { getUserFacingError } from '@/lib/user-facing-error';

const PAGE_SIZE = 20;

function statusVariant(status: string) {
  const normalized = status.toUpperCase();
  if (['PAID', 'SUCCESS', 'COMPLETED'].includes(normalized)) return 'success' as const;
  if (normalized === 'PENDING') return 'warn' as const;
  if (normalized === 'FAILED') return 'danger' as const;
  return 'neutral' as const;
}

function TxnCard({ txn }: { txn: Transaction }) {
  const pending = txn.status.toUpperCase() === 'PENDING' && !!txn.paystackRef && txn.canResume !== false;
  return (
    <Pressable style={styles.card} disabled={!pending}
      accessibilityRole={pending ? 'button' : undefined}
      accessibilityLabel={pending ? `Review pending payment: ${txn.description}, ${fmtNaira(txn.amount)}` : undefined}
      onPress={() => router.push({ pathname: '/(tabs)/billing/pending', params: { reference: txn.paystackRef! } })}>
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
      {pending && <StaxisText variant="cardAction">Review or continue payment →</StaxisText>}
      {txn.requiresReview && <StaxisText variant="bodySm">Payment received · awaiting admin review. Your newer subscription is unchanged.</StaxisText>}
    </Pressable>
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
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const loadingRef = useRef(false);
  const failedRequest = useRef({ target: 1, replace: true });

  const fetchPage = useCallback(async (target: number, replace: boolean): Promise<void> => {
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
      setErrorMessage(null);
    } catch (failure) {
      failedRequest.current = { target, replace };
      setError(true);
      setErrorMessage(getUserFacingError(failure, 'Could not load payment history. Please try again.'));
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
    if (loadingRef.current) return;
    setRefreshing(true);
    fetchPage(1, true);
  };

  const onEndReached = () => {
    if (loadingRef.current || !hasMore || loading || error) return;
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
        <ErrorModal message={errorMessage} onDismiss={() => setErrorMessage(null)} />
      </View>
    );
  }

  return (
    <>
    <ErrorModal message={errorMessage} onDismiss={() => setErrorMessage(null)} />
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
        error && items.length > 0 ? (
          <View style={styles.footer}>
            <StaxisText variant="formHint">Couldn&apos;t load more payments.</StaxisText>
            <StaxisButton label="Retry" variant="ghost" onPress={() => fetchPage(failedRequest.current.target, failedRequest.current.replace)} />
          </View>
        ) : loadingMore ? (
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
    </>
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
