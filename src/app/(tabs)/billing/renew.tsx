import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { EmptyState, StaxisButton, StaxisCard, StaxisText } from '@/components/staxis';
import { ErrorModal } from '@/components/error-modal';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { PaymentAction } from '@/components/payment-action';
import { PaymentReviewSheet } from '@/components/payment-review-sheet';
import { Colors, Palette, Radius, Spacing } from '@/constants/staxis-theme';
import { usePaymentCheckout } from '@/hooks/use-payment-checkout';
import { fetchData, postData } from '@/lib/api';
import { ApiTrack, BILLING_OPTIONS, BillingCycle, PaymentCheckout, createPlanQuoteRequest, getBillingSelection, isValidPaymentAmount, paymentError, priceSubscription, reconcilePlanSelection, requiresPlanQuote } from '@/lib/billing';
import { DashboardData } from '@/lib/types';
import { fmtNaira } from '@/lib/utils';
import { getUserFacingError } from '@/lib/user-facing-error';

export default function RenewScreen() {
  const params = useLocalSearchParams<{ reference?: string }>();
  const [tracks, setTracks] = useState<ApiTrack[]>([]);
  const [selected, setSelected] = useState<Record<string, string>>({});
  const [cycle, setCycle] = useState<BillingCycle>('monthly');
  const [activeTrackId, setActiveTrackId] = useState<string | null>(null);
  const [expandedPlanId, setExpandedPlanId] = useState<string | null>(null);
  const [serviceMenuOpen, setServiceMenuOpen] = useState(false);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [initializing, setInitializing] = useState(false);
  const initializingRef = useRef(false);
  const hydratedSelectionRef = useRef(false);
  const [succeeded, setSucceeded] = useState<'active' | 'review' | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const payment = usePaymentCheckout((result) => setSucceeded(result?.requiresReview ? 'review' : 'active'), params.reference);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(false);
    try {
      const [catalogue, dashboard] = await Promise.all([
        fetchData<ApiTrack[]>('/plans'), fetchData<DashboardData>('/user/dashboard'),
      ]);
      setTracks(catalogue);
      const businessIT = catalogue.find((track) => /business.*it/i.test(track.title));
      setActiveTrackId((previous) => catalogue.some((track) => track.id === previous) ? previous : businessIT?.id ?? catalogue[0]?.id ?? null);
      setExpandedPlanId(null);
      setServiceMenuOpen(false);
      const ids = new Set(dashboard.company?.plans.map((plan) => plan.id));
      const alreadyHydrated = hydratedSelectionRef.current;
      setSelected((previous) => {
        if (alreadyHydrated) return reconcilePlanSelection(catalogue, previous);
        const selection: Record<string, string> = {};
        for (const track of catalogue) {
          const held = track.plans.find((plan) => ids.has(plan.id));
          if (held) selection[track.id] = held.id;
        }
        return selection;
      });
      if (!alreadyHydrated) {
        const currentCycle = dashboard.company?.subscriptionType;
        setCycle(currentCycle === 'annually' || currentCycle === 'quarterly' ? currentCycle : 'monthly');
      }
      hydratedSelectionRef.current = true;
    } catch (error) { setLoadError(true); setErrorMessage(getUserFacingError(error, 'Could not load plans. Please try again.')); }
    finally { setLoading(false); }
  }, []);

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  const { plans, pricedPlans, quotePlans } = getBillingSelection(tracks, selected);
  const price = priceSubscription(pricedPlans, cycle);
  const busy = initializing || payment.busy || payment.restoring || payment.restoreFailed;
  const activeTrack = tracks.find((track) => track.id === activeTrackId);
  const chooseService = (id: string) => {
    setActiveTrackId(id);
    setExpandedPlanId(null);
    setServiceMenuOpen(false);
  };
  const validSelection = pricedPlans.length > 0 && isValidPaymentAmount(price.total);
  const requestQuote = (requestedPlans = quotePlans) => {
    if (busy || !requestedPlans.length) return;
    setReviewOpen(false);
    router.push({
      pathname: '/(tabs)/support/new',
      params: createPlanQuoteRequest(requestedPlans.map((plan) => ({
        name: plan.name,
        trackTitle: tracks.find((track) => track.plans.some((item) => item.id === plan.id))?.title ?? 'Service',
      })), cycle),
    });
  };
  const errorModal = <ErrorModal message={errorMessage ?? payment.errorMessage} onDismiss={() => { setErrorMessage(null); payment.setErrorMessage(null); }} />;

  const pay = async () => {
    if (busy || payment.checkout || initializingRef.current) return;
    if (!validSelection) {
      setErrorMessage('Select a plan with a valid price before making a payment. You cannot pay a zero amount.');
      return;
    }
    initializingRef.current = true;
    setInitializing(true);
    payment.setMessage(null);
    try {
      const checkout = await postData<PaymentCheckout>('/payment/initialize', {
        selectedPlans: pricedPlans.map((plan) => plan.id), billingCycle: cycle,
        autoRenew: cycle === 'monthly' && pricedPlans.length === 1,
      });
      await payment.saveCheckout(checkout);
      setReviewOpen(false);
      // The server is authoritative. Show any changed price before payment.
      if (checkout.amount !== price.total) {
        payment.setMessage(`The current checkout total is ${fmtNaira(checkout.amount)}. Review it above, then tap Continue payment.`);
      } else payment.setMessage('Your checkout is ready. Review the details, then continue to Paystack.');
    } catch (error) { setErrorMessage(paymentError(error)); }
    finally { initializingRef.current = false; setInitializing(false); }
  };

  if (succeeded) return (
    <View style={styles.center}>
      <EmptyState title={succeeded === 'review' ? 'Payment received' : 'Payment confirmed'}
        message={succeeded === 'review' ? 'Your newer subscription stays active. This older payment has been recorded for admin review. Contact Support for help with its resolution.' : 'Your subscription is active. Your billing history has been updated.'}
        action={{ label: 'Back to billing', onPress: () => router.replace('/(tabs)/billing') }} />
      {succeeded === 'review' && <StaxisButton label="Contact Support" variant="ghost" onPress={() => router.replace('/(tabs)/support')} />}
    </View>
  );

  if (payment.restoring || (loading && !payment.checkout)) return (
    <View style={styles.center}><ActivityIndicator color={Palette.signal} /></View>
  );

  if (payment.checkout) return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
      <StaxisCard title="Payment in progress">
        <StaxisText variant="formHint">Awaiting payment confirmation</StaxisText>
        <StaxisText variant="metricValue">{fmtNaira(payment.checkout.amount)}</StaxisText>
        <StaxisText variant="bodySm">{BILLING_OPTIONS.find((option) => option.value === payment.checkout?.billingCycle)?.label} subscription · NGN</StaxisText>
        {payment.checkout.billingCycle === 'monthly' && payment.checkout.selectedPlans.length === 1 && payment.checkout.autoRenew && (
          <StaxisText variant="bodySm">This single-plan monthly subscription renews automatically. You can stop future renewals from Billing.</StaxisText>
        )}
        {payment.checkout.lineItems?.length ? payment.checkout.lineItems.map((item) => (
          <View key={item.planId} style={styles.checkoutItem}>
            <StaxisText variant="displaySm">{item.name}</StaxisText>
            <StaxisText variant="formHint">{item.trackTitle}</StaxisText>
            <StaxisText variant="bodySm">{fmtNaira(item.periodAmount)} for this period</StaxisText>
          </View>
        )) : payment.checkout.selectedPlans.map((id) => (
          <StaxisText key={id} variant="bodySm">{tracks.flatMap((track) => track.plans).find((plan) => plan.id === id)?.name ?? `Plan reference: ${id}`}</StaxisText>
        ))}
        <View style={styles.row}><StaxisText variant="bodySm">Subtotal</StaxisText><StaxisText variant="bodySm">{fmtNaira(payment.checkout.subtotal ?? payment.checkout.amount + payment.checkout.discountAmount)}</StaxisText></View>
        {payment.checkout.bundleDiscount !== undefined && payment.checkout.cycleDiscount !== undefined ? <>
          {payment.checkout.bundleDiscount > 0 && <View style={styles.row}><StaxisText variant="bodySm">Bundle saving</StaxisText><StaxisText variant="bodySm" style={styles.saving}>−{fmtNaira(payment.checkout.bundleDiscount)}</StaxisText></View>}
          {payment.checkout.cycleDiscount > 0 && <View style={styles.row}><StaxisText variant="bodySm">Period saving</StaxisText><StaxisText variant="bodySm" style={styles.saving}>−{fmtNaira(payment.checkout.cycleDiscount)}</StaxisText></View>}
        </> : payment.checkout.discountAmount > 0 && <View style={styles.row}><StaxisText variant="bodySm">Discounts</StaxisText><StaxisText variant="bodySm" style={styles.saving}>−{fmtNaira(payment.checkout.discountAmount)}</StaxisText></View>}
        <View style={styles.row}><StaxisText variant="cardTitle">Total to pay</StaxisText><StaxisText variant="displaySm">{fmtNaira(payment.checkout.amount)}</StaxisText></View>
        <StaxisText variant="formHint">Payment provider: Paystack. Card and bank details are entered in secure checkout.</StaxisText>
        <StaxisText variant="formHint" selectable>Reference: {payment.checkout.reference}</StaxisText>
        <StaxisText variant="bodySm">If you have paid, check your payment before starting another checkout.</StaxisText>
        {payment.message && <StaxisText accessibilityRole="alert" variant="bodySm">{payment.message}</StaxisText>}
        <StaxisButton label={payment.busy ? 'Checking payment…' : 'Check payment'} disabled={busy} onPress={() => void payment.verify()} block />
        <StaxisButton variant="ghost" label="Continue payment" disabled={busy} onPress={() => void payment.openCheckout(payment.checkout!)} block />
        {payment.canRestart && <StaxisButton variant="ghost" label="Start a new checkout" disabled={busy}
          onPress={() => void payment.restart().catch((error) => setErrorMessage(getUserFacingError(error, 'Could not reset checkout. Please try again.')))} block />}
        <StaxisButton variant="outlineDanger" label="Cancel payment" disabled={busy} onPress={() => setCancelOpen(true)} block />
      </StaxisCard>
      <StaxisText variant="formHint">After paying, close the Paystack browser to return to the app. You can also return later and check this reference.</StaxisText>
      {errorModal}
      <ConfirmDialog visible={cancelOpen} title="Cancel payment?" message="Your checkout will remain Pending in billing history. You can resume it or remove it there. Any payment already sent can still settle."
        confirmLabel="Cancel and return to billing" onConfirm={() => { setCancelOpen(false); router.replace('/(tabs)/billing'); }} onDismiss={() => setCancelOpen(false)} busy={busy} />
    </ScrollView>
  );

  if (loadError) return (
    <View style={styles.center}><EmptyState title="Couldn't load plans" message="Check your connection and try again."
      action={{ label: 'Retry', onPress: load }} />{errorModal}</View>
  );

  const summary = (
    <View style={styles.summary}>
        <View style={styles.row}>
          <StaxisText variant="cardTitle">{pricedPlans.length ? 'Payment summary' : 'Quote summary'}</StaxisText>
          <StaxisText variant="metricLabel">{plans.length} plan{plans.length === 1 ? '' : 's'}</StaxisText>
        </View>
        {plans.map((plan) => (
          <View key={plan.id} style={styles.reviewPlan}>
            <StaxisText variant="displaySm">{plan.name}</StaxisText>
            <StaxisText variant="bodySm">{requiresPlanQuote(plan) ? 'Custom pricing · Quote required' : `${fmtNaira(plan.price)}/mo`}</StaxisText>
            <StaxisText variant="formHint">{tracks.find((track) => track.plans.some((item) => item.id === plan.id))?.title}</StaxisText>
            <StaxisButton variant="ghost" size="sm" label={`Remove ${plan.name}`} disabled={busy} onPress={() => {
              const next = { ...selected };
              const trackId = Object.keys(next).find((id) => next[id] === plan.id);
              if (trackId) delete next[trackId];
              setSelected(next);
              if (Object.keys(next).length === 0) setReviewOpen(false);
            }} />
          </View>
        ))}
        {quotePlans.length > 0 && <View style={styles.quoteNotice}>
          <StaxisText variant="listTitle">{quotePlans.length} plan{quotePlans.length === 1 ? '' : 's'} need a custom quote</StaxisText>
          <StaxisText variant="bodySm">Support will confirm the scope and price. These plans are arranged separately and are not included in your payment total.</StaxisText>
          <StaxisButton label={quotePlans.length === 1 ? 'Request custom quote' : 'Request custom quotes'} disabled={busy} onPress={() => requestQuote()} block />
        </View>}
        <View accessibilityRole="radiogroup" accessibilityLabel={pricedPlans.length ? 'Payment period' : 'Preferred billing period for your quote'} style={styles.cycles}>
          {BILLING_OPTIONS.map((option) => (
            <Pressable key={option.value} disabled={busy} accessibilityRole="radio"
              accessibilityLabel={`${option.label}${pricedPlans.length && option.discount ? `, ${option.discount * 100}% saving` : ''}`}
              accessibilityState={{ selected: cycle === option.value, disabled: busy }}
              onPress={() => setCycle(option.value)} style={[styles.cycle, cycle === option.value && styles.selected]}>
              <StaxisText variant="listTitle">{option.label}</StaxisText>
              <StaxisText variant="formHint">{pricedPlans.length ? option.discount ? `${option.discount * 100}% off` : 'Pay monthly' : 'Request quote'}</StaxisText>
            </Pressable>
          ))}
        </View>
        {validSelection ? <>
        <View style={styles.row}>
          <StaxisText variant="bodySm">Subtotal</StaxisText>
          <StaxisText variant="bodySm">{fmtNaira(price.subtotal)}</StaxisText>
        </View>
        {price.bundleDiscount > 0 && (
          <View style={styles.row}>
            <StaxisText variant="bodySm" style={styles.flex}>Bundle saving</StaxisText>
            <StaxisText variant="bodySm" style={styles.saving}>−{fmtNaira(price.bundleDiscount)}</StaxisText>
          </View>
        )}
        {price.cycleDiscount > 0 && <View style={styles.row}><StaxisText variant="bodySm">Period saving</StaxisText><StaxisText variant="bodySm" style={styles.saving}>−{fmtNaira(price.cycleDiscount)}</StaxisText></View>}
        <View style={styles.row}>
          <StaxisText variant="listTitle">Total to pay</StaxisText>
          <StaxisText variant="displayMd">{fmtNaira(price.total)}</StaxisText>
        </View>
        {payment.message && <StaxisText accessibilityRole="alert" variant="formHint" style={{ color: Palette.signal }}>{payment.message}</StaxisText>}
        <PaymentAction label={initializing ? 'Preparing checkout…' : quotePlans.length ? `Pay for ${pricedPlans.length} priced plan${pricedPlans.length === 1 ? '' : 's'}` : 'Proceed to payment'}
          disabled={busy} onPress={() => void pay()} />
        </> : <StaxisText variant="formHint">{quotePlans.length ? 'Your quote request does not require an online payment.' : 'Select a plan to see your total.'}</StaxisText>}
    </View>
  );

  return (
    <View style={styles.scroll}>
      <View style={styles.serviceHeader}>
        <StaxisText variant="eyebrow" style={styles.serviceLabel}>Your service</StaxisText>
        <Pressable disabled={busy || !tracks.length} accessibilityRole="button"
          accessibilityLabel={`Service: ${activeTrack?.title ?? 'No services available'}`}
          accessibilityHint="Open the service list to choose a different service"
          accessibilityState={{ expanded: serviceMenuOpen, disabled: busy || !tracks.length }}
          onPress={() => setServiceMenuOpen((open) => !open)} style={styles.serviceSelector}>
          <StaxisText variant="listTitle" style={styles.flex}>{activeTrack?.title ?? 'No services available'}</StaxisText>
          <StaxisText variant="listTitle" accessible={false}>{serviceMenuOpen ? '⌃' : '⌄'}</StaxisText>
        </Pressable>
        {serviceMenuOpen && (
          <ScrollView style={styles.serviceMenu} accessibilityRole="radiogroup" accessibilityLabel="Service groups">
            {tracks.map((track) => (
              <Pressable key={track.id} disabled={busy} accessibilityRole="radio"
                accessibilityState={{ checked: activeTrackId === track.id, disabled: busy }}
                onPress={() => chooseService(track.id)}
                style={[styles.serviceOption, activeTrackId === track.id && styles.activeOption]}>
                <StaxisText variant="listTitle" style={styles.flex}>{track.title}</StaxisText>
                {selected[track.id] && <StaxisText variant="formHint" style={styles.serviceSelection}>{track.plans.find((plan) => plan.id === selected[track.id])?.name} selected</StaxisText>}
                {activeTrackId === track.id && <StaxisText variant="listTitle" accessible={false}>✓</StaxisText>}
              </Pressable>
            ))}
          </ScrollView>
        )}
      </View>
      <ScrollView key={activeTrackId} style={styles.flex} contentContainerStyle={styles.content}>
        {!activeTrack?.plans.length && <EmptyState title="No plans available" message="Contact Support for help with this service." />}
        {activeTrack?.plans.map((plan) => {
              const chosen = selected[activeTrack.id] === plan.id;
              const expanded = expandedPlanId === plan.id;
              const custom = requiresPlanQuote(plan);
              return (
                <View key={plan.id} style={[styles.plan, chosen && styles.selected]}>
                  <View style={styles.planHeader}>
                    <Pressable disabled={busy} accessibilityRole="button" accessibilityLabel={`${plan.name}, ${chosen ? 'selected, ' : ''}${custom ? 'Custom pricing, quote required' : `${fmtNaira(plan.price)} per month`}, details`}
                      accessibilityState={{ expanded, selected: chosen, disabled: busy }} onPress={() => {
                        setSelected((previous) => ({ ...previous, [activeTrack.id]: plan.id }));
                        setExpandedPlanId(expanded ? null : plan.id);
                      }}
                      style={styles.planToggle}>
                      <View style={styles.planHeading}>
                        <View style={styles.planNameRow}>
                          <StaxisText variant="displaySm" style={styles.planName}>{plan.name}</StaxisText>
                          {chosen && <StaxisText variant="formHint" style={styles.selectionActive}>Selected</StaxisText>}
                        </View>
                        <StaxisText variant="bodySm">{custom ? 'Custom pricing · Quote required' : `${fmtNaira(plan.price)}/mo`}</StaxisText>
                      </View>
                      <StaxisText variant="listTitle" accessible={false}>{expanded ? '⌃' : '⌄'}</StaxisText>
                    </Pressable>
                  </View>
                  {expanded && (
                    <View style={styles.planDetails}>
                      {!!plan.forLabel && <StaxisText variant="listSub">{plan.forLabel}</StaxisText>}
                      {!!plan.responseTime && <StaxisText variant="bodySm">Response time: {plan.responseTime}</StaxisText>}
                      {plan.features?.map((feature, index) => <StaxisText key={`${index}:${feature}`} variant="bodySm">• {feature}</StaxisText>)}
                      {custom && <>
                        <StaxisText variant="bodySm">Support will confirm a price for your requirements before you pay.</StaxisText>
                        <StaxisButton label="Request custom quote" disabled={busy} onPress={() => requestQuote([plan])} block />
                      </>}
                    </View>
                  )}
                </View>
              );
            })}
      </ScrollView>
      {plans.length > 0 && <PaymentReviewSheet open={reviewOpen} onOpen={() => setReviewOpen(true)} onClose={() => setReviewOpen(false)} disabled={busy}
        title={pricedPlans.length ? 'Review your payment' : 'Review your quote'}
        label={`Review ${plans.length} plan${plans.length === 1 ? '' : 's'} · ${validSelection ? fmtNaira(price.total) : 'Custom quote'}`}>{summary}</PaymentReviewSheet>}
      {errorModal}
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: Colors.bgApp },
  content: { padding: Spacing.xl, gap: Spacing.md },
  center: { flex: 1, backgroundColor: Colors.bgApp, alignItems: 'center', justifyContent: 'center' },
  cycles: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  cycle: { flex: 1, minWidth: Spacing.xxxl * 2, padding: Spacing.sm, alignItems: 'center', borderWidth: 1, borderColor: Colors.line, borderRadius: Radius.sm, backgroundColor: Colors.bgCard },
  plan: { borderWidth: 1, borderColor: Colors.lineStrong, borderRadius: Radius.lg + Spacing.sm, backgroundColor: Palette.bone },
  planHeader: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.md },
  selectionActive: { color: Palette.signal },
  planToggle: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, paddingVertical: Spacing.lg, paddingRight: Spacing.sm },
  planHeading: { flex: 1, gap: Spacing.xs },
  planNameRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: Spacing.sm },
  planName: { flexShrink: 1 },
  planDetails: { padding: Spacing.lg, paddingTop: Spacing.sm, gap: Spacing.sm, borderTopWidth: 1, borderTopColor: Colors.line },
  selected: { borderColor: Palette.signal, backgroundColor: Palette.signalTint },
  summary: { gap: Spacing.lg },
  reviewPlan: { paddingBottom: Spacing.lg, gap: Spacing.sm, borderBottomWidth: 1, borderBottomColor: Colors.line },
  quoteNotice: { padding: Spacing.lg, gap: Spacing.sm, borderRadius: Radius.md, backgroundColor: Palette.bone2 },
  checkoutItem: { paddingVertical: Spacing.lg, gap: Spacing.xs, borderBottomWidth: 1, borderBottomColor: Colors.line },
  saving: { color: Palette.success },
  serviceHeader: { paddingHorizontal: Spacing.xl, paddingTop: Spacing.lg, backgroundColor: Colors.bgApp },
  serviceLabel: { color: Colors.text3, marginBottom: Spacing.sm },
  serviceSelector: { backgroundColor: Colors.bgCard, borderColor: Colors.line, borderWidth: 1, borderRadius: Radius.md, padding: Spacing.md, minHeight: Spacing.xxxl, flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  serviceMenu: { maxHeight: Spacing.xxxl * 4, marginTop: Spacing.sm, backgroundColor: Colors.bgCard, borderRadius: Radius.md },
  serviceOption: { padding: Spacing.lg, minHeight: Spacing.xxxl, flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, borderBottomWidth: 1, borderBottomColor: Colors.line },
  activeOption: { backgroundColor: Palette.signalTint },
  serviceSelection: { flexShrink: 1, textAlign: 'right' },
  row: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: Spacing.sm },
  flex: { flex: 1 },
});
