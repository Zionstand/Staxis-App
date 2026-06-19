import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Badge } from '@/components/ui/badge';
import { ProgressBar } from '@/components/ui/progress-bar';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { fetchData } from '@/lib/api';
import { ApiPlan, DashboardData, Transaction } from '@/lib/types';
import { daysUntil, fmtDate, fmtNaira } from '@/lib/utils';

const STATUS_STYLES: Record<string, { bg: string; color: string }> = {
  ACTIVE: { bg: '#dcfce7', color: '#15803d' },
  TRIAL: { bg: '#fef3c7', color: '#b45309' },
  PAST_DUE: { bg: '#ffe4e6', color: '#be123c' },
  CANCELLED: { bg: '#e2e8f0', color: '#475569' },
};

const TXN_STYLES: Record<string, { bg: string; color: string }> = {
  Paid: { bg: '#dcfce7', color: '#15803d' },
  Pending: { bg: '#fef3c7', color: '#b45309' },
  Failed: { bg: '#ffe4e6', color: '#be123c' },
};

function txnStyle(status: string) {
  return TXN_STYLES[status] ?? { bg: '#f1f5f9', color: '#64748b' };
}

function PlanRow({ plan }: { plan: ApiPlan }) {
  return (
    <ThemedView type="backgroundElement" style={styles.planCard}>
      <View style={styles.row}>
        <View style={styles.planTitleWrap}>
          <ThemedText type="smallBold" numberOfLines={1}>
            {plan.name}
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
            {plan.forLabel}
          </ThemedText>
        </View>
        <ThemedText type="smallBold">{fmtNaira(plan.price)}/mo</ThemedText>
      </View>
      {!!plan.responseTime && (
        <ThemedText type="small" themeColor="textSecondary">
          ⚡ {plan.responseTime} response time
        </ThemedText>
      )}
      {plan.features?.slice(0, 4).map((f) => (
        <ThemedText key={f} type="small" themeColor="textSecondary">
          ✓ {f}
        </ThemedText>
      ))}
    </ThemedView>
  );
}

function TxnRow({ txn }: { txn: Transaction }) {
  const ts = txnStyle(txn.status);
  return (
    <View style={styles.txnRow}>
      <View style={styles.txnInfo}>
        <ThemedText type="small" numberOfLines={1}>
          {txn.description}
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {fmtDate(txn.date)}
        </ThemedText>
      </View>
      <View style={styles.txnRight}>
        <ThemedText type="smallBold">{fmtNaira(txn.amount)}</ThemedText>
        <Badge label={txn.status} bg={ts.bg} color={ts.color} />
      </View>
    </View>
  );
}

export default function BillingScreen() {
  const theme = useTheme();

  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(false);

  const load = useCallback(async () => {
    try {
      const result = await fetchData<DashboardData>('/user/dashboard');
      setData(result);
      setError(false);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const onRefresh = () => {
    setRefreshing(true);
    load();
  };

  if (loading) {
    return (
      <ThemedView style={styles.centered}>
        <ActivityIndicator />
      </ThemedView>
    );
  }

  if (error && !data) {
    return (
      <ThemedView style={styles.centered}>
        <ThemedText type="default" themeColor="textSecondary">
          Couldn&apos;t load your billing details.
        </ThemedText>
        <Pressable onPress={load}>
          <ThemedText type="linkPrimary">Try again</ThemedText>
        </Pressable>
      </ThemedView>
    );
  }

  const company = data?.company;
  const plans = company?.plans ?? [];
  const transactions = data?.transactions ?? [];
  const totalSpent = data?.totalSpent ?? 0;

  const status = company?.status ?? 'ACTIVE';
  const statusStyle = STATUS_STYLES[status] ?? STATUS_STYLES.ACTIVE;
  const paymentVerified = company?.paymentVerified ?? false;
  const isTrial = status === 'TRIAL';
  const isPastDue = status === 'PAST_DUE';
  const isRecurring = company?.subscriptionType === 'subscription';

  const subtotal = plans.reduce((sum, p) => sum + (p.price ?? 0), 0);
  const bundleDiscount = company?.bundleDiscount ?? 0;
  const total = company?.amount ?? 0;
  const setupFees = plans.reduce((sum, p) => sum + (p.setupFee ?? 0), 0);

  const nextBilling = company?.nextBilling ?? null;
  const daysToRenewal = nextBilling ? daysUntil(nextBilling) : null;
  const renewalProgress =
    nextBilling && daysToRenewal !== null
      ? Math.max(0, Math.min(100, ((30 - daysToRenewal) / 30) * 100))
      : 0;

  const trialEndsAt = company?.trialEndsAt ?? null;
  const trialDaysLeft = trialEndsAt ? daysUntil(trialEndsAt) : 0;
  const trialProgress = trialEndsAt
    ? Math.max(0, Math.min(100, ((14 - trialDaysLeft) / 14) * 100))
    : 0;

  return (
    <ScrollView
      style={styles.scrollView}
      contentContainerStyle={styles.contentContainer}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={styles.header}>
          <ThemedText type="subtitle">Billing</ThemedText>
          {company && (
            <ThemedText type="small" themeColor="textSecondary">
              {company.name}
            </ThemedText>
          )}
        </View>

        {!company ? (
          <ThemedView type="backgroundElement" style={styles.card}>
            <ThemedText type="smallBold">No subscription yet</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              Once your company is set up with a plan, your billing details will
              appear here.
            </ThemedText>
          </ThemedView>
        ) : (
          <>
            {/* Subscription status */}
            <ThemedView type="backgroundElement" style={styles.card}>
              <View style={styles.row}>
                <ThemedText type="small" themeColor="textSecondary">
                  Subscription
                </ThemedText>
                <Badge label={status} bg={statusStyle.bg} color={statusStyle.color} />
              </View>
              <View style={styles.row}>
                <ThemedText type="default">
                  {isRecurring ? 'Recurring plan' : 'One-time payment'}
                </ThemedText>
                {paymentVerified ? (
                  <Badge label="PAID" bg="#dbeafe" color="#1d4ed8" />
                ) : (
                  <Badge label="UNPAID" bg="#fef3c7" color="#b45309" />
                )}
              </View>

              {isTrial && trialEndsAt && (
                <View style={styles.section}>
                  <View style={styles.row}>
                    <ThemedText type="small" themeColor="textSecondary">
                      Trial ends {fmtDate(trialEndsAt)}
                    </ThemedText>
                    <ThemedText type="smallBold">{trialDaysLeft}d left</ThemedText>
                  </View>
                  <ProgressBar value={trialProgress} fillColor="#f59e0b" trackColor="#fde68a" />
                </View>
              )}

              {!isTrial && paymentVerified && nextBilling && daysToRenewal !== null && (
                <View style={styles.section}>
                  <View style={styles.row}>
                    <ThemedText type="small" themeColor="textSecondary">
                      {isRecurring ? 'Renews' : 'Valid until'} {fmtDate(nextBilling)}
                    </ThemedText>
                    <ThemedText type="smallBold">{daysToRenewal}d left</ThemedText>
                  </View>
                  <ProgressBar value={renewalProgress} />
                </View>
              )}

              {isPastDue && (
                <ThemedText type="small" style={styles.warnText}>
                  ⚠️ Your payment is overdue. Settle it to restore full access.
                </ThemedText>
              )}
            </ThemedView>

            {/* Plans */}
            <View style={styles.section}>
              <ThemedText type="smallBold" style={styles.sectionLabel}>
                Your plan{plans.length > 1 ? 's' : ''}
              </ThemedText>
              {plans.length > 0 ? (
                plans.map((p) => <PlanRow key={p.id} plan={p} />)
              ) : (
                <ThemedView type="backgroundElement" style={styles.card}>
                  <ThemedText type="small" themeColor="textSecondary">
                    No plan selected.
                  </ThemedText>
                </ThemedView>
              )}
            </View>

            {/* Cost breakdown */}
            <ThemedView type="backgroundElement" style={styles.card}>
              <ThemedText type="smallBold" style={styles.sectionLabel}>
                Monthly cost
              </ThemedText>
              <View style={styles.row}>
                <ThemedText type="small" themeColor="textSecondary">
                  Subtotal
                </ThemedText>
                <ThemedText type="small">{fmtNaira(subtotal)}</ThemedText>
              </View>
              {bundleDiscount > 0 && (
                <View style={styles.row}>
                  <ThemedText type="small" themeColor="textSecondary">
                    Bundle discount
                  </ThemedText>
                  <ThemedText type="small" style={styles.discount}>
                    −{fmtNaira(bundleDiscount)}
                  </ThemedText>
                </View>
              )}
              <View style={[styles.row, styles.totalRow]}>
                <ThemedText type="smallBold">Total per month</ThemedText>
                <ThemedText type="smallBold">{fmtNaira(total)}</ThemedText>
              </View>
              {setupFees > 0 && (
                <ThemedText type="small" themeColor="textSecondary">
                  + {fmtNaira(setupFees)} one-time setup fee
                </ThemedText>
              )}
            </ThemedView>

            {/* Billing history */}
            <View style={styles.section}>
              <View style={styles.row}>
                <ThemedText type="smallBold" style={styles.sectionLabel}>
                  Recent payments
                </ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  {fmtNaira(totalSpent)} lifetime
                </ThemedText>
              </View>
              <ThemedView type="backgroundElement" style={styles.card}>
                {transactions.length > 0 ? (
                  transactions.map((t, i) => (
                    <View key={t.id}>
                      {i > 0 && (
                        <View
                          style={[styles.divider, { backgroundColor: theme.backgroundSelected }]}
                        />
                      )}
                      <TxnRow txn={t} />
                    </View>
                  ))
                ) : (
                  <ThemedText type="small" themeColor="textSecondary">
                    No payments yet.
                  </ThemedText>
                )}
              </ThemedView>
            </View>

            <ThemedText type="small" themeColor="textSecondary" style={styles.footnote}>
              To change your plan or update payment details, visit the Care+ web
              dashboard or reach out via Support.
            </ThemedText>
          </>
        )}
      </SafeAreaView>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    flexGrow: 1,
    flexDirection: 'row',
    justifyContent: 'center',
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
  },
  safeArea: {
    flex: 1,
    width: '100%',
    maxWidth: MaxContentWidth,
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.three,
    paddingBottom: BottomTabInset + Spacing.three,
    gap: Spacing.three,
  },
  header: {
    gap: Spacing.one,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  card: {
    borderRadius: Spacing.three,
    padding: Spacing.three,
    gap: Spacing.two,
  },
  planCard: {
    borderRadius: Spacing.three,
    padding: Spacing.three,
    gap: Spacing.one,
  },
  planTitleWrap: {
    flexShrink: 1,
    gap: Spacing.half,
  },
  section: {
    gap: Spacing.two,
  },
  sectionLabel: {
    marginBottom: Spacing.half,
  },
  totalRow: {
    marginTop: Spacing.one,
  },
  discount: {
    color: '#15803d',
  },
  warnText: {
    color: '#be123c',
  },
  txnRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
    paddingVertical: Spacing.one,
  },
  txnInfo: {
    flexShrink: 1,
    gap: Spacing.half,
  },
  txnRight: {
    alignItems: 'flex-end',
    gap: Spacing.half,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginVertical: Spacing.one,
  },
  footnote: {
    marginTop: Spacing.one,
    textAlign: 'center',
  },
});
