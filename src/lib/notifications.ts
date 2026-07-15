import api, { deleteData, fetchData, postData, updateData } from '@/lib/api';

export type NotificationType =
  | 'ACCOUNT_CREATED'
  | 'EMAIL_VERIFIED'
  | 'PASSWORD_RESET_REQUESTED'
  | 'PASSWORD_RESET_COMPLETED'
  | 'ONBOARDING_COMPLETED'
  | 'PLAN_SUBSCRIBED'
  | 'TRIAL_STARTED'
  | 'TRIAL_ENDED'
  | 'PAYMENT_SUCCESSFUL'
  | 'SUBSCRIPTION_CANCELLED'
  | 'SUBSCRIPTION_PAST_DUE'
  | 'TICKET_CREATED'
  | 'TICKET_STATUS_CHANGED'
  | 'TICKET_MESSAGE_RECEIVED'
  | 'TICKET_ASSIGNED'
  | 'ADDED_TO_COMPANY'
  | 'COMPANY_MANAGER_ASSIGNED'
  | 'AUDIT_SUBMITTED'
  | 'AUDIT_RECOMMENDATIONS_READY';

export interface AppNotification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  isRead: boolean;
  readAt: string | null;
  metadata: Record<string, unknown> | null;
  userId: string | null;
  companyId: string | null;
  recipientType: 'USER' | 'ADMIN';
  createdAt: string;
}

export interface PaginatedNotifications {
  items: AppNotification[];
  total: number;
  page: number;
  limit: number;
}

export interface GetNotificationsQuery {
  page?: number;
  limit?: number;
  unreadOnly?: boolean;
}

// Per-type presentation — emoji icon + short category label. Mirrors web.
type NotificationConfigEntry = { icon: string; label: string };
export const NOTIFICATION_CONFIG: Record<NotificationType, NotificationConfigEntry> = {
  ACCOUNT_CREATED: { icon: '👋', label: 'Account' },
  EMAIL_VERIFIED: { icon: '✅', label: 'Account' },
  PASSWORD_RESET_REQUESTED: { icon: '🔑', label: 'Security' },
  PASSWORD_RESET_COMPLETED: { icon: '🔒', label: 'Security' },
  ONBOARDING_COMPLETED: { icon: '🎉', label: 'Account' },
  PLAN_SUBSCRIBED: { icon: '📦', label: 'Billing' },
  TRIAL_STARTED: { icon: '🚀', label: 'Billing' },
  TRIAL_ENDED: { icon: '⏰', label: 'Billing' },
  PAYMENT_SUCCESSFUL: { icon: '💳', label: 'Billing' },
  SUBSCRIPTION_CANCELLED: { icon: '❌', label: 'Billing' },
  SUBSCRIPTION_PAST_DUE: { icon: '⚠️', label: 'Billing' },
  TICKET_CREATED: { icon: '🎫', label: 'Support' },
  TICKET_STATUS_CHANGED: { icon: '🔄', label: 'Support' },
  TICKET_MESSAGE_RECEIVED: { icon: '💬', label: 'Support' },
  TICKET_ASSIGNED: { icon: '👤', label: 'Support' },
  ADDED_TO_COMPANY: { icon: '🏢', label: 'Company' },
  COMPANY_MANAGER_ASSIGNED: { icon: '👔', label: 'Company' },
  AUDIT_SUBMITTED: { icon: '📋', label: 'Audit' },
  AUDIT_RECOMMENDATIONS_READY: { icon: '📊', label: 'Audit' },
};

function getTicketId(metadata: AppNotification['metadata']): string | null {
  if (!metadata || typeof metadata !== 'object') return null;
  const id = (metadata as { ticketId?: unknown }).ticketId;
  return typeof id === 'string' && id.length > 0 ? id : null;
}

/**
 * Deep link for a notification, in mobile-router form. Tickets open the ticket
 * detail; billing-related types open the Billing tab. Returns null when there's
 * nowhere meaningful to go.
 */
export function getNotificationLink(n: AppNotification): string | null {
  switch (n.type) {
    case 'TICKET_CREATED':
    case 'TICKET_STATUS_CHANGED':
    case 'TICKET_MESSAGE_RECEIVED':
    case 'TICKET_ASSIGNED': {
      const ticketId = getTicketId(n.metadata);
      return ticketId ? `/(tabs)/tickets/${ticketId}` : '/(tabs)/tickets';
    }
    case 'PAYMENT_SUCCESSFUL':
    case 'PLAN_SUBSCRIBED':
    case 'TRIAL_ENDED':
    case 'SUBSCRIPTION_CANCELLED':
    case 'SUBSCRIPTION_PAST_DUE':
      return '/(tabs)/billing';
    default:
      return null;
  }
}

// ── API ─────────────────────────────────────────────────────────────────────

export function getNotifications(
  query: GetNotificationsQuery = {},
): Promise<PaginatedNotifications> {
  const params = new URLSearchParams();
  if (query.page) params.set('page', String(query.page));
  if (query.limit) params.set('limit', String(query.limit));
  if (query.unreadOnly) params.set('unreadOnly', 'true');
  const qs = params.toString();
  return fetchData<PaginatedNotifications>(`/notifications${qs ? `?${qs}` : ''}`);
}

export function getUnreadCount(): Promise<number> {
  return fetchData<number>('/notifications/unread-count');
}

export function markOneRead(id: string): Promise<void> {
  return updateData<void>(`/notifications/${id}/read`, {});
}

export function markAllRead(): Promise<void> {
  return updateData<void>('/notifications/read-all', {});
}

export function deleteNotification(id: string): Promise<void> {
  return deleteData<void>(`/notifications/${id}`);
}

// ── Push tokens ──────────────────────────────────────────────────────────────

export function registerPushToken(
  token: string,
  platform?: 'ios' | 'android',
): Promise<{ ok: boolean }> {
  return postData<{ ok: boolean }>('/notifications/push-token', { token, platform });
}

export async function removePushToken(token: string): Promise<void> {
  // DELETE with a body (the token isn't URL-safe as a path param).
  await api.delete('/notifications/push-token', { data: { token } });
}

/** Diagnostic: ask the backend to push a test notification to this account. */
export function sendTestPush(): Promise<{ ok: boolean; tokenCount: number }> {
  return postData<{ ok: boolean; tokenCount: number }>('/notifications/push-test', {});
}
