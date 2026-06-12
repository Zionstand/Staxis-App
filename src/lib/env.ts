export const env = {
  BACKEND_URL: process.env.EXPO_PUBLIC_BACKEND_URL ?? 'http://localhost:8000',
  // Lets the app skip the web-only Cloudflare Turnstile check on /auth/login
  // and /auth/register — must match MOBILE_APP_SECRET in backend/.env.
  MOBILE_APP_SECRET: process.env.EXPO_PUBLIC_MOBILE_APP_SECRET ?? '',
};
