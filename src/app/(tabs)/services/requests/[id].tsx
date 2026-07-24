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
  REQUEST_STATUS,
  type ServiceRequest,
} from '@/lib/ondemand';
import { fmtDateTime, fmtNaira } from '@/lib/utils';
import { useAuth } from '@/store/use-auth';

export default function RequestDetailScreen() {
  return (
    <PaystackHost>
      <RequestDetailInner />
    </PaystackHost>
  );
}

function RequestDetailInner() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const user = useAuth((s) => s.user);
  const { popup } = usePaystack();

  const [request, setRequest] = useState<ServiceRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [approving, setApproving] = useState(false);
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
      const data = await fetchData<ServiceRequest>(`/services/requests/${id}`);
      setRequest(data);
    } catch {
      setRequest(null);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const approve = async () => {
    setApproving(true);
    try {
      const data = await postData<ServiceRequest>(`/services/requests/${id}/approve`, {});
      setRequest(data);
      setResult({
        variant: 'success',
        title: 'Quote approved',
        message: "We'll send your invoice shortly — you can pay it right here.",
        actions: [{ label: 'OK', onPress: closeResult }],
      });
    } catch (e: any) {
      showError('Could not approve', e?.response?.data?.message ?? 'Please try again.');
    } finally {
      setApproving(false);
    }
  };

  const verify = async (reference: string) => {
    try {
      const data = await postData<ServiceRequest>(`/services/requests/${id}/pay`, { reference });
      setRequest(data);
      setResult({
        variant: 'success',
        title: 'Payment confirmed',
        message: "We're starting work. Thank you!",
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
    const due = request?.quotedAmount ?? 0;
    if (due <= 0) return;
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
      amount: due,
      reference: ref,
      metadata: { requestId: id, kind: 'on_demand_request' },
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

  if (!request) {
    return (
      <View style={styles.centered}>
        <ThemedText type="default" themeColor="textSecondary">
          We couldn&apos;t load this request.
        </ThemedText>
      </View>
    );
  }

  const st = REQUEST_STATUS[request.status];
  const hasQuote = request.items.length > 0 && request.quotedAmount != null;
  const due = request.quotedAmount ?? 0;

  return (
    <>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        <View style={styles.inner}>
          <View style={styles.header}>
            <View style={styles.headerTop}>
              <ThemedText type="subtitle">Request #{request.requestNumber}</ThemedText>
              <Badge label={st.label} bg={st.bg} color={st.color} />
            </View>
            <ThemedText type="small" themeColor="textSecondary">
              Submitted {fmtDateTime(request.createdAt)}
              {request.afterHours ? ' · After-hours' : ''}
            </ThemedText>
          </View>

          {/* Summary */}
          <ThemedView type="backgroundElement" style={styles.card}>
            <ThemedText type="smallBold">What you asked for</ThemedText>
            <ThemedText type="small">{request.summary}</ThemedText>
            {!!request.details && (
              <ThemedText type="small" themeColor="textSecondary">
                {request.details}
              </ThemedText>
            )}
          </ThemedView>

          {/* Quote */}
          {hasQuote && (
            <ThemedView type="backgroundElement" style={styles.card}>
              <ThemedText type="smallBold">Your quote</ThemedText>
              {!!request.scopeNotes && (
                <ThemedText type="small" themeColor="textSecondary">
                  {request.scopeNotes}
                </ThemedText>
              )}
              {request.items.map((item) => (
                <View key={item.id} style={styles.line}>
                  <ThemedText type="small" style={styles.lineName} numberOfLines={2}>
                    {item.name}
                    {item.quantity > 1 ? ` × ${item.quantity}` : ''}
                  </ThemedText>
                  <ThemedText type="small">{fmtNaira(item.lineTotal)}</ThemedText>
                </View>
              ))}
              <View style={styles.totalRow}>
                <ThemedText type="smallBold">Total</ThemedText>
                <ThemedText type="smallBold">{fmtNaira(due)}</ThemedText>
              </View>

              {request.status === 'QUOTED' && (
                <Pressable
                  onPress={approve}
                  disabled={approving}
                  style={[styles.primaryBtn, approving && styles.disabled]}>
                  {approving ? (
                    <ActivityIndicator color="#ffffff" />
                  ) : (
                    <ThemedText type="smallBold" style={styles.primaryText}>
                      Approve quote
                    </ThemedText>
                  )}
                </Pressable>
              )}
              {request.status === 'APPROVED' && (
                <ThemedText type="small" themeColor="textSecondary">
                  Quote approved — your invoice is on the way. You&apos;ll be able to pay it here.
                </ThemedText>
              )}
              {request.status === 'INVOICED' && (
                <>
                  <Pressable
                    onPress={pay}
                    disabled={paying}
                    style={[styles.primaryBtn, paying && styles.disabled]}>
                    {paying ? (
                      <ActivityIndicator color="#ffffff" />
                    ) : (
                      <ThemedText type="smallBold" style={styles.primaryText}>
                        Pay {fmtNaira(due)}
                      </ThemedText>
                    )}
                  </Pressable>
                  <ThemedText type="small" themeColor="textSecondary">
                    Secured by Paystack. Work starts as soon as payment clears.
                  </ThemedText>
                </>
              )}
              {request.status === 'PAID' && (
                <ThemedText type="small" themeColor="textSecondary">
                  Paid — your receipt is in your inbox and on the billing page. We&apos;re on it.
                </ThemedText>
              )}
            </ThemedView>
          )}

          {!hasQuote && request.status === 'REQUESTED' && (
            <ThemedView type="backgroundElement" style={styles.card}>
              <ThemedText type="smallBold">We&apos;ve got it.</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                We&apos;re confirming the scope and will send a quote shortly.
              </ThemedText>
            </ThemedView>
          )}

          {/* Timeline */}
          {request.events.length > 0 && (
            <ThemedView type="backgroundElement" style={styles.card}>
              <ThemedText type="smallBold">History</ThemedText>
              {request.events.map((ev) => (
                <View key={ev.id} style={styles.event}>
                  <ThemedText type="small">
                    {REQUEST_STATUS[ev.status]?.label ?? ev.status}
                  </ThemedText>
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
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: Spacing.one },
  primaryBtn: {
    height: 48,
    borderRadius: 12,
    backgroundColor: BrandPrimary,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.one,
  },
  primaryText: { color: '#ffffff' },
  disabled: { opacity: 0.5 },
  event: { gap: Spacing.half },
});
