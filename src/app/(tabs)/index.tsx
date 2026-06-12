import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Linking,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Badge } from '@/components/ui/badge';
import { ProgressBar } from '@/components/ui/progress-bar';
import { StatCard } from '@/components/ui/stat-card';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { fetchData, postData } from '@/lib/api';
import { tokenStorage } from '@/lib/token-storage';
import { DashboardData } from '@/lib/types';
import { daysUntil, fmtDate, greeting } from '@/lib/utils';
import { useAuth } from '@/store/use-auth';

const STATUS_STYLES: Record<string, { bg: string; color: string }> = {
  ACTIVE: { bg: '#dcfce7', color: '#15803d' },
  TRIAL: { bg: '#fef3c7', color: '#b45309' },
  PAST_DUE: { bg: '#ffe4e6', color: '#be123c' },
  CANCELLED: { bg: '#f1f5f9', color: '#64748b' },
};

const POSITION_LABELS: Record<string, string> = {
  SUPER_ADMIN: 'Super Admin',
  ADMIN: 'IT Admin',
  MODERATOR: 'Moderator',
};

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

  useEffect(() => {
    load();
  }, [load]);

  const onRefresh = () => {
    setRefreshing(true);
    load();
  };

  const handleSignOut = async () => {
    const refreshToken = await tokenStorage.getRefreshToken();
    try {
      await postData('/auth/logout', { refreshToken });
    } catch {
      // Ignore — clear local session regardless of server response.
    }
    await tokenStorage.clear();
    clearUser();
    router.replace('/(auth)/login');
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
          Couldn&apos;t load your dashboard.
        </ThemedText>
        <Pressable onPress={load}>
          <ThemedText type="linkPrimary">Try again</ThemedText>
        </Pressable>
      </ThemedView>
    );
  }

  const company = data?.company;
  const plans = company?.plans ?? [];
  const planLabel = plans.map((p) => p.name).join(' + ') || 'No plan selected';
  const amount = company?.amount ?? 0;
  const status = company?.status ?? 'ACTIVE';
  const paymentVerified = company?.paymentVerified ?? false;
  const isTrial = status === 'TRIAL';
  const isPastDue = status === 'PAST_DUE';
  const managers = data?.managers ?? [];
  const primaryManager = managers[0] ?? null;
  const statusStyle = STATUS_STYLES[status] ?? STATUS_STYLES.ACTIVE;

  const nextBillingDate = company?.nextBilling ?? null;
  const daysToRenewal = nextBillingDate ? daysUntil(nextBillingDate) : null;
  const renewalProgress =
    nextBillingDate && daysToRenewal !== null
      ? Math.max(0, Math.min(100, ((30 - daysToRenewal) / 30) * 100))
      : 0;

  const trialEndsAt = company?.trialEndsAt ?? null;
  const trialDaysLeft = trialEndsAt ? daysUntil(trialEndsAt) : 0;
  const trialProgress = trialEndsAt
    ? Math.max(0, Math.min(100, ((14 - trialDaysLeft) / 14) * 100))
    : 0;

  const renewalSub = isTrial
    ? `Trial ends ${trialEndsAt ? fmtDate(trialEndsAt) : '—'}`
    : paymentVerified && nextBillingDate
      ? `Renews ${fmtDate(nextBillingDate)}`
      : 'Payment pending';

  const memberSince = company?.createdAt
    ? new Date(company.createdAt).toLocaleDateString('en-GB', {
        month: 'short',
        year: 'numeric',
      })
    : null;

  const openTickets = data?.openTicketsCount ?? 0;
  const resolvedTickets = data?.resolvedTicketsCount ?? 0;
  const totalSpent = data?.totalSpent ?? 0;

  return (
    <ScrollView
      style={styles.scrollView}
      contentContainerStyle={styles.contentContainer}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={styles.header}>
          <View style={styles.row}>
            <ThemedText type="subtitle">
              {user ? greeting(user.firstName) : 'Welcome back'}
            </ThemedText>
            <Pressable onPress={handleSignOut}>
              <ThemedText type="link" themeColor="textSecondary">
                Sign out
              </ThemedText>
            </Pressable>
          </View>
          {company && (
            <ThemedText type="small" themeColor="textSecondary">
              {company.name}
              {memberSince ? ` · Member since ${memberSince}` : ''}
            </ThemedText>
          )}
          <Badge label={status} bg={statusStyle.bg} color={statusStyle.color} />
        </View>

        {isTrial && (
          <ThemedView style={[styles.banner, styles.trialBanner]}>
            <ThemedText type="smallBold" style={styles.trialTitle}>
              ⏳ Free trial — {trialDaysLeft} day{trialDaysLeft !== 1 ? 's' : ''} remaining
            </ThemedText>
            <ThemedText type="small" style={styles.trialText}>
              Expires {trialEndsAt ? fmtDate(trialEndsAt) : '—'}. Upgrade to keep full access.
            </ThemedText>
            <ProgressBar value={trialProgress} fillColor="#f59e0b" trackColor="#fde68a" />
          </ThemedView>
        )}

        {isPastDue && (
          <ThemedView style={[styles.banner, styles.pastDueBanner]}>
            <ThemedText type="smallBold" style={styles.pastDueTitle}>
              ⚠️ Payment overdue
            </ThemedText>
            <ThemedText type="small" style={styles.pastDueText}>
              Your subscription is past due. Update your payment to restore full access.
            </ThemedText>
          </ThemedView>
        )}

        <StatCard label="Active Plan" title={planLabel} sub={renewalSub}>
          {(isTrial || (paymentVerified && daysToRenewal !== null)) && (
            <>
              <View style={styles.row}>
                <ThemedText type="small" themeColor="textSecondary">
                  {isTrial ? 'Trial usage' : 'Billing cycle'}
                </ThemedText>
                <ThemedText type="smallBold">
                  {isTrial ? `${trialDaysLeft}d left` : `${daysToRenewal}d left`}
                </ThemedText>
              </View>
              <ProgressBar value={isTrial ? trialProgress : renewalProgress} />
            </>
          )}
          <View style={styles.row}>
            <Badge label={status} bg={statusStyle.bg} color={statusStyle.color} />
            {paymentVerified ? (
              <Badge label="PAID" bg="#dbeafe" color="#1d4ed8" />
            ) : (
              <Badge label="UNPAID" bg="#fef3c7" color="#b45309" />
            )}
          </View>
        </StatCard>

        <StatCard
          label="Support Tickets"
          title={String(openTickets)}
          sub={openTickets > 0 ? 'Awaiting resolution' : 'No open tickets'}>
          <ThemedText type="small" themeColor="textSecondary">
            ✓ {resolvedTickets} resolved
          </ThemedText>
        </StatCard>

        <StatCard
          label="Monthly Spend"
          title={amount > 0 ? `₦${amount.toLocaleString()}/mo` : 'No subscription'}
          sub={
            company?.bundleDiscount && company.bundleDiscount > 0
              ? `Bundle savings: ₦${company.bundleDiscount.toLocaleString()}/mo`
              : 'Standard pricing'
          }>
          <View style={styles.row}>
            <ThemedText type="small" themeColor="textSecondary">
              Total spent (lifetime)
            </ThemedText>
            <ThemedText type="smallBold">₦{totalSpent.toLocaleString()}</ThemedText>
          </View>
          <ProgressBar value={99.9} fillColor="#94a3b8" trackColor="#e2e8f0" />
          <ThemedText type="small" themeColor="textSecondary">
            99.9% uptime guarantee
          </ThemedText>
        </StatCard>

        <StatCard
          label="Your IT Manager"
          title={
            primaryManager
              ? `${primaryManager.firstName} ${primaryManager.lastName}`
              : 'Not yet assigned'
          }
          sub={
            primaryManager
              ? (POSITION_LABELS[primaryManager.position] ?? primaryManager.position)
              : 'Our team will assign one soon'
          }>
          {primaryManager && (
            <>
              <Pressable onPress={() => Linking.openURL(`mailto:${primaryManager.email}`)}>
                <ThemedText type="link" themeColor="textSecondary" numberOfLines={1}>
                  {primaryManager.email}
                </ThemedText>
              </Pressable>
              {managers.length > 1 && (
                <ThemedText type="small" themeColor="textSecondary">
                  +{managers.length - 1} more manager{managers.length > 2 ? 's' : ''} assigned
                </ThemedText>
              )}
            </>
          )}
        </StatCard>
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
  banner: {
    borderRadius: Spacing.three,
    padding: Spacing.three,
    gap: Spacing.one,
  },
  trialBanner: {
    backgroundColor: '#fffbeb',
    borderWidth: 1,
    borderColor: '#fde68a',
  },
  trialTitle: {
    color: '#92400e',
  },
  trialText: {
    color: '#b45309',
  },
  pastDueBanner: {
    backgroundColor: '#fff1f2',
    borderWidth: 1,
    borderColor: '#fecdd3',
  },
  pastDueTitle: {
    color: '#9f1239',
  },
  pastDueText: {
    color: '#be123c',
  },
});
