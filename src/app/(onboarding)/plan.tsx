import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';

import { Logo } from '@/components/logo';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Badge } from '@/components/ui/badge';
import { BrandPrimary, MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { fetchData, postData, updateData } from '@/lib/api';
import {
  BILLING_OPTIONS,
  computePricing,
  type PlanWithTrack,
} from '@/lib/billing';
import { ApiTrack, BillingCycle } from '@/lib/types';
import { fmtNaira } from '@/lib/utils';
import { useAuth } from '@/store/use-auth';

type Action = 'trial' | 'plan' | 'skip';

export default function OnboardingPlanScreen() {
  const theme = useTheme();
  const setUser = useAuth((s) => s.setUser);

  const [tracks, setTracks] = useState<ApiTrack[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [billingCycle, setBillingCycle] = useState<BillingCycle>('monthly');
  // trackId → planId (one plan per track)
  const [selected, setSelected] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<Action | null>(null);

  const load = useCallback(async () => {
    setError(false);
    setLoading(true);
    try {
      const data = await fetchData<ApiTrack[]>('/plans');
      setTracks(data);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const togglePlan = (trackId: string, planId: string) =>
    setSelected((prev) => {
      if (prev[trackId] === planId) {
        const next = { ...prev };
        delete next[trackId];
        return next;
      }
      return { ...prev, [trackId]: planId };
    });

  const planMap: Record<string, PlanWithTrack> = {};
  for (const track of tracks) {
    for (const plan of track.plans) {
      planMap[plan.id] = { ...plan, trackTitle: track.title };
    }
  }

  const selectedPlanIds = Object.values(selected);
  const pricing = computePricing(selectedPlanIds, planMap, billingCycle);

  const finish = (user: any, to: '/(tabs)' | '/(tabs)/billing/subscribe') => {
    if (user) setUser(user);
    router.replace(to);
  };

  const fail = (e: any, fallback: string) =>
    Alert.alert(
      'Something went wrong',
      e?.response?.data?.message
        ? Array.isArray(e.response.data.message)
          ? e.response.data.message[0]
          : e.response.data.message
        : fallback,
    );

  const startTrial = async () => {
    if (selectedPlanIds.length === 0 || busy) return;
    setBusy('trial');
    try {
      const res = await postData<{ user?: any }>('/onboarding/trial', {
        selectedPlans: selectedPlanIds,
        billingCycle,
      });
      finish(res?.user, '/(tabs)');
    } catch (e) {
      fail(e, 'Could not start your trial. Try again.');
    } finally {
      setBusy(null);
    }
  };

  const continueToPayment = async () => {
    if (selectedPlanIds.length === 0 || busy) return;
    setBusy('plan');
    try {
      // Saves the selection and finishes onboarding; payment happens next on the
      // existing subscribe screen (which the completed account can now reach).
      const res = await postData<{ user?: any }>('/onboarding/plan', {
        selectedPlans: selectedPlanIds,
        billingCycle,
      });
      finish(res?.user, '/(tabs)/billing/subscribe');
    } catch (e) {
      fail(e, 'Could not save your plan. Try again.');
    } finally {
      setBusy(null);
    }
  };

  const skip = async () => {
    if (busy) return;
    setBusy('skip');
    try {
      const res = await updateData<{ user?: any }>('/onboarding/complete', {});
      finish(res?.user, '/(tabs)');
    } catch (e) {
      fail(e, 'Could not continue. Try again.');
    } finally {
      setBusy(null);
    }
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

  const hasSelection = selectedPlanIds.length > 0;

  return (
    <ScrollView
      contentContainerStyle={styles.scrollContent}
      keyboardShouldPersistTaps="handled">
      <Logo width={132} style={styles.logo} />
      <ThemedText type="small" themeColor="textSecondary">
        Step 2 of 2
      </ThemedText>
      <ThemedText type="subtitle">Pick your plans</ThemedText>
      <ThemedText type="small" themeColor="textSecondary" style={styles.intro}>
        Choose one plan per track. Start a free trial, or subscribe now — you can
        change this anytime.
      </ThemedText>

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

      {/* Tracks and plans */}
      {tracks.map((track) => (
        <View key={track.id} style={styles.track}>
          <ThemedText type="smallBold">{track.title}</ThemedText>
          {!!track.subtitle && (
            <ThemedText type="small" themeColor="textSecondary">
              {track.subtitle}
            </ThemedText>
          )}
          {track.plans.map((plan) => {
            const active = selected[track.id] === plan.id;
            return (
              <Pressable
                key={plan.id}
                onPress={() => togglePlan(track.id, plan.id)}
                style={[
                  styles.planCard,
                  {
                    backgroundColor: theme.backgroundElement,
                    borderColor: active ? BrandPrimary : 'transparent',
                  },
                ]}>
                <View style={styles.planTop}>
                  <ThemedText type="smallBold" numberOfLines={1} style={styles.planName}>
                    {plan.name}
                  </ThemedText>
                  <ThemedText type="smallBold">{fmtNaira(plan.price)}/mo</ThemedText>
                </View>
                {!!plan.forLabel && (
                  <ThemedText type="small" themeColor="textSecondary">
                    {plan.forLabel}
                  </ThemedText>
                )}
                {active && <Badge label="Selected" bg="#dcfce7" color="#15803d" />}
              </Pressable>
            );
          })}
        </View>
      ))}

      {/* Summary */}
      {hasSelection && (
        <ThemedView type="backgroundElement" style={styles.summary}>
          <View style={styles.summaryRow}>
            <ThemedText type="small" themeColor="textSecondary">
              {selectedPlanIds.length} plan{selectedPlanIds.length > 1 ? 's' : ''} ·{' '}
              {billingCycle}
            </ThemedText>
            <ThemedText type="smallBold">{fmtNaira(pricing.finalAmount)}</ThemedText>
          </View>
          {pricing.totalDiscount > 0 && (
            <View style={styles.summaryRow}>
              <ThemedText type="small" themeColor="textSecondary">
                Discount
              </ThemedText>
              <ThemedText type="small" style={styles.discount}>
                −{fmtNaira(pricing.totalDiscount)}
              </ThemedText>
            </View>
          )}
        </ThemedView>
      )}

      {/* Actions */}
      <Pressable
        onPress={startTrial}
        disabled={!hasSelection || !!busy}
        style={[styles.button, (!hasSelection || !!busy) && styles.buttonDisabled]}>
        {busy === 'trial' ? (
          <ActivityIndicator color="#ffffff" />
        ) : (
          <ThemedText type="smallBold" style={styles.buttonText}>
            Start 30-day free trial
          </ThemedText>
        )}
      </Pressable>

      <Pressable
        onPress={continueToPayment}
        disabled={!hasSelection || !!busy}
        style={[
          styles.button,
          styles.buttonSecondary,
          { borderColor: theme.backgroundSelected },
          (!hasSelection || !!busy) && styles.buttonDisabled,
        ]}>
        {busy === 'plan' ? (
          <ActivityIndicator color={theme.text} />
        ) : (
          <ThemedText type="smallBold">Subscribe &amp; pay now</ThemedText>
        )}
      </Pressable>

      <Pressable onPress={skip} disabled={!!busy} style={styles.skip}>
        {busy === 'skip' ? (
          <ActivityIndicator />
        ) : (
          <ThemedText type="link" themeColor="textSecondary">
            Skip for now
          </ThemedText>
        )}
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
  },
  scrollContent: {
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.three,
    paddingBottom: Spacing.six,
    gap: Spacing.three,
  },
  logo: {
    alignItems: 'flex-start',
    marginBottom: Spacing.one,
  },
  intro: {
    marginTop: -Spacing.two,
  },
  cycleRow: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  cycleChip: {
    flex: 1,
    paddingVertical: Spacing.two,
    borderRadius: Spacing.two,
    borderWidth: 1,
    alignItems: 'center',
    gap: Spacing.half,
  },
  track: {
    gap: Spacing.two,
  },
  planCard: {
    borderRadius: Spacing.three,
    padding: Spacing.three,
    gap: Spacing.one,
    borderWidth: 2,
  },
  planTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  planName: {
    flexShrink: 1,
  },
  summary: {
    borderRadius: Spacing.three,
    padding: Spacing.three,
    gap: Spacing.one,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  discount: {
    color: '#15803d',
  },
  button: {
    height: 50,
    borderRadius: 12,
    backgroundColor: BrandPrimary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonSecondary: {
    backgroundColor: 'transparent',
    borderWidth: 1,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    color: '#ffffff',
  },
  skip: {
    alignItems: 'center',
    marginTop: Spacing.one,
    minHeight: 24,
    justifyContent: 'center',
  },
});
