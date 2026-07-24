import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';

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
import { useTheme } from '@/hooks/use-theme';
import { fetchData, postData } from '@/lib/api';
import {
  generateOndemandRef,
  ORDER_STATUS,
  REQUEST_STATUS,
  type ServiceCategory,
  type ServiceOrder,
  type ServiceRequest,
} from '@/lib/ondemand';
import { fmtNaira } from '@/lib/utils';
import { useAuth } from '@/store/use-auth';

export default function ServicesScreen() {
  return (
    <PaystackHost>
      <ServicesInner />
    </PaystackHost>
  );
}

function ServicesInner() {
  const theme = useTheme();
  const user = useAuth((s) => s.user);
  const { popup } = usePaystack();

  const [catalogue, setCatalogue] = useState<ServiceCategory[]>([]);
  const [orders, setOrders] = useState<ServiceOrder[]>([]);
  const [requests, setRequests] = useState<ServiceRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // taskId → quantity
  const [cart, setCart] = useState<Record<string, number>>({});
  const [placing, setPlacing] = useState(false);
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
      const [cat, ord, reqs] = await Promise.all([
        fetchData<ServiceCategory[]>('/services/catalogue'),
        fetchData<ServiceOrder[]>('/services/orders'),
        fetchData<ServiceRequest[]>('/services/requests'),
      ]);
      setCatalogue(cat);
      setOrders(ord);
      setRequests(reqs);
      setError(false);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const onRefresh = () => {
    setRefreshing(true);
    load();
  };

  // Flat lookup of buyable (fixed-price) tasks for the cart maths.
  const taskById = useMemo(() => {
    const m = new Map<string, { name: string; price: number }>();
    for (const cat of catalogue)
      for (const t of cat.tasks)
        if (t.pricingType === 'FIXED' && (t.fixedPrice ?? 0) > 0)
          m.set(t.id, { name: t.name, price: t.fixedPrice ?? 0 });
    return m;
  }, [catalogue]);

  const cartLines = useMemo(
    () =>
      Object.entries(cart)
        .map(([id, qty]) => {
          const t = taskById.get(id);
          return t ? { id, name: t.name, qty, lineTotal: t.price * qty } : null;
        })
        .filter(Boolean) as { id: string; name: string; qty: number; lineTotal: number }[],
    [cart, taskById],
  );
  const cartTotal = cartLines.reduce((s, l) => s + l.lineTotal, 0);

  const add = (id: string) => setCart((c) => ({ ...c, [id]: (c[id] ?? 0) + 1 }));
  const setQty = (id: string, qty: number) =>
    setCart((c) => {
      if (qty <= 0) {
        const next = { ...c };
        delete next[id];
        return next;
      }
      return { ...c, [id]: qty };
    });

  const verify = async (orderId: string, reference: string) => {
    try {
      await postData(`/services/orders/${orderId}/pay`, { reference });
      setCart({});
      setRef(generateOndemandRef());
      load();
      setResult({
        variant: 'success',
        title: 'Payment confirmed',
        message: "We've got it and we'll get started. You can follow progress on your order.",
        actions: [
          { label: 'View order', onPress: () => { closeResult(); router.push(`/(tabs)/services/orders/${orderId}`); } },
          { label: 'Done', onPress: closeResult },
        ],
      });
    } catch (e: any) {
      showError(
        'Verification failed',
        e?.response?.data?.message ??
          'We could not confirm the payment. If you were charged, contact support.',
      );
    } finally {
      setPlacing(false);
    }
  };

  const checkout = async () => {
    if (cartLines.length === 0) return;
    if (!isPaystackAvailable) {
      showError('Use the mobile app', 'Payments are available in the Staxis mobile app.');
      return;
    }
    if (!user?.email) {
      showError('Missing email', 'Your account has no email on file to bill.');
      return;
    }
    setPlacing(true);
    try {
      const order = await postData<ServiceOrder>('/services/orders', {
        items: cartLines.map((l) => ({ taskId: l.id, quantity: l.qty })),
      });
      popup.checkout({
        email: user.email,
        amount: cartTotal, // naira — the library converts to kobo
        reference: ref,
        metadata: { orderId: order.id, kind: 'on_demand_order' },
        onSuccess: (res: any) => verify(order.id, res?.reference ?? ref),
        onCancel: () => setPlacing(false),
        onError: (err: any) => {
          setPlacing(false);
          showError('Payment error', err?.message ?? 'Something went wrong. Please try again.');
        },
      });
    } catch (e: any) {
      setPlacing(false);
      showError('Could not start checkout', e?.response?.data?.message ?? 'Please try again.');
    }
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centered}>
        <ThemedText type="default" themeColor="textSecondary">
          Couldn&apos;t load services.
        </ThemedText>
        <Pressable onPress={load}>
          <ThemedText type="linkPrimary">Try again</ThemedText>
        </Pressable>
      </View>
    );
  }

  const buyableCats = catalogue.filter((c) =>
    c.tasks.some((t) => t.pricingType === 'FIXED' && (t.fixedPrice ?? 0) > 0),
  );

  return (
    <>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
        <View style={styles.inner}>
          {/* Intro */}
          <View style={styles.header}>
            <ThemedText type="subtitle">On-Demand Services</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              Buy a fixed-price service and pay right away, or request a quote for custom work.
            </ThemedText>
          </View>

          <Pressable
            onPress={() => router.push('/(tabs)/services/new')}
            style={({ pressed }) => [styles.quoteBtn, pressed && styles.pressed]}>
            <Ionicons name="document-text-outline" size={18} color={BrandPrimary} />
            <ThemedText type="smallBold" themeColor="primary">
              Request a quote for custom work
            </ThemedText>
          </Pressable>

          {/* Cart */}
          {cartLines.length > 0 && (
            <ThemedView type="backgroundElement" style={styles.card}>
              <ThemedText type="smallBold">Your cart</ThemedText>
              {cartLines.map((l) => (
                <View key={l.id} style={styles.cartRow}>
                  <ThemedText type="small" style={styles.cartName} numberOfLines={2}>
                    {l.name}
                  </ThemedText>
                  <View style={styles.qty}>
                    <Pressable onPress={() => setQty(l.id, l.qty - 1)} hitSlop={8} style={styles.qtyBtn}>
                      <Ionicons name="remove" size={16} color={theme.text} />
                    </Pressable>
                    <ThemedText type="small">{l.qty}</ThemedText>
                    <Pressable onPress={() => setQty(l.id, l.qty + 1)} hitSlop={8} style={styles.qtyBtn}>
                      <Ionicons name="add" size={16} color={theme.text} />
                    </Pressable>
                  </View>
                  <ThemedText type="small" style={styles.cartAmt}>
                    {fmtNaira(l.lineTotal)}
                  </ThemedText>
                </View>
              ))}
              <View style={styles.totalRow}>
                <ThemedText type="smallBold">Total</ThemedText>
                <ThemedText type="smallBold">{fmtNaira(cartTotal)}</ThemedText>
              </View>
              <Pressable
                onPress={checkout}
                disabled={placing}
                style={[styles.payBtn, placing && styles.disabled]}>
                {placing ? (
                  <ActivityIndicator color="#ffffff" />
                ) : (
                  <ThemedText type="smallBold" style={styles.payText}>
                    Pay {fmtNaira(cartTotal)}
                  </ThemedText>
                )}
              </Pressable>
            </ThemedView>
          )}

          {/* Your orders */}
          {orders.length > 0 && (
            <View style={styles.section}>
              <ThemedText type="smallBold">Your orders</ThemedText>
              {orders.map((o) => {
                const st = ORDER_STATUS[o.status];
                return (
                  <Pressable
                    key={o.id}
                    onPress={() => router.push(`/(tabs)/services/orders/${o.id}`)}
                    style={({ pressed }) => pressed && styles.pressed}>
                    <ThemedView type="backgroundElement" style={styles.rowCard}>
                      <View style={styles.rowTop}>
                        <ThemedText type="small" themeColor="textSecondary">
                          #{o.orderNumber}
                        </ThemedText>
                        <Badge label={st.label} bg={st.bg} color={st.color} />
                      </View>
                      <ThemedText type="small" numberOfLines={2}>
                        {o.items.map((i) => i.name).join(', ')}
                      </ThemedText>
                      <ThemedText type="smallBold">{fmtNaira(o.total)}</ThemedText>
                    </ThemedView>
                  </Pressable>
                );
              })}
            </View>
          )}

          {/* Your quote requests */}
          {requests.length > 0 && (
            <View style={styles.section}>
              <ThemedText type="smallBold">Your quote requests</ThemedText>
              {requests.map((r) => {
                const st = REQUEST_STATUS[r.status];
                return (
                  <Pressable
                    key={r.id}
                    onPress={() => router.push(`/(tabs)/services/requests/${r.id}`)}
                    style={({ pressed }) => pressed && styles.pressed}>
                    <ThemedView type="backgroundElement" style={styles.rowCard}>
                      <View style={styles.rowTop}>
                        <ThemedText type="small" themeColor="textSecondary">
                          #{r.requestNumber}
                        </ThemedText>
                        <Badge label={st.label} bg={st.bg} color={st.color} />
                      </View>
                      <ThemedText type="small" numberOfLines={2}>
                        {r.summary}
                      </ThemedText>
                      {r.quotedAmount != null && (
                        <ThemedText type="smallBold">{fmtNaira(r.quotedAmount)}</ThemedText>
                      )}
                    </ThemedView>
                  </Pressable>
                );
              })}
            </View>
          )}

          {/* Browse catalogue */}
          <View style={styles.section}>
            <ThemedText type="smallBold">Browse services</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              Fixed-price work you can pay for now. Anything bigger —{' '}
              <ThemedText type="small" themeColor="primary" onPress={() => router.push('/(tabs)/services/new')}>
                request a quote
              </ThemedText>
              .
            </ThemedText>

            {buyableCats.map((cat) => (
              <View key={cat.id} style={styles.catBlock}>
                <ThemedText type="small" themeColor="textSecondary" style={styles.catName}>
                  {cat.name}
                </ThemedText>
                {cat.tasks
                  .filter((t) => t.pricingType === 'FIXED' && (t.fixedPrice ?? 0) > 0)
                  .map((t) => {
                    const inCart = cart[t.id] ?? 0;
                    return (
                      <ThemedView key={t.id} type="backgroundElement" style={styles.taskRow}>
                        <View style={styles.taskInfo}>
                          <ThemedText type="small" numberOfLines={2}>
                            {t.name}
                            {t.unit ? ` (${t.unit})` : ''}
                          </ThemedText>
                          <ThemedText type="smallBold">{fmtNaira(t.fixedPrice ?? 0)}</ThemedText>
                        </View>
                        <Pressable
                          onPress={() => add(t.id)}
                          style={({ pressed }) => [styles.addBtn, pressed && styles.pressed]}>
                          <Ionicons name="add" size={16} color="#ffffff" />
                          <ThemedText type="small" style={styles.addText}>
                            {inCart > 0 ? `Added (${inCart})` : 'Add'}
                          </ThemedText>
                        </Pressable>
                      </ThemedView>
                    );
                  })}
              </View>
            ))}
          </View>
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
  quoteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: BrandPrimary,
  },
  card: { borderRadius: Spacing.three, padding: Spacing.three, gap: Spacing.two },
  cartRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  cartName: { flex: 1 },
  qty: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  qtyBtn: {
    width: 26,
    height: 26,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(127,127,127,0.15)',
  },
  cartAmt: { minWidth: 72, textAlign: 'right' },
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
  section: { gap: Spacing.two },
  rowCard: { borderRadius: Spacing.three, padding: Spacing.three, gap: Spacing.one },
  rowTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  catBlock: { gap: Spacing.two, marginTop: Spacing.two },
  catName: { textTransform: 'uppercase', letterSpacing: 0.5 },
  taskRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    borderRadius: Spacing.three,
    padding: Spacing.three,
  },
  taskInfo: { flex: 1, gap: Spacing.half },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.half,
    height: 36,
    paddingHorizontal: Spacing.three,
    borderRadius: 10,
    backgroundColor: BrandPrimary,
  },
  addText: { color: '#ffffff' },
  pressed: { opacity: 0.7 },
});
