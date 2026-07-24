import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
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

import { Mark } from '@/components/logo';
import { NotificationBell } from '@/components/notification-bell';
import { Badge } from '@/components/ui/badge';
import { Gauge } from '@/components/ui/gauge';
import { PressableScale } from '@/components/ui/pressable-scale';
import { ProgressBar } from '@/components/ui/progress-bar';
import { StatTile } from '@/components/ui/stat-tile';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import {
  BottomTabInset,
  HeroGradient,
  MaxContentWidth,
  Spacing,
  Tints,
} from '@/constants/theme';
import { useScheme, useTheme } from '@/hooks/use-theme';
import { fetchData } from '@/lib/api';
import { DashboardData } from '@/lib/types';
import { daysUntil, fmtDate, greeting } from '@/lib/utils';
import { useAuth } from '@/store/use-auth';
import { useNotifications } from '@/store/use-notifications';
import { useSubscriptionStore } from '@/store/use-subscription-store';

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

type QuickActionProps = {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
};

function QuickAction({ icon, label, onPress }: QuickActionProps) {
  const theme = useTheme();
  return (
    <PressableScale onPress={onPress} accessibilityRole="button" accessibilityLabel={label}>
      <View style={styles.quickAction}>
        <View style={[styles.quickIcon, { backgroundColor: theme.primarySoft }]}>
          <Ionicons name={icon} size={20} color={theme.primary} />
        </View>
        <ThemedText type="small" numberOfLines={1} style={styles.quickLabel}>
          {label}
        </ThemedText>
      </View>
    </PressableScale>
  );
}

function initials(first?: string, last?: string) {
  return `${first?.[0] ?? ''}${last?.[0] ?? ''}`.toUpperCase() || '?';
}

export default function HomeScreen() {
  const theme = useTheme();
  const scheme = useScheme();
  const user = useAuth((s) => s.user);
  const refreshUnreadCount = useNotifications((s) => s.refreshUnreadCount);

  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(false);

  const load = useCallback(async () => {
    try {
      const result = await fetchData<DashboardData>('/user/dashboard');
      setData(result);
      useSubscriptionStore.getState().setFromCompany(result.company);
      setError(false);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // Reload whenever the Home tab regains focus so the dashboard stays fresh.
  useFocusEffect(
    useCallback(() => {
      load();
      refreshUnreadCount();
    }, [load, refreshUnreadCount]),
  );

  const onRefresh = () => {
    setRefreshing(true);
    load();
  };

  // Retry from the error state: drop back to the spinner and clear the error so
  // the tap gives immediate feedback, instead of silently re-failing onto the
  // identical screen.
  const onRetry = () => {
    setError(false);
    setLoading(true);
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
          Couldn&apos;t load your dashboard.
        </ThemedText>
        <Pressable
          onPress={onRetry}
          hitSlop={12}
          style={({ pressed }) => pressed && styles.pressed}>
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

  const memberSince = company?.createdAt
    ? new Date(company.createdAt).toLocaleDateString('en-GB', {
        month: 'short',
        year: 'numeric',
      })
    : null;

  const openTickets = data?.openTicketsCount ?? 0;
  const resolvedTickets = data?.resolvedTicketsCount ?? 0;
  const totalSpent = data?.totalSpent ?? 0;

  // Renewal / trial tile figures.
  const renewalValue = isTrial
    ? `${trialDaysLeft}d`
    : daysToRenewal !== null
      ? `${daysToRenewal}d`
      : '—';
  const renewalLabel = isTrial ? 'Trial left' : 'Until renewal';
  const renewalSub = isTrial
    ? trialEndsAt
      ? `Ends ${fmtDate(trialEndsAt)}`
      : 'Trial'
    : paymentVerified && nextBillingDate
      ? `Renews ${fmtDate(nextBillingDate)}`
      : 'Payment pending';
  const amberTint = Tints[scheme].amber;

  return (
    <ScrollView
      style={styles.scrollView}
      contentContainerStyle={styles.contentContainer}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        {/* App brand bar — Staxis mark + notification bell. */}
        <View style={styles.brandBar}>
          <Mark size={26} />
          <NotificationBell />
        </View>

        {/* ── Gradient hero: identity + status ─────────────────────────── */}
        <LinearGradient
          colors={HeroGradient[scheme]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.hero}>
          <View style={styles.heroRow}>
            <View style={styles.heroTextWrap}>
              <ThemedText type="small" style={styles.heroKicker}>
                {isTrial ? 'Free trial' : isPastDue ? 'Action needed' : 'Dashboard'}
              </ThemedText>
              <ThemedText type="subtitle" style={styles.heroGreeting} numberOfLines={1}>
                {user ? greeting(user.firstName) : 'Welcome back'}
              </ThemedText>
              {company && (
                <ThemedText type="small" style={styles.heroSub} numberOfLines={1}>
                  {company.name}
                  {memberSince ? ` · Since ${memberSince}` : ''}
                </ThemedText>
              )}
            </View>
            {company?.logoUrl ? (
              <View style={styles.heroLogo}>
                <Image
                  source={{ uri: company.logoUrl }}
                  style={styles.heroLogoImage}
                  contentFit="contain"
                  accessibilityLabel={company.name}
                />
              </View>
            ) : null}
          </View>

          <View style={styles.heroPills}>
            <View style={styles.heroPill}>
              <View style={[styles.dot, { backgroundColor: statusStyle.color }]} />
              <ThemedText type="small" style={styles.heroPillText}>
                {status}
              </ThemedText>
            </View>
            <View style={styles.heroPill}>
              <Ionicons name={paymentVerified ? 'checkmark-circle' : 'time'} size={13} color="#ffffff" />
              <ThemedText type="small" style={styles.heroPillText}>
                {paymentVerified ? 'Paid' : 'Unpaid'}
              </ThemedText>
            </View>
          </View>
        </LinearGradient>

        {/* ── Quick actions ────────────────────────────────────────────── */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.quickRow}>
          <QuickAction icon="add-circle" label="New ticket" onPress={() => router.push('/(tabs)/tickets/new')} />
          <QuickAction icon="chatbubbles" label="My tickets" onPress={() => router.push('/(tabs)/tickets')} />
          <QuickAction icon="construct" label="Services" onPress={() => router.push('/(tabs)/services')} />
          <QuickAction icon="card" label="Billing" onPress={() => router.push('/(tabs)/billing')} />
          <QuickAction icon="notifications" label="Alerts" onPress={() => router.push('/notifications')} />
        </ScrollView>

        {/* ── Contextual banners ───────────────────────────────────────── */}
        {isTrial && (
          <ThemedView style={[styles.banner, styles.trialBanner]}>
            <ThemedText type="smallBold" style={styles.trialTitle}>
              ⏳ Free trial — {trialDaysLeft} day{trialDaysLeft !== 1 ? 's' : ''} remaining
            </ThemedText>
            <ThemedText type="small" style={styles.trialText}>
              Expires {trialEndsAt ? fmtDate(trialEndsAt) : '—'}. Upgrade to keep full access.
            </ThemedText>
            <ProgressBar value={trialProgress} fillColor="#f59e0b" trackColor="#fde68a" />
            <Pressable
              onPress={() => router.push('/(tabs)/billing/subscribe')}
              style={({ pressed }) => [styles.bannerButton, styles.trialButton, pressed && styles.pressed]}>
              <ThemedText type="smallBold" style={styles.bannerButtonText}>
                Subscribe now →
              </ThemedText>
            </Pressable>
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
            <Pressable
              onPress={() => router.push('/(tabs)/billing/subscribe')}
              style={({ pressed }) => [styles.bannerButton, styles.pastDueButton, pressed && styles.pressed]}>
              <ThemedText type="smallBold" style={styles.bannerButtonText}>
                Settle payment →
              </ThemedText>
            </Pressable>
          </ThemedView>
        )}

        {/* ── Bento grid of metrics ────────────────────────────────────── */}
        <View style={styles.grid}>
          <View style={styles.gridCol}>
            <StatTile
              tint="blue"
              icon="chatbubble-ellipses"
              label={openTickets > 0 ? 'Open tickets' : 'No open tickets'}
              value={String(openTickets)}
              sub="Awaiting resolution"
              onPress={() => router.push('/(tabs)/tickets')}
            />
          </View>
          <View style={styles.gridCol}>
            <StatTile
              tint="green"
              icon="checkmark-done-circle"
              label="Resolved"
              value={String(resolvedTickets)}
              sub="All-time"
              onPress={() => router.push('/(tabs)/tickets')}
            />
          </View>
        </View>

        <View style={styles.grid}>
          <View style={styles.gridCol}>
            <StatTile
              tint="wine"
              icon="card"
              label="Monthly spend"
              value={amount > 0 ? `₦${amount.toLocaleString()}` : '₦0'}
              sub={
                company?.bundleDiscount && company.bundleDiscount > 0
                  ? `Bundle −₦${company.bundleDiscount.toLocaleString()}/mo`
                  : `Lifetime ₦${totalSpent.toLocaleString()}`
              }
              onPress={() => router.push('/(tabs)/billing')}
            />
          </View>
          <View style={styles.gridCol}>
            <StatTile
              tint="amber"
              icon="time"
              label={renewalLabel}
              value={renewalValue}
              sub={renewalSub}
              onPress={() => router.push('/(tabs)/billing')}
              accessory={
                <Gauge
                  progress={isTrial ? trialProgress : renewalProgress}
                  size={44}
                  stroke={5}
                  color={amberTint.fg}
                  trackColor={`${amberTint.fg}33`}
                />
              }
            />
          </View>
        </View>

        {/* ── Active plan (accent-striped feature card) ────────────────── */}
        <PressableScale onPress={() => router.push('/(tabs)/billing')}>
          <ThemedView type="backgroundElement" style={styles.planCard}>
            <View style={[styles.accentStripe, { backgroundColor: theme.primary }]} />
            <View style={styles.planBody}>
              <View style={styles.planHeaderRow}>
                <View style={[styles.planIcon, { backgroundColor: theme.primarySoft }]}>
                  <Ionicons name="cube" size={18} color={theme.primary} />
                </View>
                <View style={styles.flexShrink}>
                  <ThemedText type="small" themeColor="textSecondary">
                    Active plan
                  </ThemedText>
                  <ThemedText type="smallBold" numberOfLines={1} style={styles.planName}>
                    {planLabel}
                  </ThemedText>
                </View>
                <Ionicons name="chevron-forward" size={18} color={theme.textSecondary} />
              </View>

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
                  <ProgressBar value={isTrial ? trialProgress : renewalProgress} fillColor={theme.primary} />
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
            </View>
          </ThemedView>
        </PressableScale>

        {/* ── IT manager (person card) ─────────────────────────────────── */}
        <PressableScale onPress={() => router.push('/it-manager')}>
          <ThemedView type="backgroundElement" style={styles.managerCard}>
            <View style={styles.managerHeader}>
              <ThemedText type="small" themeColor="textSecondary">
                Your IT manager
              </ThemedText>
              <Ionicons name="chevron-forward" size={16} color={theme.textSecondary} />
            </View>
          <View style={styles.managerRow}>
            <View style={[styles.managerAvatar, { backgroundColor: theme.primary }]}>
              <ThemedText type="smallBold" style={styles.managerInitials}>
                {primaryManager
                  ? initials(primaryManager.firstName, primaryManager.lastName)
                  : '—'}
              </ThemedText>
            </View>
            <View style={styles.flexShrink}>
              <ThemedText type="smallBold" numberOfLines={1}>
                {primaryManager
                  ? `${primaryManager.firstName} ${primaryManager.lastName}`
                  : 'Not yet assigned'}
              </ThemedText>
              <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
                {primaryManager
                  ? (POSITION_LABELS[primaryManager.position] ?? primaryManager.position)
                  : 'Our team will assign one soon'}
              </ThemedText>
            </View>
          </View>

          {primaryManager && (
            <View style={styles.managerActions}>
              <Pressable
                onPress={() => Linking.openURL(`mailto:${primaryManager.email}`)}
                style={({ pressed }) => [
                  styles.managerBtn,
                  { backgroundColor: theme.primarySoft },
                  pressed && styles.pressed,
                ]}>
                <Ionicons name="mail" size={15} color={theme.primary} />
                <ThemedText type="small" style={[styles.managerBtnText, { color: theme.primary }]}>
                  Email
                </ThemedText>
              </Pressable>
              {managers.length > 1 && (
                <ThemedText type="small" themeColor="textSecondary" style={styles.managerMore}>
                  +{managers.length - 1} more assigned
                </ThemedText>
              )}
            </View>
          )}
          </ThemedView>
        </PressableScale>
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
  brandBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  // Hero
  hero: {
    borderRadius: Spacing.four,
    padding: Spacing.four,
    gap: Spacing.three,
    overflow: 'hidden',
  },
  heroRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.three,
  },
  heroTextWrap: {
    flexShrink: 1,
    gap: Spacing.half,
  },
  heroKicker: {
    color: 'rgba(255,255,255,0.75)',
    textTransform: 'uppercase',
    letterSpacing: 1,
    fontSize: 11,
  },
  heroGreeting: {
    color: '#ffffff',
    fontSize: 26,
    lineHeight: 32,
  },
  heroSub: {
    color: 'rgba(255,255,255,0.85)',
  },
  heroLogo: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.92)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroLogoImage: {
    width: 40,
    height: 40,
  },
  heroPills: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  heroPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    backgroundColor: 'rgba(255,255,255,0.18)',
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.half,
    borderRadius: Spacing.five,
  },
  heroPillText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  // Quick actions
  quickRow: {
    gap: Spacing.three,
    paddingVertical: Spacing.half,
    paddingRight: Spacing.two,
  },
  quickAction: {
    alignItems: 'center',
    gap: Spacing.one,
    width: 64,
  },
  quickIcon: {
    width: 52,
    height: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickLabel: {
    fontSize: 12,
  },
  // Grid
  grid: {
    flexDirection: 'row',
    gap: Spacing.three,
  },
  gridCol: {
    flex: 1,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  pressed: {
    opacity: 0.7,
  },
  // Plan card
  planCard: {
    borderRadius: Spacing.three,
    flexDirection: 'row',
    overflow: 'hidden',
  },
  accentStripe: {
    width: 5,
  },
  planBody: {
    flex: 1,
    padding: Spacing.three,
    gap: Spacing.two,
  },
  planHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  planIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  planName: {
    fontSize: 16,
  },
  flexShrink: {
    flex: 1,
    flexShrink: 1,
  },
  // Manager card
  managerCard: {
    borderRadius: Spacing.three,
    padding: Spacing.three,
    gap: Spacing.two,
  },
  managerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  managerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  managerAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  managerInitials: {
    color: '#ffffff',
    fontSize: 16,
  },
  managerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    marginTop: Spacing.one,
  },
  managerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    paddingHorizontal: Spacing.three,
    height: 38,
    borderRadius: 10,
  },
  managerBtnText: {
    fontWeight: '700',
  },
  managerMore: {
    flexShrink: 1,
  },
  // Banners
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
  bannerButton: {
    alignSelf: 'flex-start',
    height: 40,
    borderRadius: 10,
    paddingHorizontal: Spacing.three,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.one,
  },
  trialButton: {
    backgroundColor: '#f59e0b',
  },
  pastDueButton: {
    backgroundColor: '#be123c',
  },
  bannerButtonText: {
    color: '#ffffff',
  },
});
