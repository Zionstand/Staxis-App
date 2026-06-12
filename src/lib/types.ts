export interface ApiPlan {
  id: string;
  name: string;
  price: number;
  features: string[];
  forLabel: string;
  responseTime: string;
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
