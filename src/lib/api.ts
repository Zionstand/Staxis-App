import axios, { AxiosError, AxiosInstance } from 'axios';
import { router } from 'expo-router';
import { Alert } from 'react-native';

import { env } from '@/lib/env';
import { tokenStorage } from '@/lib/token-storage';
import { useAuth } from '@/store/use-auth';
import { useSubscriptionStore } from '@/store/use-subscription-store';

const api: AxiosInstance = axios.create({
  baseURL: env.BACKEND_URL,
  headers: { 'Content-Type': 'application/json' },
});

const PUBLIC_ROUTES = [
  '/auth/login',
  '/auth/register',
  '/auth/forgot-password',
  '/auth/verify-code',
  '/auth/set-new-password',
  '/auth/google/exchange', // pre-auth: no bearer, and a 401 here isn't a session expiry
  '/auth/google/id-token', // native Google sign-in — same pre-auth treatment
  '/auth/refresh', // never re-intercept the refresh endpoint itself
];

function isPublicRoute(url?: string) {
  if (!url) return false;
  return PUBLIC_ROUTES.some((r) => url.includes(r));
}

api.interceptors.request.use(async (config) => {
  // Cloudflare Turnstile can't run natively — identify the app instead.
  if (env.MOBILE_APP_SECRET) {
    config.headers['x-app-secret'] = env.MOBILE_APP_SECRET;
  }

  if (!isPublicRoute(config.url)) {
    const accessToken = await tokenStorage.getAccessToken();
    if (accessToken) {
      config.headers.Authorization = `Bearer ${accessToken}`;
    }
  }

  return config;
});

let isRefreshing = false;
let failedQueue: Array<{
  resolve: (v?: any) => void;
  reject: (e?: any) => void;
}> = [];

function processQueue(error: any) {
  failedQueue.forEach(({ resolve, reject }) => {
    if (error) reject(error);
    else resolve();
  });
  failedQueue = [];
}

async function logoutAndRedirect() {
  await tokenStorage.clear();
  useAuth.getState().clearUser();
  useSubscriptionStore.getState().clear();
  router.replace('/(auth)/login');
}

// The backend's SubscriptionGuard returns 402 for gated writes (create ticket,
// reply, …) when the company has no active/paid subscription. Handle it once,
// centrally: keep the client subscription state in sync and prompt to subscribe,
// instead of surfacing a raw error at each call site.
let subscriptionPromptOpen = false;

function handlePaymentRequired(data: any) {
  // Reflect the server's verdict so gated UI updates immediately.
  if (data?.subscriptionStatus !== undefined) {
    useSubscriptionStore.getState().setStatus(data.subscriptionStatus);
  }

  if (subscriptionPromptOpen) return;
  subscriptionPromptOpen = true;

  const message =
    (typeof data?.message === 'string' && data.message) ||
    'Subscribe to continue using this feature.';

  Alert.alert(
    'Subscription required',
    message,
    [
      {
        text: 'Not now',
        style: 'cancel',
        onPress: () => {
          subscriptionPromptOpen = false;
        },
      },
      {
        text: 'View plans',
        onPress: () => {
          subscriptionPromptOpen = false;
          router.push('/(tabs)/billing/subscribe');
        },
      },
    ],
    { onDismiss: () => (subscriptionPromptOpen = false) },
  );
}

api.interceptors.response.use(
  (response) => {
    // PAST_DUE companies inside their grace window get their writes through, with
    // the grace end-date on this header. Capture it so the UI can nudge to renew.
    const warning = response.headers?.['x-subscription-warning'];
    if (warning === 'grace-period') {
      const endsAt = response.headers?.['x-grace-period-ends'];
      useSubscriptionStore.getState().setGraceWarning(
        typeof endsAt === 'string' ? endsAt : null,
      );
    }
    return response;
  },
  async (error: AxiosError & { config?: any }) => {
    const originalRequest = error.config;
    const status = error.response?.status;
    const message = (error.response?.data as any)?.message;
    const path = originalRequest?.url || '';

    if (isPublicRoute(path)) {
      return Promise.reject(error);
    }

    // Handle 401 (access token expired)
    if (status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then(() => api(originalRequest));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const refreshToken = await tokenStorage.getRefreshToken();
        if (!refreshToken) throw new Error('No refresh token');

        const { data } = await api.post('/auth/refresh', { refreshToken });
        await tokenStorage.setTokens(data.access_token, data.refresh_token);

        processQueue(null);
        isRefreshing = false;

        return api(originalRequest);
      } catch (err) {
        processQueue(err);
        isRefreshing = false;

        // Refresh failed — session fully expired, send to login
        await logoutAndRedirect();

        return Promise.reject(err);
      }
    }

    // Handle subscription gating (402) centrally — prompt to subscribe.
    if (status === 402) {
      handlePaymentRequired(error.response?.data);
      return Promise.reject(error);
    }

    // Handle auth guard rejections (role/session) — but NOT business logic 403s.
    if (message === 'Unauthorized' || message === 'Forbidden') {
      await logoutAndRedirect();
    }

    return Promise.reject(error);
  },
);

export default api;

// ── Authenticated helpers ──────────────────────────────────────────────────

export async function fetchData<T>(url: string): Promise<T> {
  const res = await api.get(url);
  return res.data;
}
export async function postData<T>(url: string, data: any): Promise<T> {
  const res = await api.post(url, data);
  return res.data;
}
export async function updateData<T>(url: string, data: any): Promise<T> {
  const res = await api.patch(url, data);
  return res.data;
}
export async function deleteData<T>(url: string): Promise<T> {
  const res = await api.delete(url);
  return res.data;
}

export async function uploadFile<T>(
  url: string,
  formData: FormData,
): Promise<T> {
  const res = await api.post(url, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return res.data;
}
