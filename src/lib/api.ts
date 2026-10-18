import { create, type AxiosError, type AxiosInstance, type AxiosRequestConfig, type InternalAxiosRequestConfig } from 'axios';
import { router } from 'expo-router';

import { env } from '@/lib/env';
import { tokenStorage } from '@/lib/token-storage';
import { useAuth } from '@/store/use-auth';
import { session } from '@/lib/session';

type SessionRequest = InternalAxiosRequestConfig & { _session?: number; _retry?: boolean };

const api: AxiosInstance = create({
  baseURL: env.BACKEND_URL,
  headers: { 'Content-Type': 'application/json' },
});

const PUBLIC_ROUTES = [
  '/auth/login',
  '/auth/register',
  '/auth/forgot-password',
  '/auth/verify-code',
  '/auth/set-new-password',
  '/auth/refresh', // never re-intercept the refresh endpoint itself
  '/auth/logout',
];

function isPublicRoute(url?: string) {
  if (!url) return false;
  return PUBLIC_ROUTES.includes(url.split('?')[0]);
}

api.interceptors.request.use(async (config) => {
  if (!isPublicRoute(config.url)) {
    const request = config as SessionRequest;
    request._session ??= session.current();
    session.assertCurrent(request._session);
    const accessToken = await tokenStorage.getAccessToken(request._session);
    session.assertCurrent(request._session);
    delete config.headers.Authorization;
    if (accessToken) {
      config.headers.Authorization = `Bearer ${accessToken}`;
    }
  }

  return config;
});

let refresh: { generation: number; promise: Promise<void> } | undefined;

export function logoutAndRedirect(expected = session.current()) {
  if (!session.isCurrent(expected)) return Promise.resolve(null);
  const clearing = useAuth.getState().clearUser();
  router.replace('/(auth)/login');
  return clearing;
}

/** Local logout and navigation happen before any network or storage wait. */
export async function signOut() {
  const refreshToken = await logoutAndRedirect();
  if (refreshToken) {
    // Revocation is best effort; a hung request must not hold the local session open.
    void api.post('/auth/logout', { refreshToken }, { timeout: 10000 }).catch(() => undefined);
  }
}

api.interceptors.response.use(
  (response) => {
    const expected = (response.config as SessionRequest)._session;
    if (expected !== undefined) session.assertCurrent(expected);
    return response;
  },
  async (error: AxiosError) => {
    const originalRequest = error.config as SessionRequest | undefined;
    const status = error.response?.status;
    const message = (error.response?.data as { message?: string })?.message;
    const path = originalRequest?.url || '';

    if (!originalRequest || isPublicRoute(path)) {
      return Promise.reject(error);
    }

    const expected = originalRequest._session;
    if (expected === undefined || !session.isCurrent(expected)) return Promise.reject(error);

    // Each session owns its refresh promise; every waiter checks ownership before retrying.
    if (status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      try {
        if (!refresh || refresh.generation !== expected) {
          const promise = (async () => {
            const refreshToken = await tokenStorage.getRefreshToken(expected);
            if (!refreshToken) throw new Error('No refresh token');
            session.assertCurrent(expected);
            const { data } = await api.post('/auth/refresh', { refreshToken });
            session.assertCurrent(expected);
            await tokenStorage.setTokens(data.access_token, data.refresh_token, expected);
          })();
          refresh = { generation: expected, promise };
        }
        const currentRefresh = refresh;
        try { await currentRefresh.promise; }
        finally { if (refresh === currentRefresh) refresh = undefined; }
        session.assertCurrent(expected);
        return api(originalRequest);
      } catch (err) {
        if (session.isCurrent(expected)) await logoutAndRedirect(expected);
        return Promise.reject(err);
      }
    }

    // Handle auth guard rejections (role/session) — but NOT business logic 403s.
    if (message === 'Unauthorized' || message === 'Forbidden') {
      await logoutAndRedirect(expected);
    }

    return Promise.reject(error);
  },
);

export default api;

// ── Authenticated helpers ──────────────────────────────────────────────────

function scopedRequest(): AxiosRequestConfig & { _session: number } {
  // Capture at invocation, before Axios schedules its asynchronous interceptors.
  return { _session: session.current() };
}

export async function fetchData<T>(url: string): Promise<T> {
  const res = await api.get(url, scopedRequest());
  return res.data;
}
export async function postData<T>(url: string, data: any): Promise<T> {
  const res = await api.post(url, data, scopedRequest());
  return res.data;
}
export async function updateData<T>(url: string, data: any): Promise<T> {
  const res = await api.patch(url, data, scopedRequest());
  return res.data;
}
export async function deleteData<T>(url: string): Promise<T> {
  const res = await api.delete(url, scopedRequest());
  return res.data;
}

export async function uploadFile<T>(
  url: string,
  formData: FormData,
): Promise<T> {
  const res = await api.post(url, formData, {
    ...scopedRequest(),
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return res.data;
}
