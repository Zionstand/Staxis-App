import { Palette } from '@/constants/staxis-theme';
import {
  TicketCategory,
  TicketPriority,
  TicketStatus,
} from '@/lib/types';

type BadgeStyle = { bg: string; color: string };

export const TICKET_STATUS_STYLES: Record<TicketStatus, BadgeStyle> = {
  OPEN: { bg: Palette.infoTint, color: Palette.info },
  IN_PROGRESS: { bg: Palette.warnTint, color: Palette.warn },
  ON_HOLD: { bg: Palette.bone2, color: 'rgba(10,10,15,0.65)' },
  RESOLVED: { bg: Palette.successTint, color: Palette.success },
  CLOSED: { bg: Palette.ash, color: 'rgba(10,10,15,0.48)' },
};

export const TICKET_PRIORITY_STYLES: Record<TicketPriority, BadgeStyle> = {
  LOW: { bg: Palette.bone2, color: 'rgba(10,10,15,0.65)' },
  MEDIUM: { bg: Palette.infoTint, color: Palette.info },
  HIGH: { bg: Palette.warnTint, color: Palette.warn },
  URGENT: { bg: Palette.signalTint, color: Palette.signal },
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

export const TICKET_TOPICS: {
  value: TicketCategory;
  title: string;
  hint: string;
}[] = [
  {
    value: 'TECHNICAL',
    title: "Something isn't working",
    hint: 'Email, devices, network, or a system that is down or misbehaving',
  },
  {
    value: 'BILLING',
    title: 'A billing or payment question',
    hint: 'Invoices, renewals, receipts, or changing your plan',
  },
  {
    value: 'GENERAL',
    title: 'A general question',
    hint: 'Anything else you would like to ask the team',
  },
  {
    value: 'FEATURE_REQUEST',
    title: 'An idea or request',
    hint: 'Something you would like us to set up, change, or build',
  },
];

export const PRIORITY_OPTIONS: TicketPriority[] = [
  'LOW',
  'MEDIUM',
  'HIGH',
  'URGENT',
];

export const TICKET_STATUS_TONE: Record<
  TicketStatus,
  'neutral' | 'success' | 'warn' | 'danger' | 'info'
> = {
  OPEN: 'info',
  IN_PROGRESS: 'warn',
  ON_HOLD: 'neutral',
  RESOLVED: 'success',
  CLOSED: 'neutral',
};

export const statusTone = (status: string) =>
  TICKET_STATUS_TONE[status as TicketStatus] ?? 'neutral';

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
