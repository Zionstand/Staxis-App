/**
 * On-Demand services — client types and display helpers, ported from the web
 * app's `lib/ondemand.ts`. Scores/prices come from the same backend endpoints
 * the website uses (`/services/*`), so the shapes are identical; only the
 * status → colour mapping is adapted to the mobile `Badge` (bg/color pairs
 * rather than Tailwind class names).
 */

export type ServicePricingType = 'FIXED' | 'HOURLY';

// ── Catalogue ────────────────────────────────────────────────────────────────

export interface ServiceTask {
  id: string;
  categoryId?: string;
  name: string;
  description?: string | null;
  pricingType: ServicePricingType;
  fixedPrice?: number | null;
  unit?: string | null;
  isActive?: boolean;
  order?: number;
}

export interface ServiceCategory {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  hourlyRate: number;
  isActive?: boolean;
  order?: number;
  tasks: ServiceTask[];
}

// ── Requests (custom / hourly work) ──────────────────────────────────────────

export type ServiceRequestStatus =
  | 'REQUESTED'
  | 'SCOPING'
  | 'QUOTED'
  | 'APPROVED'
  | 'INVOICED'
  | 'PAID'
  | 'IN_PROGRESS'
  | 'DELIVERED'
  | 'CLOSED'
  | 'DECLINED'
  | 'CANCELLED';

export interface ServiceRequestItem {
  id: string;
  name: string;
  unitPrice: number;
  quantity: number;
  lineTotal: number;
}

export interface ServiceEvent<S> {
  id: string;
  status: S;
  note?: string | null;
  createdAt: string;
}

export interface ServiceRequest {
  id: string;
  requestNumber: number;
  status: ServiceRequestStatus;
  summary: string;
  details?: string | null;
  afterHours: boolean;
  scopeNotes?: string | null;
  estimatedHours?: number | null;
  quotedAmount?: number | null;
  quotedAt?: string | null;
  items: ServiceRequestItem[];
  events: ServiceEvent<ServiceRequestStatus>[];
  createdAt: string;
  updatedAt: string;
}

// ── Orders (direct fixed-price purchase) ─────────────────────────────────────

export type ServiceOrderStatus =
  | 'PENDING_PAYMENT'
  | 'PAID'
  | 'IN_PROGRESS'
  | 'DELIVERED'
  | 'CLOSED'
  | 'CANCELLED';

export interface ServiceOrderItem {
  id: string;
  name: string;
  unitPrice: number;
  quantity: number;
  lineTotal: number;
}

export interface ServiceOrder {
  id: string;
  orderNumber: number;
  status: ServiceOrderStatus;
  total: number;
  paidAt?: string | null;
  items: ServiceOrderItem[];
  events: ServiceEvent<ServiceOrderStatus>[];
  createdAt: string;
}

// ── Status display (Badge takes bg + color) ──────────────────────────────────

type Pill = { label: string; bg: string; color: string };

const NEUTRAL: Omit<Pill, 'label'> = { bg: '#e2e8f0', color: '#475569' };
const AMBER: Omit<Pill, 'label'> = { bg: '#fef3c7', color: '#b45309' };
const BLUE: Omit<Pill, 'label'> = { bg: '#dbeafe', color: '#1d4ed8' };
const GREEN: Omit<Pill, 'label'> = { bg: '#dcfce7', color: '#15803d' };
const TEAL: Omit<Pill, 'label'> = { bg: '#ccfbf1', color: '#0f766e' };
const ROSE: Omit<Pill, 'label'> = { bg: '#ffe4e6', color: '#be123c' };

export const REQUEST_STATUS: Record<ServiceRequestStatus, Pill> = {
  REQUESTED: { label: 'Requested', ...NEUTRAL },
  SCOPING: { label: 'Scoping', ...NEUTRAL },
  QUOTED: { label: 'Quote ready', ...AMBER },
  APPROVED: { label: 'Approved', ...BLUE },
  INVOICED: { label: 'Invoiced', ...BLUE },
  PAID: { label: 'Paid', ...GREEN },
  IN_PROGRESS: { label: 'In progress', ...TEAL },
  DELIVERED: { label: 'Delivered', ...GREEN },
  CLOSED: { label: 'Closed', ...NEUTRAL },
  DECLINED: { label: 'Declined', ...ROSE },
  CANCELLED: { label: 'Cancelled', ...NEUTRAL },
};

export const ORDER_STATUS: Record<ServiceOrderStatus, Pill> = {
  PENDING_PAYMENT: { label: 'Awaiting payment', ...AMBER },
  PAID: { label: 'Paid', ...GREEN },
  IN_PROGRESS: { label: 'In progress', ...TEAL },
  DELIVERED: { label: 'Delivered', ...GREEN },
  CLOSED: { label: 'Closed', ...NEUTRAL },
  CANCELLED: { label: 'Cancelled', ...ROSE },
};

/** Unique Paystack reference for an on-demand payment. */
export const generateOndemandRef = () =>
  `ODM_${Date.now()}_${Math.random().toString(36).substring(2, 9).toUpperCase()}`;
