import axios, { AxiosError, AxiosInstance } from 'axios';
import { router } from 'expo-router';

import { env } from '@/lib/env';
import { tokenStorage } from '@/lib/token-storage';
import { useAuth } from '@/store/use-auth';

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
  router.replace('/(auth)/login');
}

api.interceptors.response.use(
  (response) => response,
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
