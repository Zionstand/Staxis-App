export interface ApiPlan {
  id: string;
  name: string;
  price: number;
  setupFee?: number;
  features: string[];
  forLabel: string;
  responseTime: string;
  highlight?: boolean;
  isCustom?: boolean;
  /** Paystack recurring-plan id, used for single monthly subscriptions. */
  paystackMonthlyId?: string;
}

/** A pricing track (e.g. Web / IT / Data), each holding selectable plans. */
export interface ApiTrack {
  id: string;
  label: string;
  color: string;
  title: string;
  subtitle: string;
  plans: ApiPlan[];
}

export type BillingCycle = 'monthly' | 'quarterly' | 'annually';

export interface Manager {
  id: string;
  adminId: string;
  position: string;
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string | null;
  image: string | null;
  assignedAt: string;
}

export interface Company {
  id: string;
  name: string;
  logoUrl: string | null;
  createdAt: string;
  plans: ApiPlan[];
  amount: number;
  bundleDiscount: number;
  status: string;
  nextBilling: string | null;
  trialEndsAt: string | null;
  gracePeriodEndsAt: string | null;
  paymentVerified: boolean;
  subscriptionType: string;
}

export interface Transaction {
  id: string;
  amount: number;
  description: string;
  status: string;
  date: string;
  type: string;
}

export interface TransactionsPage {
  transactions: Transaction[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

export interface DashboardData {
  company: Company | null;
  transactions: Transaction[];
  openTicketsCount: number;
  resolvedTicketsCount: number;
  totalSpent: number;
  managers: Manager[];
}

export interface ProfileCompany {
  id: string;
  name: string;
  websiteUrl: string | null;
  industry: string | null;
  companySize: string | null;
  companyPhone: string | null;
  logoUrl: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  rcNumber: string | null;
}

export interface ProfileData {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  username: string | null;
  phoneNumber: string | null;
  image: string | null;
  dob: string | null;
  gender: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  role: string;
  onboardingCompleted: boolean;
  createdAt: string;
  adminPosition: string | null;
  company: ProfileCompany | null;
}

export type TicketStatus =
  | 'OPEN'
  | 'IN_PROGRESS'
  | 'ON_HOLD'
  | 'RESOLVED'
  | 'CLOSED';
export type TicketPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
export type TicketCategory =
  | 'GENERAL'
  | 'BILLING'
  | 'TECHNICAL'
  | 'FEATURE_REQUEST';

export interface TicketParty {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
}

export interface TicketListItem {
  id: string;
  ticketNumber: number;
  subject: string;
  category: string;
  priority: string;
  status: string;
  resolvedAt: string | null;
  createdAt: string;
  updatedAt: string;
  company: { id: string; name: string };
  createdBy: TicketParty;
  assignedTo: TicketParty | null;
}

export interface TicketMessage {
  id: string;
  body: string;
  isInternal: boolean;
  senderType: 'USER' | 'ADMIN';
  createdAt: string;
  sender: {
    id: string;
    firstName: string;
    lastName: string;
    role: string;
  };
}

export interface TicketDetail extends TicketListItem {
  description: string;
  messages: TicketMessage[];
}
