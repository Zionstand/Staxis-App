import { useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { isPaystackAvailable, PaystackHost, usePaystack } from '@/components/paystack';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Badge } from '@/components/ui/badge';
import {
  StatusModal,
  type StatusAction,
  type StatusVariant,
} from '@/components/ui/status-modal';
import { BottomTabInset, BrandPrimary, MaxContentWidth, Spacing } from '@/constants/theme';
import { fetchData, postData } from '@/lib/api';
import {
  generateOndemandRef,
  ORDER_STATUS,
  type ServiceOrder,
} from '@/lib/ondemand';
import { fmtDateTime, fmtNaira } from '@/lib/utils';
import { useAuth } from '@/store/use-auth';

export default function OrderDetailScreen() {
  return (
    <PaystackHost>
      <OrderDetailInner />
    </PaystackHost>
  );
}

function OrderDetailInner() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const user = useAuth((s) => s.user);
  const { popup } = usePaystack();

  const [order, setOrder] = useState<ServiceOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [ref, setRef] = useState(generateOndemandRef);
  const [result, setResult] = useState<{
    variant: StatusVariant;
    title: string;
    message?: string;
    actions: StatusAction[];
  } | null>(null);

  const closeResult = () => setResult(null);
  const showError = (title: string, message?: string) =>
    setResult({ variant: 'error', title, message, actions: [{ label: 'OK', onPress: closeResult }] });

  const load = useCallback(async () => {
    try {
      const data = await fetchData<ServiceOrder>(`/services/orders/${id}`);
      setOrder(data);
    } catch {
      setOrder(null);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const verify = async (reference: string) => {
    try {
      const data = await postData<ServiceOrder>(`/services/orders/${id}/pay`, { reference });
      setOrder(data);
      setResult({
        variant: 'success',
        title: 'Payment confirmed',
        message: "We've got it and we'll get started.",
        actions: [{ label: 'Done', onPress: closeResult }],
      });
    } catch (e: any) {
      showError(
        'Verification failed',
        e?.response?.data?.message ??
          'We could not confirm the payment. If you were charged, contact support.',
      );
    } finally {
      setPaying(false);
    }
  };

  const pay = () => {
    if (!order) return;
    if (!isPaystackAvailable) {
      showError('Use the mobile app', 'Payments are available in the Staxis mobile app.');
      return;
    }
    if (!user?.email) {
      showError('Missing email', 'Your account has no email on file to bill.');
      return;
    }
    setPaying(true);
    popup.checkout({
      email: user.email,
      amount: order.total,
      reference: ref,
      metadata: { orderId: order.id, kind: 'on_demand_order' },
      onSuccess: (res: any) => verify(res?.reference ?? ref),
      onCancel: () => setPaying(false),
      onError: (err: any) => {
        setPaying(false);
        setRef(generateOndemandRef());
        showError('Payment error', err?.message ?? 'Something went wrong. Please try again.');
      },
    });
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator />
      </View>
    );
  }

  if (!order) {
    return (
      <View style={styles.centered}>
        <ThemedText type="default" themeColor="textSecondary">
          We couldn&apos;t load this order.
        </ThemedText>
      </View>
    );
  }

  const st = ORDER_STATUS[order.status];
  const unpaid = order.status === 'PENDING_PAYMENT';

  return (
    <>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        <View style={styles.inner}>
          <View style={styles.header}>
            <View style={styles.headerTop}>
              <ThemedText type="subtitle">Order #{order.orderNumber}</ThemedText>
              <Badge label={st.label} bg={st.bg} color={st.color} />
            </View>
            <ThemedText type="small" themeColor="textSecondary">
              Placed {fmtDateTime(order.createdAt)}
              {order.paidAt ? ` · Paid ${fmtDateTime(order.paidAt)}` : ''}
            </ThemedText>
          </View>

          {/* Items */}
          <ThemedView type="backgroundElement" style={styles.card}>
            <ThemedText type="smallBold">What you ordered</ThemedText>
            {order.items.map((item) => (
              <View key={item.id} style={styles.line}>
                <ThemedText type="small" style={styles.lineName} numberOfLines={2}>
                  {item.name}
                  {item.quantity > 1 ? ` × ${item.quantity}` : ''}
                </ThemedText>
                <ThemedText type="small">{fmtNaira(item.lineTotal)}</ThemedText>
              </View>
            ))}
            <View style={styles.totalRow}>
              <ThemedText type="smallBold">{unpaid ? 'Due' : 'Paid'}</ThemedText>
              <ThemedText type="smallBold">{fmtNaira(order.total)}</ThemedText>
            </View>

            {unpaid ? (
              <>
                <Pressable
                  onPress={pay}
                  disabled={paying}
                  style={[styles.payBtn, paying && styles.disabled]}>
                  {paying ? (
                    <ActivityIndicator color="#ffffff" />
                  ) : (
                    <ThemedText type="smallBold" style={styles.payText}>
                      Pay {fmtNaira(order.total)}
                    </ThemedText>
                  )}
                </Pressable>
                <ThemedText type="small" themeColor="textSecondary">
                  This order isn&apos;t paid yet, so nothing has started. Secured by Paystack.
                </ThemedText>
              </>
            ) : (
              <ThemedText type="small" themeColor="textSecondary">
                Paid — your receipt is in your inbox and on the billing page. We&apos;re on it.
              </ThemedText>
            )}
          </ThemedView>

          {/* Timeline */}
          {order.events.length > 0 && (
            <ThemedView type="backgroundElement" style={styles.card}>
              <ThemedText type="smallBold">Progress</ThemedText>
              {order.events.map((ev) => (
                <View key={ev.id} style={styles.event}>
                  <ThemedText type="small">{ORDER_STATUS[ev.status]?.label ?? ev.status}</ThemedText>
                  <ThemedText type="small" themeColor="textSecondary">
                    {fmtDateTime(ev.createdAt)}
                    {ev.note ? ` · ${ev.note}` : ''}
                  </ThemedText>
                </View>
              ))}
            </ThemedView>
          )}
        </View>
      </ScrollView>

      {result && (
        <StatusModal
          visible
          variant={result.variant}
          title={result.title}
          message={result.message}
          actions={result.actions}
          onRequestClose={closeResult}
        />
      )}
    </>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  content: { flexDirection: 'row', justifyContent: 'center' },
  inner: {
    flex: 1,
    width: '100%',
    maxWidth: MaxContentWidth,
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.three,
    paddingBottom: BottomTabInset + Spacing.four,
    gap: Spacing.three,
  },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.two },
  header: { gap: Spacing.one },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  card: { borderRadius: Spacing.three, padding: Spacing.three, gap: Spacing.two },
  line: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.two },
  lineName: { flex: 1 },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: Spacing.one,
  },
  payBtn: {
    height: 48,
    borderRadius: 12,
    backgroundColor: BrandPrimary,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.one,
  },
  payText: { color: '#ffffff' },
  disabled: { opacity: 0.5 },
  event: { gap: Spacing.half },
});
