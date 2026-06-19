import {
  TicketCategory,
  TicketPriority,
  TicketStatus,
} from '@/lib/types';

type BadgeStyle = { bg: string; color: string };

export const TICKET_STATUS_STYLES: Record<TicketStatus, BadgeStyle> = {
  OPEN: { bg: '#dbeafe', color: '#1d4ed8' },
  IN_PROGRESS: { bg: '#fef3c7', color: '#b45309' },
  ON_HOLD: { bg: '#f1f5f9', color: '#64748b' },
  RESOLVED: { bg: '#dcfce7', color: '#15803d' },
  CLOSED: { bg: '#e2e8f0', color: '#475569' },
};

export const TICKET_PRIORITY_STYLES: Record<TicketPriority, BadgeStyle> = {
  LOW: { bg: '#f1f5f9', color: '#64748b' },
  MEDIUM: { bg: '#dbeafe', color: '#1d4ed8' },
  HIGH: { bg: '#fef3c7', color: '#b45309' },
  URGENT: { bg: '#ffe4e6', color: '#be123c' },
};

export const TICKET_STATUS_LABELS: Record<TicketStatus, string> = {
  OPEN: 'Open',
  IN_PROGRESS: 'In Progress',
  ON_HOLD: 'On Hold',
  RESOLVED: 'Resolved',
  CLOSED: 'Closed',
};

export const TICKET_CATEGORY_LABELS: Record<TicketCategory, string> = {
  GENERAL: 'General',
  BILLING: 'Billing',
  TECHNICAL: 'Technical',
  FEATURE_REQUEST: 'Feature Request',
};

export const TICKET_PRIORITY_LABELS: Record<TicketPriority, string> = {
  LOW: 'Low',
  MEDIUM: 'Medium',
  HIGH: 'High',
  URGENT: 'Urgent',
};

/** Tabs shown on the list screen. `value` undefined means "no filter". */
export const STATUS_FILTERS: { label: string; value?: TicketStatus }[] = [
  { label: 'All' },
  { label: 'Open', value: 'OPEN' },
  { label: 'In Progress', value: 'IN_PROGRESS' },
  { label: 'On Hold', value: 'ON_HOLD' },
  { label: 'Resolved', value: 'RESOLVED' },
  { label: 'Closed', value: 'CLOSED' },
];

export const CATEGORY_OPTIONS: TicketCategory[] = [
  'GENERAL',
  'BILLING',
  'TECHNICAL',
  'FEATURE_REQUEST',
];

export const PRIORITY_OPTIONS: TicketPriority[] = [
  'LOW',
  'MEDIUM',
  'HIGH',
  'URGENT',
];

export const statusStyle = (status: string): BadgeStyle =>
  TICKET_STATUS_STYLES[status as TicketStatus] ?? TICKET_STATUS_STYLES.OPEN;

export const priorityStyle = (priority: string): BadgeStyle =>
  TICKET_PRIORITY_STYLES[priority as TicketPriority] ??
  TICKET_PRIORITY_STYLES.LOW;

export const statusLabel = (status: string): string =>
  TICKET_STATUS_LABELS[status as TicketStatus] ?? status;

export const priorityLabel = (priority: string): string =>
  TICKET_PRIORITY_LABELS[priority as TicketPriority] ?? priority;

export const categoryLabel = (category: string): string =>
  TICKET_CATEGORY_LABELS[category as TicketCategory] ?? category;
