// Client-side mirror of the backend SubscriptionGuard
// (backend/src/guards/subscription.guard.ts). The server is always the source of
// truth — this only drives UX (gating buttons, showing paywalls) so we fail
// gracefully instead of letting users hit a raw 402 mid-action.

export type SubStatus = 'ACTIVE' | 'TRIAL' | 'PAST_DUE' | 'CANCELLED';

/** The subset of company fields the client knows about the subscription. */
export type SubscriptionSnapshot = {
  status: string | null;
  paymentVerified: boolean;
  trialEndsAt: string | null;
} | null;

export type EntitlementReason =
  | 'ok'
  | 'setup_required' // no company yet — user hasn't completed onboarding
  | 'payment_required' // ACTIVE but never verified a payment
  | 'trial_expired'
  | 'past_due' // grace period — allowed optimistically, server has final say
  | 'cancelled'
  | 'unknown';

export type Entitlement = {
  status: string | null;
  /** Can the user create tickets / post replies (any gated write). */
  canWrite: boolean;
  /** PAST_DUE: allowed for now but should be nudged to settle. */
  inGrace: boolean;
  reason: EntitlementReason;
  /** User-facing copy, aligned with the backend guard's messages. */
  message: string;
  /** Whole days until the trial ends (null when not on trial). */
  trialDaysLeft: number | null;
};

const MESSAGES: Record<EntitlementReason, string> = {
  ok: '',
  setup_required:
    'Set up your company and choose a plan to open a support ticket.',
  payment_required:
    'Complete your payment to activate your subscription and open a ticket.',
  trial_expired: 'Your free trial has ended. Subscribe to open a ticket.',
  past_due:
    'Your payment is past due. Renew soon to keep support access.',
  cancelled:
    'Your subscription has been cancelled. Resubscribe to open a ticket.',
  unknown: '',
};

function daysLeft(iso: string | null): number | null {
  if (!iso) return null;
  const ms = new Date(iso).getTime() - Date.now();
  return Math.max(0, Math.ceil(ms / 86_400_000));
}

/**
 * Decide whether the current subscription state permits gated writes.
 * Mirrors the backend precedence: ACTIVE needs a verified payment; TRIAL must be
 * within its window; PAST_DUE is allowed optimistically (the server enforces the
 * 7-day grace it alone can see); CANCELLED is blocked.
 *
 * `hydrated` disambiguates an absent snapshot: before the state has loaded we stay
 * optimistic (the server is the backstop), but once loaded a missing company means
 * the user hasn't onboarded — they must set up a company and plan first.
 */
export function computeEntitlement(
  snapshot: SubscriptionSnapshot,
  hydrated = false,
): Entitlement {
  const status = snapshot?.status ?? null;

  const base = (
    reason: EntitlementReason,
    canWrite: boolean,
    inGrace = false,
  ): Entitlement => ({
    status,
    canWrite,
    inGrace,
    reason,
    message: MESSAGES[reason],
    trialDaysLeft: snapshot ? daysLeft(snapshot.trialEndsAt) : null,
  });

  // No company on record. Not-yet-loaded → optimistic pass; loaded → the user has
  // no company/subscription, so gated writes are blocked until they onboard.
  if (!snapshot || !status) return base(hydrated ? 'setup_required' : 'unknown', !hydrated);

  switch (status) {
    case 'ACTIVE':
      return snapshot.paymentVerified
        ? base('ok', true)
        : base('payment_required', false);

    case 'TRIAL': {
      const active = !!snapshot.trialEndsAt && new Date(snapshot.trialEndsAt) > new Date();
      return active ? base('ok', true) : base('trial_expired', false);
    }

    case 'PAST_DUE':
      // Client can't see gracePeriodEndsAt — allow and let the server 402 if the
      // grace window has actually closed.
      return base('past_due', true, true);

    case 'CANCELLED':
      return base('cancelled', false);

    default:
      return base('unknown', true);
  }
}
