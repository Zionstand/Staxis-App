import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Linking,
  Platform,
  Pressable,
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
  BILLING_MULTIPLIERS,
  BILLING_OPTIONS,
  computePricing,
  generateRef,
  type PlanWithTrack,
} from '@/lib/billing';
import { ApiTrack, BillingCycle, DashboardData } from '@/lib/types';
import { fmtNaira } from '@/lib/utils';
import { useAuth } from '@/store/use-auth';

const CUSTOM_EMAIL = 'staxis@zionstand.com';

const CYCLE_SUFFIX: Record<BillingCycle, string> = {
  monthly: 'mo',
  quarterly: 'qtr',
  annually: 'yr',
};

export default function SubscribeScreen() {
  return (
    <PaystackHost>
      <SubscribeInner />
    </PaystackHost>
  );
}

function SubscribeInner() {
  const theme = useTheme();
  const user = useAuth((s) => s.user);
  const setUser = useAuth((s) => s.setUser);
  const { popup } = usePaystack();

  const [tracks, setTracks] = useState<ApiTrack[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [activeTrackIndex, setActiveTrackIndex] = useState(0);
  const [billingCycle, setBillingCycle] = useState<BillingCycle>('monthly');
  // trackId → planId
  const [selectedPlans, setSelectedPlans] = useState<Record<string, string>>({});
  const [currentPlanIds, setCurrentPlanIds] = useState<string[]>([]);
  const [paying, setPaying] = useState(false);
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
    setError(false);
    try {
      const [tracksData, dash] = await Promise.all([
        fetchData<ApiTrack[]>('/plans'),
        fetchData<DashboardData>('/user/dashboard'),
      ]);
      setTracks(tracksData);

      // Pre-select the company's current plans and billing cycle.
      const company = dash?.company;
      if (company) {
        const existing = company.plans?.map((p) => p.id) ?? [];
        setCurrentPlanIds(existing);
        const prefilled: Record<string, string> = {};
        for (const track of tracksData) {
          const match = track.plans.find((p) => existing.includes(p.id));
          if (match) prefilled[track.id] = match.id;
        }
        setSelectedPlans(prefilled);
        if (company.subscriptionType === 'annually') setBillingCycle('annually');
        else if (company.subscriptionType === 'quarterly') setBillingCycle('quarterly');
      }
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const togglePlan = (trackId: string, planId: string) => {
    setSelectedPlans((prev) => {
      if (prev[trackId] === planId) {
        const next = { ...prev };
        delete next[trackId];
        return next;
      }
      return { ...prev, [trackId]: planId };
    });
  };

  // Flat lookup: planId → plan + track title.
  const planMap: Record<string, PlanWithTrack> = {};
  for (const track of tracks) {
    for (const plan of track.plans) {
      planMap[plan.id] = { ...plan, trackTitle: track.title };
    }
  }

  const selectedPlanIds = Object.values(selectedPlans);
  const pricing = computePricing(selectedPlanIds, planMap, billingCycle);

  const verify = async (reference: string) => {
    try {
      const res = await postData<{ user?: any }>('/payment/verify', {
        reference,
        selectedPlans: selectedPlanIds,
        amount: pricing.finalAmount,
        discountAmount: pricing.totalDiscount,
        billingCycle,
      });
      if (res?.user) setUser(res.user);
      setResult({
        variant: 'success',
        title: 'Subscription active',
        message: 'Your payment was confirmed and your plan is now active.',
        actions: [
          {
            label: 'Done',
            onPress: () => {
              closeResult();
              router.back();
            },
          },
        ],
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
    if (selectedPlanIds.length === 0) return;
    if (!isPaystackAvailable) {
      showError('Use the mobile app', 'Payments are available in the Staxis mobile app.');
      return;
    }
    if (!user?.email) {
      showError('Missing email', 'Your account has no email on file to bill.');
      return;
    }
    const reference = generateRef();
    setPaying(true);
    popup.checkout({
      email: user.email,
      amount: pricing.finalAmount, // naira — the library converts to kobo
      reference,
      ...(pricing.singlePlanPaystackId ? { plan: pricing.singlePlanPaystackId } : {}),
      metadata: { selectedPlans: selectedPlanIds, billingCycle },
      onSuccess: (res) => verify(res?.reference ?? reference),
      onCancel: () => setPaying(false),
      onError: (err: any) => {
        setPaying(false);
        showError('Payment error', err?.message ?? 'Something went wrong. Please try again.');
      },
    });
  };

  if (loading) {
    return (
      <ThemedView style={styles.centered}>
        <ActivityIndicator />
      </ThemedView>
    );
  }

  if (error) {
    return (
      <ThemedView style={styles.centered}>
        <ThemedText type="default" themeColor="textSecondary">
          Couldn&apos;t load plans.
        </ThemedText>
        <Pressable onPress={load}>
          <ThemedText type="linkPrimary">Try again</ThemedText>
        </Pressable>
      </ThemedView>
    );
  }

  const activeTrack = tracks[activeTrackIndex];
  const isRecurring = !!pricing.singlePlanPaystackId;

  return (
    <>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.contentContainer}
        keyboardShouldPersistTaps="handled">
        <View style={styles.inner}>
        <View style={styles.header}>
          <ThemedText type="subtitle">Choose your plan</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            Pick one plan per track, then choose a billing cycle.
          </ThemedText>
        </View>

        {/* Billing cycle */}
        <View style={styles.cycleRow}>
          {BILLING_OPTIONS.map((opt) => {
            const active = billingCycle === opt.value;
            return (
              <Pressable
                key={opt.value}
                onPress={() => setBillingCycle(opt.value)}
                style={[
                  styles.cycleChip,
                  {
                    backgroundColor: active ? BrandPrimary : theme.backgroundElement,
                    borderColor: active ? BrandPrimary : theme.backgroundSelected,
                  },
                ]}>
                <ThemedText type="smallBold" style={{ color: active ? '#ffffff' : theme.text }}>
                  {opt.label}
                </ThemedText>
                {opt.badge && (
                  <ThemedText type="small" style={{ color: active ? '#ffe8b0' : '#15803d' }}>
                    {opt.badge}
                  </ThemedText>
                )}
              </Pressable>
            );
          })}
        </View>

        {/* Track tabs */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.trackTabs}>
          {tracks.map((track, i) => {
            const active = activeTrackIndex === i;
            return (
              <Pressable
                key={track.id}
                onPress={() => setActiveTrackIndex(i)}
                style={[
                  styles.trackTab,
                  {
                    backgroundColor: active ? BrandPrimary : theme.backgroundElement,
                    borderColor: active ? BrandPrimary : theme.backgroundSelected,
                  },
                ]}>
                <ThemedText type="small" style={{ color: active ? '#ffffff' : theme.text }}>
                  {track.label}
                </ThemedText>
                {selectedPlans[track.id] && <View style={styles.trackDot} />}
              </Pressable>
            );
          })}
        </ScrollView>

        {/* Plan cards for the active track */}
        {activeTrack && (
          <View style={styles.section}>
            <ThemedText type="small" themeColor="textSecondary">
              {activeTrack.title} — {activeTrack.subtitle}
            </ThemedText>
            {activeTrack.plans.map((plan) => {
              if (plan.isCustom) {
                return (
                  <ThemedView key={plan.id} type="backgroundElement" style={styles.planCard}>
                    <ThemedText type="smallBold">{plan.name}</ThemedText>
                    <ThemedText type="small" themeColor="textSecondary">
                      Custom pricing for larger teams.
                    </ThemedText>
                    <Pressable onPress={() => Linking.openURL(`mailto:${CUSTOM_EMAIL}`)}>
                      <ThemedText type="linkPrimary">Contact sales ›</ThemedText>
                    </Pressable>
                  </ThemedView>
                );
              }

              const selected = selectedPlans[activeTrack.id] === plan.id;
              const isCurrent = currentPlanIds.includes(plan.id);
              const displayPrice = plan.price * BILLING_MULTIPLIERS[billingCycle];

              return (
                <Pressable key={plan.id} onPress={() => togglePlan(activeTrack.id, plan.id)}>
                  <ThemedView
                    type="backgroundElement"
                    style={[
                      styles.planCard,
                      { borderColor: selected ? BrandPrimary : 'transparent' },
                    ]}>
                    <View style={styles.planTop}>
                      <View style={styles.planTitleWrap}>
                        <View style={styles.planTitleRow}>
                          <ThemedText type="smallBold" numberOfLines={1}>
                            {plan.name}
                          </ThemedText>
                          {isCurrent && <Badge label="CURRENT" bg="#dbeafe" color="#1d4ed8" />}
                          {plan.highlight && <Badge label="POPULAR" bg="#fef3c7" color="#b45309" />}
                        </View>
                        <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
                          {plan.forLabel}
                        </ThemedText>
                      </View>
                      <View
                        style={[
                          styles.radio,
                          {
                            borderColor: selected ? BrandPrimary : theme.backgroundSelected,
                            backgroundColor: selected ? BrandPrimary : 'transparent',
                          },
                        ]}>
                        {selected && <ThemedText style={styles.radioTick}>✓</ThemedText>}
                      </View>
                    </View>

                    <ThemedText type="smallBold">
                      {fmtNaira(displayPrice)}
                      <ThemedText type="small" themeColor="textSecondary">
                        {' '}
                        /{CYCLE_SUFFIX[billingCycle]}
                      </ThemedText>
                    </ThemedText>

                    {plan.features?.slice(0, 4).map((f) => (
                      <ThemedText key={f} type="small" themeColor="textSecondary">
                        ✓ {f}
                      </ThemedText>
                    ))}
                  </ThemedView>
                </Pressable>
              );
            })}
          </View>
        )}

        {/* Summary */}
        <ThemedView type="backgroundElement" style={styles.card}>
          <ThemedText type="smallBold">Summary</ThemedText>
          {selectedPlanIds.length === 0 ? (
            <ThemedText type="small" themeColor="textSecondary">
              No plans selected yet.
            </ThemedText>
          ) : (
            <>
              {selectedPlanIds.map((id) => (
                <View key={id} style={styles.row}>
                  <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
                    {planMap[id]?.name}
                  </ThemedText>
                  <ThemedText type="small">{fmtNaira(planMap[id]?.price ?? 0)}/mo</ThemedText>
                </View>
              ))}
              <View style={styles.row}>
                <ThemedText type="small" themeColor="textSecondary">
                  Subtotal ({billingCycle})
                </ThemedText>
                <ThemedText type="small">{fmtNaira(pricing.periodTotal)}</ThemedText>
              </View>
              {pricing.bundleDiscount > 0 && (
                <View style={styles.row}>
                  <ThemedText type="small" themeColor="textSecondary">
                    Bundle discount (7.5%)
                  </ThemedText>
                  <ThemedText type="small" style={styles.discount}>
                    −{fmtNaira(pricing.bundleDiscount)}
                  </ThemedText>
                </View>
              )}
              {pricing.cycleDiscount > 0 && (
                <View style={styles.row}>
                  <ThemedText type="small" themeColor="textSecondary">
                    {billingCycle === 'annually' ? 'Annual' : 'Quarterly'} discount
                  </ThemedText>
                  <ThemedText type="small" style={styles.discount}>
                    −{fmtNaira(pricing.cycleDiscount)}
                  </ThemedText>
                </View>
              )}
              <View style={[styles.row, styles.totalRow]}>
                <ThemedText type="smallBold">Total due now</ThemedText>
                <ThemedText type="smallBold">{fmtNaira(pricing.finalAmount)}</ThemedText>
              </View>
              <ThemedText type="small" themeColor="textSecondary">
                {isRecurring
                  ? 'Recurring — Paystack auto-renews monthly.'
                  : 'One-time payment — no auto-renewal.'}
              </ThemedText>
            </>
          )}
        </ThemedView>

        <Pressable
          onPress={pay}
          disabled={selectedPlanIds.length === 0 || paying}
          style={[
            styles.payButton,
            (selectedPlanIds.length === 0 || paying) && styles.payButtonDisabled,
          ]}>
          {paying ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <ThemedText type="smallBold" style={styles.payButtonText}>
              Pay {fmtNaira(pricing.finalAmount)}
            </ThemedText>
          )}
        </Pressable>

        <ThemedText type="small" themeColor="textSecondary" style={styles.secured}>
          {Platform.OS === 'web'
            ? 'Open the Staxis mobile app to complete payment.'
            : 'Secured by Paystack · Your invoice is emailed on payment.'}
        </ThemedText>
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
  scrollView: { flex: 1 },
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
  inner: {
    flex: 1,
    width: '100%',
    maxWidth: MaxContentWidth,
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.three,
    paddingBottom: BottomTabInset + Spacing.four,
    gap: Spacing.three,
  },
  header: { gap: Spacing.one },
  cycleRow: { flexDirection: 'row', gap: Spacing.two },
  cycleChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.one,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
  },
  trackTabs: { gap: Spacing.two, paddingRight: Spacing.four },
  trackTab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    paddingHorizontal: Spacing.three,
    height: 36,
    borderRadius: Spacing.five,
    borderWidth: 1,
  },
  trackDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#22c55e',
  },
  section: { gap: Spacing.two },
  planCard: {
    borderRadius: Spacing.three,
    padding: Spacing.three,
    gap: Spacing.one,
    borderWidth: 2,
  },
  planTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  planTitleWrap: { flexShrink: 1, gap: Spacing.half },
  planTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    flexWrap: 'wrap',
  },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioTick: { color: '#ffffff', fontSize: 12, lineHeight: 14 },
  card: {
    borderRadius: Spacing.three,
    padding: Spacing.three,
    gap: Spacing.two,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  totalRow: { marginTop: Spacing.one },
  discount: { color: '#15803d' },
  payButton: {
    height: 52,
    borderRadius: 14,
    backgroundColor: BrandPrimary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  payButtonDisabled: { opacity: 0.5 },
  payButtonText: { color: '#ffffff' },
  secured: { textAlign: 'center' },
});
