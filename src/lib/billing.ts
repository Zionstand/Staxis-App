import { ApiPlan, BillingCycle } from '@/lib/types';

// Billing-cycle model — mirrors the web dashboard billing page so the mobile
// app charges the exact same amounts.
export const BILLING_OPTIONS: { value: BillingCycle; label: string; badge?: string }[] = [
  { value: 'monthly', label: 'Monthly' },
  { value: 'quarterly', label: 'Quarterly', badge: '5% off' },
  { value: 'annually', label: 'Annually', badge: '10% off' },
];

export const BILLING_MULTIPLIERS: Record<BillingCycle, number> = {
  monthly: 1,
  quarterly: 3,
  annually: 12,
};

const BILLING_DISCOUNTS: Record<BillingCycle, number> = {
  monthly: 0,
  quarterly: 0.05,
  annually: 0.1,
};

/** Selecting 2+ plans applies a 7.5% bundle discount on the period total. */
const BUNDLE_DISCOUNT_RATE = 0.075;

/** Unique Paystack transaction reference. Matches the web `REF_...` shape. */
export const generateRef = () =>
  `REF_${Date.now()}_${Math.random().toString(36).substring(2, 9).toUpperCase()}`;

export type PlanWithTrack = ApiPlan & { trackTitle: string };

export type Pricing = {
  subtotal: number;
  periodTotal: number;
  bundleDiscount: number;
  cycleDiscount: number;
  totalDiscount: number;
  finalAmount: number;
  /** Set only for a single monthly plan → Paystack recurring subscription. */
  singlePlanPaystackId?: string;
};

/**
 * Compute the charge for a selection, identical to the web dashboard:
 * periodTotal = subtotal × cycle multiplier; 7.5% off for 2+ plans; plus the
 * cycle discount (0 / 5% / 10%); final = periodTotal − both discounts.
 */
export function computePricing(
  selectedPlanIds: string[],
  planMap: Record<string, PlanWithTrack>,
  billingCycle: BillingCycle,
): Pricing {
  const subtotal = selectedPlanIds.reduce((sum, id) => sum + (planMap[id]?.price ?? 0), 0);
  const multiplier = BILLING_MULTIPLIERS[billingCycle];
  const periodTotal = subtotal * multiplier;

  const bundleDiscount =
    selectedPlanIds.length >= 2 ? Math.round(periodTotal * BUNDLE_DISCOUNT_RATE) : 0;
  const cycleDiscount = Math.round(periodTotal * BILLING_DISCOUNTS[billingCycle]);
  const totalDiscount = bundleDiscount + cycleDiscount;
  const finalAmount = periodTotal - totalDiscount;

  const singlePlanPaystackId =
    billingCycle === 'monthly' && selectedPlanIds.length === 1
      ? planMap[selectedPlanIds[0]]?.paystackMonthlyId
      : undefined;

  return {
    subtotal,
    periodTotal,
    bundleDiscount,
    cycleDiscount,
    totalDiscount,
    finalAmount,
    singlePlanPaystackId,
  };
}
