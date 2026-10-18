import type { ApiPlan } from '@/lib/types';
import { getUserFacingError } from '@/lib/user-facing-error';

export type BillingCycle = 'monthly' | 'quarterly' | 'annually';
export function isValidPaymentAmount(amount: number) {
  return Number.isFinite(amount) && amount >= 0.01 && Number.isSafeInteger(Math.round(amount * 100));
}

export function isTrustedPaystackCheckoutUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && url.hostname === 'checkout.paystack.com' &&
      url.port === '' && url.username === '' && url.password === '';
  } catch {
    return false;
  }
}
export interface ApiTrack {
  id: string;
  title: string;
  plans: (ApiPlan & { isCustom?: boolean })[];
}

export function requiresPlanQuote(plan: ApiPlan & { isCustom?: boolean }) {
  return !!plan.isCustom || !isValidPaymentAmount(plan.price);
}

export function reconcilePlanSelection(tracks: ApiTrack[], selected: Record<string, string>) {
  const selection: Record<string, string> = {};
  for (const track of tracks) {
    const plan = track.plans.find((item) => item.id === selected[track.id]);
    if (plan) selection[track.id] = plan.id;
  }
  return selection;
}

export function getBillingSelection(tracks: ApiTrack[], selected: Record<string, string>) {
  const plans = tracks.flatMap((track) => track.plans.filter((plan) => selected[track.id] === plan.id));
  return {
    plans,
    pricedPlans: plans.filter((plan) => !requiresPlanQuote(plan)),
    quotePlans: plans.filter(requiresPlanQuote),
  };
}

export const BILLING_OPTIONS = [
  { value: 'monthly', label: 'Monthly', months: 1, discount: 0 },
  { value: 'quarterly', label: 'Quarterly', months: 3, discount: 0.05 },
  { value: 'annually', label: 'Annually', months: 12, discount: 0.1 },
] as const;

export function createPlanQuoteRequest(plans: { name: string; trackTitle: string }[], cycle: BillingCycle) {
  const period = BILLING_OPTIONS.find((option) => option.value === cycle)!.label;
  return {
    quoteSubject: `Custom quote: ${plans.map((plan) => `${plan.name} (${plan.trackTitle})`).join(', ')}`.slice(0, 150),
    quoteDescription: `I'd like a custom quote for:\n\n${plans.map((plan) => `• ${plan.name} — ${plan.trackTitle}`).join('\n')}\n\nPreferred billing period: ${period}.\n\nPlease help me confirm the scope, pricing, and next steps.`,
  };
}

export function priceSubscription(plans: ApiPlan[], cycle: BillingCycle) {
  const option = BILLING_OPTIONS.find((item) => item.value === cycle)!;
  const subtotal = plans.reduce((sum, plan) => sum + plan.price, 0) * option.months;
  const bundleDiscount = plans.length >= 2 ? Math.round(subtotal * 0.075) : 0;
  const cycleDiscount = Math.round(subtotal * option.discount);
  return { subtotal, bundleDiscount, cycleDiscount, total: subtotal - bundleDiscount - cycleDiscount };
}

export interface PaymentCheckout {
  /** Present on durable server attempts; older local-only checkouts omit it. */
  status?: 'Pending';
  authorizationUrl: string;
  reference: string;
  selectedPlans: string[];
  billingCycle: BillingCycle;
  amount: number;
  discountAmount: number;
  mode: 'replace';
  subtotal?: number;
  bundleDiscount?: number;
  cycleDiscount?: number;
  lineItems?: { planId: string; name: string; trackTitle: string; monthlyAmount: number; periodAmount: number }[];
  autoRenew?: boolean;
}

export interface PaymentConfirmation {
  requiresReview?: boolean;
}

export function verificationPayload(checkout: PaymentCheckout) {
  const { reference, selectedPlans, billingCycle, amount, discountAmount, mode } = checkout;
  return { reference, selectedPlans, billingCycle, amount, discountAmount, mode };
}

export function paymentError(error: unknown) {
  const failure = error as { response?: { status?: number; data?: { code?: string; paymentStatus?: string } } };
  if (failure?.response?.status === 400 && failure.response.data?.code === 'PAYMENT_NOT_SUCCESSFUL') {
    return ['failed', 'abandoned'].includes(failure.response.data.paymentStatus ?? '')
      ? 'This payment did not complete. Check payment before starting a new checkout.'
      : 'Your payment is not confirmed yet. If you have paid, wait a moment and check payment again.';
  }
  return getUserFacingError(error, 'Could not complete the payment request. Please try again or contact Support if it continues.');
}
