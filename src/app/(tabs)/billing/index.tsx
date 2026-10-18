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
  StaxisButton,
  StaxisTag,
  StaxisText,
} from '@/components/staxis';
import { Colors, Palette, Radius, Spacing } from '@/constants/staxis-theme';
import { fetchData, postData } from '@/lib/api';
import { ApiPlan, DashboardData } from '@/lib/types';
import { daysUntil, fmtDate, fmtNaira } from '@/lib/utils';
import { ErrorModal } from '@/components/error-modal';
import { getUserFacingError } from '@/lib/user-facing-error';
import { ConfirmDialog } from '@/components/confirm-dialog';

type RenewalAgreement = {
  id: string; status: string; autoRenew: boolean; cancellationPending: boolean;
  paidThrough: string | null; nextPaymentAt: string | null; description: string;
  canCancel: boolean;
};

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
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [agreements, setAgreements] = useState<RenewalAgreement[]>([]);
  const [renewalStatusError, setRenewalStatusError] = useState(false);
  const [cancelTarget, setCancelTarget] = useState<RenewalAgreement | null>(null);
  const [cancelBusy, setCancelBusy] = useState(false);
  const [renewalMessage, setRenewalMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const [dashboardResult, renewalResult] = await Promise.allSettled([
        fetchData<DashboardData>('/user/dashboard'),
        fetchData<{ agreements: RenewalAgreement[] }>('/payment/renewal'),
      ]);
      if (dashboardResult.status === 'rejected') throw dashboardResult.reason;
      setData(dashboardResult.value);
      if (renewalResult.status === 'fulfilled') {
        setAgreements(renewalResult.value.agreements ?? []);
        setRenewalStatusError(false);
      } else {
        setAgreements([]);
        setRenewalStatusError(true);
      }
      setError(false);
      setErrorMessage(null);
    } catch (failure) {
      setError(true);
      setErrorMessage(getUserFacingError(failure, 'Could not load billing details. Please try again.'));
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

  const cancelRenewal = async () => {
    if (!cancelTarget || cancelBusy) return;
    setCancelBusy(true);
    setRenewalMessage(null);
    try {
      const result = await postData<RenewalAgreement>(`/payment/renewal/${encodeURIComponent(cancelTarget.id)}/cancel`, {});
      setAgreements((current) => current.map((item) => item.id === cancelTarget.id ? result : item));
      void load();
      setCancelTarget(null);
      setRenewalMessage(result.cancellationPending
        ? 'Your request is processing. Automatic renewal has not been confirmed as stopped yet.'
        : result.autoRenew
          ? 'Automatic renewal is still active. Please try again or contact Support.'
          : `Automatic renewal is off. Your paid access continues through ${result.paidThrough ? fmtDate(result.paidThrough) : 'the end of the current period'}.`);
    } catch (failure) {
      setErrorMessage(getUserFacingError(failure, 'Could not stop automatic renewal. Please try again or contact Support.'));
    } finally {
      setCancelBusy(false);
    }
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
        <ErrorModal message={errorMessage} onDismiss={() => setErrorMessage(null)} />
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
  const cycle = company?.subscriptionType;
  const periodLabel = cycle === 'annually' ? 'year' : cycle === 'quarterly' ? 'quarter' : 'month';
  const periodMonths = cycle === 'annually' ? 12 : cycle === 'quarterly' ? 3 : 1;
  const periodSubtotal = subtotal * periodMonths;
  const periodDiscount = Math.max(0, periodSubtotal - total);

  const nextBilling = company?.nextBilling ?? null;
  const daysToRenewal = nextBilling ? daysUntil(nextBilling) : null;

  const trialEndsAt = company?.trialEndsAt ?? null;
  const trialDaysLeft = trialEndsAt ? daysUntil(trialEndsAt) : 0;
  const trialProgress = trialEndsAt
    ? Math.max(0, Math.min(1, (14 - trialDaysLeft) / 14))
    : 0;

  const renewalProgress =
    nextBilling && daysToRenewal !== null
      ? Math.max(0, Math.min(1, 1 - daysToRenewal / (periodMonths === 12 ? 365 : periodMonths * 30)))
      : 0;

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      <ErrorModal message={errorMessage} onDismiss={() => setErrorMessage(null)} />
      <ConfirmDialog
        visible={!!cancelTarget}
        title="Stop automatic renewal?"
        message={`Your paid access will continue through ${cancelTarget?.paidThrough ? fmtDate(cancelTarget.paidThrough) : 'the end of the current billing period'}. We’ll ask the payment provider to stop future renewals; the change is complete only after it is confirmed.`}
        confirmLabel={cancelBusy ? 'Processing…' : 'Stop automatic renewal'}
        onConfirm={cancelRenewal}
        onDismiss={() => setCancelTarget(null)}
        busy={cancelBusy}
      />
      {renewalMessage && <Banner variant="warn" title="Renewal update" message={renewalMessage} />}
      <SafeAreaView edges={[]} style={styles.safe}>
        <PageHeader title="Billing" subtitle={company?.name} />

        {!company ? (
          <EmptyState
            title="No subscription yet"
            message="Once your company is set up with a plan, billing details will appear here."
            action={{ label: 'Choose a plan', onPress: () => router.push('/(tabs)/billing/renew') }}
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
                onAction={() => router.push('/(tabs)/billing/renew')}
              />
            )}

            {isTrial && trialEndsAt && (
              <Banner
                variant="warn"
                title={`Trial — ${trialDaysLeft} day${trialDaysLeft !== 1 ? 's' : ''} left`}
                message={`Expires ${fmtDate(trialEndsAt)}.`}
                action="Upgrade"
                onAction={() => router.push('/(tabs)/billing/renew')}
              />
            )}

            {/* ── Status + Spend overview ── */}
            <View style={styles.metricRow}>
              <MetricCard
                label="Subscription Cost"
                value={total > 0 ? `${fmtNaira(total)}/${periodLabel}` : '—'}
                footer={
                  bundleDiscount > 0
                    ? `Saving ${fmtNaira(bundleDiscount)}/${periodLabel}`
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

            {renewalStatusError && (
              <StaxisCard title="Automatic renewal status unavailable">
                <StaxisText variant="bodySm">Could not load your current renewal status. Retry to confirm whether a subscription will renew.</StaxisText>
                <StaxisButton variant="ghost" label="Retry" onPress={() => { setRefreshing(true); void load(); }} disabled={refreshing} block />
              </StaxisCard>
            )}

            {agreements.length > 0 && (
              <StaxisCard title="Automatic renewal">
                {agreements.map((agreement) => (
                  <View key={agreement.id} style={{ gap: Spacing.sm }}>
                    <StaxisText variant="bodyBase">{agreement.description}</StaxisText>
                    <StaxisText variant="bodySm">
                      {agreement.cancellationPending
                        ? 'Stop request is processing. Renewal is not yet confirmed as stopped.'
                        : agreement.status === 'PENDING'
                          ? 'Checkout is awaiting payment. Automatic renewal starts only after payment.'
                        : agreement.autoRenew
                          ? `Renews automatically${agreement.nextPaymentAt ? ` on ${fmtDate(agreement.nextPaymentAt)}` : ''}.`
                          : `Automatic renewal is off. Paid access continues through ${agreement.paidThrough ? fmtDate(agreement.paidThrough) : 'the current period'}.`}
                    </StaxisText>
                    {agreement.canCancel && agreement.autoRenew && !agreement.cancellationPending && (
                      <Pressable accessibilityRole="button" onPress={() => setCancelTarget(agreement)}>
                        <StaxisText variant="cardAction">Stop automatic renewal</StaxisText>
                      </Pressable>
                    )}
                  </View>
                ))}
              </StaxisCard>
            )}

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
                  <StaxisText variant="bodySm">{fmtNaira(periodSubtotal)}</StaxisText>
                </View>
                {periodDiscount > 0 && (
                  <View style={styles.row}>
                    <StaxisText variant="bodySm">Discount</StaxisText>
                    <StaxisText variant="bodySm" style={{ color: Palette.success }}>
                      -{fmtNaira(periodDiscount)}
                    </StaxisText>
                  </View>
                )}
                <View style={[styles.row, styles.totalRow]}>
                  <StaxisText variant="listTitle">Total/{periodLabel}</StaxisText>
                  <StaxisText variant="listTitle">{fmtNaira(total)}</StaxisText>
                </View>
              </StaxisCard>
            )}

            {/* ── Recent payments ── */}
            <StaxisCard
              title="Recent Payments"
              subtitle={`${fmtNaira(totalSpent)} lifetime`}
              headerRight={
                  <Pressable
                    onPress={() => router.push('/(tabs)/billing/transactions')}
                  >
                    <StaxisText variant="cardAction">View all</StaxisText>
                  </Pressable>
              }
            >
              {transactions.length > 0 ? (
                transactions.slice(0, 3).map((t) => (
                  <Pressable key={t.id} style={styles.txnRow}
                    disabled={t.status.toUpperCase() !== 'PENDING' || !t.paystackRef || t.canResume === false}
                    accessibilityRole={t.status.toUpperCase() === 'PENDING' && t.paystackRef && t.canResume !== false ? 'button' : undefined}
                    onPress={() => router.push({ pathname: '/(tabs)/billing/pending', params: { reference: t.paystackRef! } })}>
                    <View style={{ flex: 1 }}>
                      <StaxisText variant="listTitle">{t.description}</StaxisText>
                      <StaxisText variant="listTime">{fmtDate(t.date)}</StaxisText>
                      <StaxisText variant="listSub" style={t.status.toUpperCase() === 'PENDING' ? { color: Palette.warn } : undefined}>
                        {t.status.toUpperCase() === 'PENDING' && t.paystackRef && t.canResume !== false ? 'Pending · Review payment →' : t.status}
                      </StaxisText>
                      {t.requiresReview && <StaxisText variant="listSub">Payment received · awaiting admin review</StaxisText>}
                    </View>
                    <StaxisText variant="listTitle">{fmtNaira(t.amount)}</StaxisText>
                  </Pressable>
                ))
              ) : (
                <EmptyState
                  title="No payments yet"
                  message="Your transaction history will appear here."
                />
              )}
            </StaxisCard>

            <StaxisButton label={isTrial || !paymentVerified ? 'Choose a plan and pay' : 'Renew or change plans'}
              onPress={() => router.push('/(tabs)/billing/renew')} block />
            {error && <StaxisText variant="formHint" style={styles.footnote}>Could not refresh billing. Pull down to retry.</StaxisText>}
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
