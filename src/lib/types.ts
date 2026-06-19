export interface ApiPlan {
  id: string;
  name: string;
  price: number;
  setupFee?: number;
  features: string[];
  forLabel: string;
  responseTime: string;
  highlight?: boolean;
}

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
