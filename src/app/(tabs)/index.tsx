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
  StaxisButton,
  StaxisCard,
  StaxisTag,
  StaxisText,
} from '@/components/staxis';
import { Colors, Palette, Spacing } from '@/constants/staxis-theme';
import { fetchData, postData } from '@/lib/api';
import { tokenStorage } from '@/lib/token-storage';
import { DashboardData } from '@/lib/types';
import { daysUntil, fmtDate, fmtNaira, greeting } from '@/lib/utils';
import { useAuth } from '@/store/use-auth';

export default function HomeScreen() {
  const user = useAuth((s) => s.user);
  const clearUser = useAuth((s) => s.clearUser);

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

  const handleSignOut = async () => {
    const refreshToken = await tokenStorage.getRefreshToken();
    try {
      await postData('/auth/logout', { refreshToken });
    } catch {
      /* clear local session regardless */
    }
    await tokenStorage.clear();
    clearUser();
    router.replace('/(auth)/login');
  };

  if (loading) {
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
          title="Couldn't load dashboard"
          message="Pull down to try again, or check your connection."
          action={{ label: 'Retry', onPress: load }}
        />
      </View>
    );
  }

  const company = data?.company;
  const plans = company?.plans ?? [];
  const planLabel = plans.map((p) => p.name).join(' + ') || 'No plan';
  const status = company?.status ?? 'ACTIVE';
  const isTrial = status === 'TRIAL';
  const isPastDue = status === 'PAST_DUE';

  const trialEndsAt = company?.trialEndsAt ?? null;
  const trialDaysLeft = trialEndsAt ? daysUntil(trialEndsAt) : 0;

  const primaryManager = (data?.managers ?? [])[0] ?? null;
  const openTickets = data?.openTicketsCount ?? 0;

  const memberSince = company?.createdAt
    ? new Date(company.createdAt).toLocaleDateString('en-GB', {
        month: 'short',
        year: 'numeric',
      })
    : null;

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      <SafeAreaView edges={['top']} style={styles.safe}>
        {/* ── Header ── */}
        <PageHeader
          title={user ? greeting(user.firstName) : 'Welcome back'}
          subtitle={
            company
              ? `${company.name}${memberSince ? ` · Since ${memberSince}` : ''}`
              : undefined
          }
          right={
            <Pressable onPress={handleSignOut} hitSlop={8}>
              <StaxisText variant="refreshBtn">Sign out</StaxisText>
            </Pressable>
          }
        />

        {/* ── Status tag ── */}
        <View style={styles.tagRow}>
          <StaxisTag
            variant={
              isPastDue ? 'danger' : isTrial ? 'warn' : 'success'
            }
            label={status.replace('_', ' ')}
          />
        </View>

        {/* ── Banners ── */}
        {isTrial && (
          <Banner
            variant="warn"
            title={`Trial — ${trialDaysLeft} day${trialDaysLeft !== 1 ? 's' : ''} left`}
            message={`Expires ${trialEndsAt ? fmtDate(trialEndsAt) : '—'}. Upgrade to keep access.`}
            action="Upgrade"
            onAction={() => router.push('/(tabs)/billing')}
          />
        )}

        {isPastDue && (
          <Banner
            variant="danger"
            title="Payment overdue"
            message="Update your payment to restore full access."
            action="Pay now"
            onAction={() => router.push('/(tabs)/billing')}
          />
        )}

        {/* ── Quick actions ── */}
        <View style={styles.actions}>
          <StaxisButton
            label="Open a Ticket"
            onPress={() => router.push('/(tabs)/tickets/new')}
          />
          <StaxisButton
            variant="ghost"
            label="Billing"
            onPress={() => router.push('/(tabs)/billing')}
          />
        </View>

        {/* ── Key metrics (2×2 grid) ── */}
        <View style={styles.grid}>
          <MetricCard
            label="Active Plan"
            value={planLabel}
            footer={
              isTrial
                ? `Trial ends ${trialEndsAt ? fmtDate(trialEndsAt) : '—'}`
                : company?.paymentVerified
                  ? `Renews ${company.nextBilling ? fmtDate(company.nextBilling) : '—'}`
                  : 'Payment pending'
            }
            trend={isPastDue || !company?.paymentVerified ? 'warn' : undefined}
            onPress={() => router.push('/(tabs)/billing')}
          />

          <MetricCard
            label="Support Tickets"
            value={String(openTickets)}
            footer={
              openTickets > 0
                ? 'Tap to view'
                : 'No open tickets'
            }
            onPress={() => router.push('/(tabs)/tickets')}
          />

          <MetricCard
            label="Monthly Spend"
            value={
              (company?.amount ?? 0) > 0
                ? `${fmtNaira(company!.amount)}/mo`
                : '—'
            }
            footer={
              company?.bundleDiscount && company.bundleDiscount > 0
                ? `Saving ${fmtNaira(company.bundleDiscount)}/mo`
                : undefined
            }
            trend={
              company?.bundleDiscount && company.bundleDiscount > 0
                ? 'up'
                : undefined
            }
            onPress={() => router.push('/(tabs)/billing')}
          />

          <MetricCard
            label="IT Manager"
            value={
              primaryManager
                ? `${primaryManager.firstName} ${primaryManager.lastName.charAt(0)}.`
                : 'Unassigned'
            }
            footer={
              primaryManager
                ? primaryManager.email
                : 'Will be assigned soon'
            }
          />
        </View>

        {/* ── Recent activity teaser ── */}
        <StaxisCard title="Recent Activity" subtitle="Latest updates">
          {(data?.transactions ?? []).length === 0 && openTickets === 0 ? (
            <EmptyState
              title="All quiet"
              message="Your recent activity will show up here."
            />
          ) : (
            <View style={styles.activityList}>
              {openTickets > 0 && (
                <Pressable
                  onPress={() => router.push('/(tabs)/tickets')}
                  style={styles.activityRow}
                >
                  <StaxisText variant="listTitle">
                    {openTickets} open ticket{openTickets !== 1 ? 's' : ''}
                  </StaxisText>
                  <StaxisText variant="cardAction">View</StaxisText>
                </Pressable>
              )}
              {(data?.resolvedTicketsCount ?? 0) > 0 && (
                <View style={styles.activityRow}>
                  <StaxisText variant="listTitle" style={{ color: Palette.success }}>
                    {data!.resolvedTicketsCount} resolved
                  </StaxisText>
                </View>
              )}
            </View>
          )}
        </StaxisCard>
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
  tagRow: { flexDirection: 'row', marginTop: -Spacing.sm },
  actions: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.md,
  },
  activityList: { gap: Spacing.sm },
  activityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.line,
  },
});
