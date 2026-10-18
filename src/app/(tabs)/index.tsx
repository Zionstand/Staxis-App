import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ErrorModal } from '@/components/error-modal';
import { WorkspaceHeader } from '@/components/workspace-header';
import { Banner, EmptyState, PageHeader, StaxisButton, StaxisTag, StaxisText } from '@/components/staxis';
import { Colors, Palette, Radius, Spacing } from '@/constants/staxis-theme';
import { fetchData } from '@/lib/api';
import type { DashboardData } from '@/lib/types';
import { getUserFacingError } from '@/lib/user-facing-error';
import { daysUntil, fmtDate, fmtNaira, greeting } from '@/lib/utils';
import { useAuth } from '@/store/use-auth';

export default function HomeScreen() {
  const user = useAuth((state) => state.user);
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setData(await fetchData<DashboardData>('/user/dashboard'));
      setError(false);
      setErrorMessage(null);
    } catch (failure) {
      setError(true);
      setErrorMessage(getUserFacingError(failure, 'Could not load the dashboard. Please try again.'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);
  useFocusEffect(useCallback(() => { void load(); }, [load]));

  const company = data?.company;
  const plans = company?.plans ?? [];
  const isTrial = company?.status === 'TRIAL';
  const isPastDue = company?.status === 'PAST_DUE';
  const trialDaysLeft = company?.trialEndsAt ? daysUntil(company.trialEndsAt) : 0;
  const manager = data?.managers[0];
  const openTickets = data?.openTicketsCount ?? 0;
  const transactions = data?.transactions ?? [];
  const period = company?.subscriptionType === 'annually' ? 'year' : company?.subscriptionType === 'quarterly' ? 'quarter' : 'month';
  const renewalDate = isTrial ? company?.trialEndsAt : company?.nextBilling;
  const billingNote = isTrial ? 'Trial subscription' : company?.paymentVerified ? renewalDate ? fmtDate(renewalDate) : 'Not scheduled' : 'Payment pending';
  const memberSince = company?.createdAt ? new Date(company.createdAt).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' }) : null;

  return (
    <View style={styles.screen}>
      <WorkspaceHeader title="Dashboard" />
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} tintColor={Palette.signal} colors={[Palette.signal]} onRefresh={() => { setRefreshing(true); void load(); }} />}>
        <SafeAreaView edges={['bottom']} style={styles.safe}>
          <ErrorModal message={errorMessage} onDismiss={() => setErrorMessage(null)} />
          {loading ? (
            <View accessibilityLabel="Loading your dashboard" accessibilityRole="progressbar" style={styles.loading}>
              <View style={styles.skeletonHeading} /><View style={styles.skeletonLine} />
              <View style={styles.skeletonPlan} /><View style={styles.skeletonRow} />
              <StaxisText variant="bodySm">Loading your workspace…</StaxisText>
            </View>
          ) : error && !data ? (
            <EmptyState title="Couldn't load dashboard" message="Check your connection and try again." action={{ label: 'Retry', onPress: load }} />
          ) : (
            <>
              <View style={styles.welcome}>
                <PageHeader title={user ? greeting(user.firstName) : 'Welcome back'}
                  subtitle={company ? company.name + (memberSince ? ' · Member since ' + memberSince : '') : 'Your support, services, and billing in one place.'} />
              </View>
              {isTrial && <Banner variant="warn" title={'Trial — ' + trialDaysLeft + ' day' + (trialDaysLeft !== 1 ? 's' : '') + ' left'} message={'Expires ' + (company?.trialEndsAt ? fmtDate(company.trialEndsAt) : '—') + '. Upgrade to keep access.'} action="Upgrade" onAction={() => router.push('/(tabs)/billing')} />}
              {isPastDue && <Banner variant="danger" title="Payment overdue" message="Update your payment to restore full access." action="Pay now" onAction={() => router.push('/(tabs)/billing')} />}

              <View style={styles.subscription}>
                <View style={styles.subscriptionTop}>
                  <StaxisText variant="bodyBase" style={styles.mutedOnDark}>Your subscription</StaxisText>
                  {company && <StaxisTag variant={isPastDue ? 'danger' : isTrial ? 'warn' : company.status === 'ACTIVE' ? 'success' : 'neutral'} label={company.status.replaceAll('_', ' ')} />}
                </View>
                <StaxisText variant="pageTitle" style={styles.onDark}>{plans.length ? plans.map((plan) => plan.name).join(' + ') : 'Make room for better IT.'}</StaxisText>
                <StaxisText variant="bodySm" style={styles.mutedOnDark}>{plans.length ? plans.length + ' service' + (plans.length === 1 ? '' : 's') + ' in your workspace' : 'Choose a service plan to get started with Staxis.'}</StaxisText>
                {company && (
                  <View style={styles.subscriptionDetails}>
                    <View style={styles.detail}><StaxisText variant="formHint" style={styles.mutedOnDark}>Cost per {period}</StaxisText><StaxisText variant="bodyLg" style={styles.onDark}>{company.amount > 0 ? fmtNaira(company.amount) : '—'}</StaxisText></View>
                    <View style={styles.detail}><StaxisText variant="formHint" style={styles.mutedOnDark}>{isTrial ? 'Trial ends' : company.paymentVerified ? 'Next renewal' : 'Payment status'}</StaxisText><StaxisText variant="bodyLg" style={styles.onDark}>{isTrial && renewalDate ? fmtDate(renewalDate) : billingNote}</StaxisText></View>
                  </View>
                )}
                <Pressable accessibilityRole="button" onPress={() => router.push(company ? '/(tabs)/billing' : '/(tabs)/billing/renew')} style={({ pressed }) => [styles.planAction, pressed && styles.pressed]}>
                  <StaxisText variant="bodyBase" style={[styles.onDark, styles.actionLabel]}>{company ? 'Manage subscription' : 'Explore service plans'}</StaxisText><StaxisText variant="bodyLg" style={styles.onDark} accessible={false}>↗</StaxisText>
                </Pressable>
              </View>

              <View style={styles.actions}>
                <StaxisButton label="Open a ticket" size="lg" onPress={() => router.push('/(tabs)/support/new')} style={styles.primaryAction} />
                <StaxisButton variant="ghost" label="View billing" size="lg" onPress={() => router.push('/(tabs)/billing')} style={styles.secondaryAction} />
              </View>
              <View style={styles.supportOverview}>
                <Pressable accessibilityRole="button" accessibilityLabel={openTickets + ' open support tickets. View support.'} onPress={() => router.push('/(tabs)/support')} style={({ pressed }) => [styles.supportStat, pressed && styles.pressed]}><StaxisText variant="displayMd">{openTickets}</StaxisText><StaxisText variant="bodySm">Open ticket{openTickets === 1 ? '' : 's'}</StaxisText></Pressable>
                <View style={styles.statDivider} />
                <View style={styles.supportStat}><StaxisText variant="displayMd">{data?.resolvedTicketsCount ?? 0}</StaxisText><StaxisText variant="bodySm">Resolved tickets</StaxisText></View>
              </View>

              <View style={styles.managerSection}>
                <StaxisText variant="cardTitle" accessibilityRole="header">Your IT contact</StaxisText>
                <View style={styles.managerRow}>
                  <View style={styles.managerAvatar}><StaxisText variant="displaySm" accessible={false}>{manager ? manager.firstName.charAt(0) + manager.lastName.charAt(0) : 'S'}</StaxisText></View>
                  <View style={styles.managerCopy}><StaxisText variant="bodyLg" style={styles.ink}>{manager ? manager.firstName + ' ' + manager.lastName : 'Here when you need us'}</StaxisText><StaxisText variant="bodySm">{manager ? manager.position || 'Your assigned IT manager' : 'Your IT manager will appear here once assigned.'}</StaxisText>{manager && <StaxisText variant="bodySm">{manager.email}</StaxisText>}</View>
                </View>
              </View>

              <View style={styles.activitySection}>
                <View style={styles.sectionHeading}><StaxisText variant="cardTitle" accessibilityRole="header">Recent activity</StaxisText><Pressable accessibilityRole="button" accessibilityLabel="View all transactions" onPress={() => router.push('/(tabs)/billing/transactions')} style={styles.textAction}><StaxisText variant="cardAction">View all →</StaxisText></Pressable></View>
                {transactions.length === 0 && openTickets === 0 ? (
                  <View style={styles.quietActivity}><StaxisText variant="bodyLg" style={styles.ink}>You’re all caught up.</StaxisText><StaxisText variant="bodySm">Payments and support updates will appear here.</StaxisText></View>
                ) : (
                  <>
                    {transactions.slice(0, 3).map((transaction) => {
                      const canResume = transaction.status.toUpperCase() === 'PENDING' && !!transaction.paystackRef && transaction.canResume !== false;
                      return (
                        <Pressable key={transaction.id} disabled={!canResume} accessibilityRole={canResume ? 'button' : undefined} accessibilityLabel={transaction.description + ', ' + fmtNaira(transaction.amount) + ', ' + transaction.status + (transaction.requiresReview ? ', payment received, awaiting admin review' : '')} onPress={() => router.push({ pathname: '/(tabs)/billing/pending', params: { reference: transaction.paystackRef! } })} style={({ pressed }) => [styles.activityRow, pressed && styles.pressed]}>
                          <View style={styles.activityMark}><StaxisText variant="bodyBase" accessible={false}>₦</StaxisText></View>
                          <View style={styles.activityCopy}><StaxisText variant="bodyBase">{transaction.description}</StaxisText><StaxisText variant="bodySm">{transaction.requiresReview ? 'Payment received · awaiting admin review' : fmtNaira(transaction.amount) + ' · ' + transaction.status}</StaxisText>{transaction.requiresReview && <StaxisText variant="bodySm">{fmtNaira(transaction.amount)}</StaxisText>}</View>
                          {canResume && <StaxisText variant="cardAction">Review →</StaxisText>}
                        </Pressable>
                      );
                    })}
                    {openTickets > 0 && <Pressable accessibilityRole="button" onPress={() => router.push('/(tabs)/support')} style={({ pressed }) => [styles.activityRow, pressed && styles.pressed]}><View style={styles.activityCopy}><StaxisText variant="bodyBase">{openTickets} ticket{openTickets === 1 ? '' : 's'} awaiting resolution</StaxisText><StaxisText variant="bodySm">Keep the conversation going with your team.</StaxisText></View><StaxisText variant="cardAction">View →</StaxisText></Pressable>}
                  </>
                )}
              </View>
            </>
          )}
        </SafeAreaView>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.bgApp },
  scroll: { flex: 1 },
  content: { flexGrow: 1 },
  safe: { flex: 1, width: '100%', maxWidth: 800, alignSelf: 'center', paddingHorizontal: Spacing.xl, paddingTop: Spacing.xxl, paddingBottom: Spacing.xxxl, gap: Spacing.xl },
  welcome: { marginBottom: -Spacing.xl },
  subscription: { backgroundColor: Palette.ink, borderRadius: Radius.lg, padding: Spacing.xl, gap: Spacing.md },
  subscriptionTop: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.sm },
  onDark: { color: Colors.textOnDark },
  mutedOnDark: { color: Colors.textMuteOnDark },
  ink: { color: Colors.text },
  subscriptionDetails: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.xl, marginTop: Spacing.sm, paddingVertical: Spacing.lg, borderTopWidth: 1, borderTopColor: Colors.lineOnDark },
  detail: { flex: 1, minWidth: 110, gap: Spacing.xs },
  planAction: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: Spacing.sm, borderTopWidth: 1, borderTopColor: Colors.lineOnDark, minHeight: Spacing.xxxl, paddingTop: Spacing.sm },
  actionLabel: { flex: 1 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.md },
  primaryAction: { flexGrow: 1, minHeight: Spacing.xxxl, borderRadius: Radius.pill },
  secondaryAction: { flexGrow: 1, minHeight: Spacing.xxxl, borderRadius: Radius.pill },
  supportOverview: { flexDirection: 'row', alignItems: 'stretch', backgroundColor: Palette.bone2, borderRadius: Radius.lg, paddingVertical: Spacing.lg },
  supportStat: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.xs, paddingHorizontal: Spacing.sm, minHeight: Spacing.xxxl },
  statDivider: { width: 1, backgroundColor: Colors.lineStrong, marginVertical: Spacing.xs },
  managerSection: { gap: Spacing.md },
  managerRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.lg, paddingVertical: Spacing.sm },
  managerAvatar: { width: Spacing.xxxl, height: Spacing.xxxl, borderRadius: Radius.pill, backgroundColor: Palette.bone2, justifyContent: 'center', alignItems: 'center' },
  managerCopy: { flex: 1, minWidth: 0, gap: Spacing.xs },
  activitySection: { gap: Spacing.sm },
  sectionHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: Spacing.sm },
  textAction: { minHeight: Spacing.xxxl, justifyContent: 'center' },
  quietActivity: { backgroundColor: Colors.bgCard, borderRadius: Radius.lg, padding: Spacing.xl, gap: Spacing.sm },
  activityRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, paddingVertical: Spacing.lg, borderBottomWidth: 1, borderBottomColor: Colors.line },
  activityMark: { width: Spacing.xxl, height: Spacing.xxl, borderRadius: Radius.sm, backgroundColor: Palette.bone2, alignItems: 'center', justifyContent: 'center' },
  activityCopy: { flex: 1, minWidth: 0, gap: Spacing.xs },
  pressed: { opacity: 0.7 },
  loading: { gap: Spacing.lg },
  skeletonHeading: { backgroundColor: Palette.bone2, height: Spacing.xxl, width: '80%', borderRadius: Radius.sm },
  skeletonLine: { backgroundColor: Palette.bone2, height: Spacing.lg, width: '60%', borderRadius: Radius.sm },
  skeletonPlan: { backgroundColor: Palette.bone2, height: 240, borderRadius: Radius.lg, marginTop: Spacing.lg },
  skeletonRow: { backgroundColor: Palette.bone2, height: Spacing.xxxl * 2, borderRadius: Radius.lg },
});
