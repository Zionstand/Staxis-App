import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  Banner,
  EmptyState,
  MetricCard,
  PageHeader,
  ProgressBar,
  SectionLabel,
  StaxisCard,
  StaxisTag,
  StaxisText,
} from '@/components/staxis';
import { Colors, Palette, Radius, Spacing } from '@/constants/staxis-theme';
import { fetchData } from '@/lib/api';
import { ApiPlan, DashboardData } from '@/lib/types';
import { daysUntil, fmtDate, fmtNaira } from '@/lib/utils';

function PlanRow({ plan }: { plan: ApiPlan }) {
  return (
    <View style={styles.planCard}>
      <View style={styles.row}>
        <View style={{ flex: 1 }}>
          <StaxisText variant="listTitle" numberOfLines={1}>
            {plan.name}
          </StaxisText>
          <StaxisText variant="listSub" numberOfLines={1}>
            {plan.forLabel}
          </StaxisText>
        </View>
        <StaxisText variant="metricLabel">
          {fmtNaira(plan.price)}/mo
        </StaxisText>
      </View>
      {!!plan.responseTime && (
        <StaxisText variant="listSub">
          {plan.responseTime} response time
        </StaxisText>
      )}
    </View>
  );
}

export default function BillingScreen() {
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

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const onRefresh = () => {
    setRefreshing(true);
    load();
  };

  if (loading && !data) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={Palette.signal} />
      </View>
    );
  }

  if (error && !data) {
    return (
      <View style={styles.centered}>
        <EmptyState
          title="Couldn't load billing"
          message="Pull down to try again."
          action={{ label: 'Retry', onPress: load }}
        />
      </View>
    );
  }

  const company = data?.company;
  const plans = company?.plans ?? [];
  const transactions = data?.transactions ?? [];
  const totalSpent = data?.totalSpent ?? 0;

  const status = company?.status ?? 'ACTIVE';
  const paymentVerified = company?.paymentVerified ?? false;
  const isTrial = status === 'TRIAL';
  const isPastDue = status === 'PAST_DUE';

  const subtotal = plans.reduce((sum, p) => sum + (p.price ?? 0), 0);
  const bundleDiscount = company?.bundleDiscount ?? 0;
  const total = company?.amount ?? 0;

  const nextBilling = company?.nextBilling ?? null;
  const daysToRenewal = nextBilling ? daysUntil(nextBilling) : null;

  const trialEndsAt = company?.trialEndsAt ?? null;
  const trialDaysLeft = trialEndsAt ? daysUntil(trialEndsAt) : 0;
  const trialProgress = trialEndsAt
    ? Math.max(0, Math.min(1, (14 - trialDaysLeft) / 14))
    : 0;

  const renewalProgress =
    nextBilling && daysToRenewal !== null
      ? Math.max(0, Math.min(1, (30 - daysToRenewal) / 30))
      : 0;

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      <SafeAreaView edges={['top']} style={styles.safe}>
        <PageHeader title="Billing" subtitle={company?.name} />

        {!company ? (
          <EmptyState
            title="No subscription yet"
            message="Once your company is set up with a plan, billing details will appear here."
          />
        ) : (
          <>
            {/* ── Banners ── */}
            {isPastDue && (
              <Banner
                variant="danger"
                title="Payment overdue"
                message="Settle your balance to restore full access."
                action="Pay now"
                onAction={() => {/* TODO: payment flow */}}
              />
            )}

            {isTrial && trialEndsAt && (
              <Banner
                variant="warn"
                title={`Trial — ${trialDaysLeft} day${trialDaysLeft !== 1 ? 's' : ''} left`}
                message={`Expires ${fmtDate(trialEndsAt)}.`}
                action="Upgrade"
                onAction={() => {/* TODO: upgrade flow */}}
              />
            )}

            {/* ── Status + Spend overview ── */}
            <View style={styles.metricRow}>
              <MetricCard
                label="Monthly Cost"
                value={total > 0 ? `${fmtNaira(total)}/mo` : '—'}
                footer={
                  bundleDiscount > 0
                    ? `Saving ${fmtNaira(bundleDiscount)}/mo`
                    : undefined
                }
                trend={bundleDiscount > 0 ? 'up' : undefined}
              />
              <MetricCard
                label="Total Spent"
                value={fmtNaira(totalSpent)}
                footer="Lifetime"
              />
            </View>

            {/* ── Subscription status card ── */}
            <StaxisCard title="Subscription">
              <View style={styles.row}>
                <StaxisText variant="bodyBase">Status</StaxisText>
                <StaxisTag
                  variant={
                    isPastDue ? 'danger' : isTrial ? 'warn' : 'success'
                  }
                  label={status.replace('_', ' ')}
                />
              </View>
              <View style={styles.row}>
                <StaxisText variant="bodyBase">Payment</StaxisText>
                <StaxisTag
                  variant={paymentVerified ? 'success' : 'warn'}
                  label={paymentVerified ? 'Paid' : 'Unpaid'}
                />
              </View>

              {/* Renewal / trial progress */}
              {isTrial && trialEndsAt && (
                <View style={styles.progressSection}>
                  <View style={styles.row}>
                    <StaxisText variant="slaProgress">
                      Trial ends {fmtDate(trialEndsAt)}
                    </StaxisText>
                    <StaxisText variant="slaProgressBold">
                      {trialDaysLeft}d left
                    </StaxisText>
                  </View>
                  <ProgressBar progress={trialProgress} color={Palette.warn} />
                </View>
              )}

              {!isTrial && paymentVerified && nextBilling && daysToRenewal !== null && (
                <View style={styles.progressSection}>
                  <View style={styles.row}>
                    <StaxisText variant="slaProgress">
                      Renews {fmtDate(nextBilling)}
                    </StaxisText>
                    <StaxisText variant="slaProgressBold">
                      {daysToRenewal}d left
                    </StaxisText>
                  </View>
                  <ProgressBar progress={renewalProgress} />
                </View>
              )}
            </StaxisCard>

            {/* ── Plans ── */}
            <View style={styles.section}>
              <SectionLabel>
                {`YOUR PLAN${plans.length > 1 ? 'S' : ''}`}
              </SectionLabel>
              {plans.length > 0 ? (
                plans.map((p) => <PlanRow key={p.id} plan={p} />)
              ) : (
                <StaxisText variant="bodySm">No plan selected.</StaxisText>
              )}
            </View>

            {/* ── Cost breakdown ── */}
            {plans.length > 0 && (
              <StaxisCard title="Cost Breakdown">
                <View style={styles.row}>
                  <StaxisText variant="bodySm">Subtotal</StaxisText>
                  <StaxisText variant="bodySm">{fmtNaira(subtotal)}</StaxisText>
                </View>
                {bundleDiscount > 0 && (
                  <View style={styles.row}>
                    <StaxisText variant="bodySm">Bundle discount</StaxisText>
                    <StaxisText variant="bodySm" style={{ color: Palette.success }}>
                      -{fmtNaira(bundleDiscount)}
                    </StaxisText>
                  </View>
                )}
                <View style={[styles.row, styles.totalRow]}>
                  <StaxisText variant="listTitle">Total/month</StaxisText>
                  <StaxisText variant="listTitle">{fmtNaira(total)}</StaxisText>
                </View>
              </StaxisCard>
            )}

            {/* ── Recent payments ── */}
            <StaxisCard
              title="Recent Payments"
              subtitle={`${fmtNaira(totalSpent)} lifetime`}
              headerRight={
                transactions.length > 0 ? (
                  <Pressable
                    onPress={() => router.push('/(tabs)/billing/transactions')}
                  >
                    <StaxisText variant="cardAction">View all</StaxisText>
                  </Pressable>
                ) : undefined
              }
            >
              {transactions.length > 0 ? (
                transactions.slice(0, 3).map((t) => (
                  <View key={t.id} style={styles.txnRow}>
                    <View style={{ flex: 1 }}>
                      <StaxisText variant="listTitle">{t.description}</StaxisText>
                      <StaxisText variant="listTime">{fmtDate(t.date)}</StaxisText>
                    </View>
                    <StaxisText variant="listTitle">{fmtNaira(t.amount)}</StaxisText>
                  </View>
                ))
              ) : (
                <EmptyState
                  title="No payments yet"
                  message="Your transaction history will appear here."
                />
              )}
            </StaxisCard>

            <StaxisText variant="formHint" style={styles.footnote}>
              To change your plan or update payment details, visit the web
              dashboard or contact Support.
            </StaxisText>
          </>
        )}
      </SafeAreaView>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: Colors.bgApp },
  content: { flexGrow: 1 },
  safe: {
    flex: 1,
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.xxxl,
    gap: Spacing.lg,
  },
  centered: {
    flex: 1,
    backgroundColor: Colors.bgApp,
    alignItems: 'center',
    justifyContent: 'center',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.sm,
  },
  metricRow: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  section: { gap: Spacing.sm },
  progressSection: {
    gap: Spacing.sm,
    marginTop: Spacing.sm,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.line,
  },
  planCard: {
    backgroundColor: Colors.bgCard,
    borderWidth: 1,
    borderColor: Colors.line,
    borderRadius: Radius.md,
    padding: Spacing.lg,
    gap: Spacing.xs,
  },
  totalRow: {
    marginTop: Spacing.sm,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.line,
  },
  txnRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.line,
  },
  footnote: { textAlign: 'center', marginTop: Spacing.sm },
});
