import { create } from 'zustand';

import { SubscriptionSnapshot } from '@/lib/subscription';

/** The fields we read off a dashboard/company payload to build the snapshot. */
type CompanyLike = {
  status: string | null;
  paymentVerified?: boolean | null;
  trialEndsAt?: string | null;
  gracePeriodEndsAt?: string | null;
} | null;

type SubscriptionState = {
  snapshot: SubscriptionSnapshot;
  /** True once we've populated from a real payload at least once this session. */
  hydrated: boolean;
  /**
   * When the company is PAST_DUE but still inside its grace window, gated writes
   * succeed and the backend returns `X-Grace-Period-Ends`. Captured here so we can
   * nudge the user to renew before it lapses. Only the server knows this date.
   */
  graceEndsAt: string | null;
  /** Populate from a dashboard `company` object (or null when there's none). */
  setFromCompany: (company: CompanyLike) => void;
  /** Patch just the status — used by the 402 interceptor to reflect the server. */
  setStatus: (status: string | null) => void;
  /** Record the grace-period end date read off a response header. */
  setGraceWarning: (endsAt: string | null) => void;
  /** Fetch the dashboard and refresh the snapshot. Safe to call anywhere. */
  refresh: () => Promise<void>;
  clear: () => void;
};

/**
 * Holds the current company's subscription snapshot so any screen can gate
 * writes without re-fetching. Kept fresh by the dashboard screens (which already
 * load it) and patched by the API 402 interceptor.
 */
export const useSubscriptionStore = create<SubscriptionState>((set, get) => ({
  snapshot: null,
  hydrated: false,
  graceEndsAt: null,

  setFromCompany: (company) =>
    set({
      snapshot: company
        ? {
            status: company.status ?? null,
            paymentVerified: !!company.paymentVerified,
            trialEndsAt: company.trialEndsAt ?? null,
          }
        : null,
      hydrated: true,
      // Prefer the dashboard's grace date; fall back to any date already captured
      // from a response header. Cleared once the status is no longer past due.
      graceEndsAt:
        company?.status === 'PAST_DUE'
          ? (company.gracePeriodEndsAt ?? get().graceEndsAt)
          : null,
    }),

  setStatus: (status) =>
    set((state) => ({
      hydrated: true,
      snapshot: {
        status,
        paymentVerified: state.snapshot?.paymentVerified ?? false,
        trialEndsAt: state.snapshot?.trialEndsAt ?? null,
      },
      graceEndsAt: status === 'PAST_DUE' ? state.graceEndsAt : null,
    })),

  setGraceWarning: (endsAt) => set({ graceEndsAt: endsAt }),

  refresh: async () => {
    // Lazy import to avoid a top-level cycle with api.ts (which imports this store).
    const { fetchData } = await import('@/lib/api');
    try {
      const data = await fetchData<{ company: CompanyLike }>('/user/dashboard');
      get().setFromCompany(data.company ?? null);
    } catch {
      // Best-effort — never block a screen on a subscription refresh.
    }
  },

  clear: () => set({ snapshot: null, hydrated: false, graceEndsAt: null }),
}));
