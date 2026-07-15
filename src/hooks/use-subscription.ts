import { useMemo } from 'react';

import { computeEntitlement, Entitlement } from '@/lib/subscription';
import { useSubscriptionStore } from '@/store/use-subscription-store';

export type UseSubscription = Entitlement & {
  /** Whether the snapshot has been populated at least once this session. */
  hydrated: boolean;
  /** Convenience alias for `canWrite` at the ticketing call sites. */
  canCreateTickets: boolean;
  /** Grace-period end date (ISO) captured from a response header, if any. */
  graceEndsAt: string | null;
  /** Whole days until the grace period ends (null when unknown/not in grace). */
  graceDaysLeft: number | null;
  /** Re-fetch the dashboard to refresh the subscription snapshot. */
  refresh: () => Promise<void>;
};

/**
 * Read the current subscription entitlement anywhere in the app. Derives the
 * gating flags (mirroring the backend guard) from the shared snapshot; screens
 * use `canCreateTickets` to gate the ticket create/reply UI before the server
 * ever returns a 402.
 */
export function useSubscription(): UseSubscription {
  const snapshot = useSubscriptionStore((s) => s.snapshot);
  const hydrated = useSubscriptionStore((s) => s.hydrated);
  const graceEndsAt = useSubscriptionStore((s) => s.graceEndsAt);
  const refresh = useSubscriptionStore((s) => s.refresh);

  const entitlement = useMemo(
    () => computeEntitlement(snapshot, hydrated),
    [snapshot, hydrated],
  );

  const graceDaysLeft = useMemo(() => {
    if (!entitlement.inGrace || !graceEndsAt) return null;
    const ms = new Date(graceEndsAt).getTime() - Date.now();
    return Math.max(0, Math.ceil(ms / 86_400_000));
  }, [entitlement.inGrace, graceEndsAt]);

  return {
    ...entitlement,
    hydrated,
    canCreateTickets: entitlement.canWrite,
    graceEndsAt: entitlement.inGrace ? graceEndsAt : null,
    graceDaysLeft,
    refresh,
  };
}
