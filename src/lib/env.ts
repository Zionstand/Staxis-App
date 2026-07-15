export const env = {
  BACKEND_URL: process.env.EXPO_PUBLIC_BACKEND_URL ?? 'http://localhost:8000',
  // Lets the app skip the web-only Cloudflare Turnstile check on /auth/login
  // and /auth/register — must match MOBILE_APP_SECRET in backend/.env.
  MOBILE_APP_SECRET: process.env.EXPO_PUBLIC_MOBILE_APP_SECRET ?? '',
  // Google OAuth web client ID — shared with the web app and the backend.
  // Used on web for the code flow, and as the native SDK's serverClientId so
  // the ID token's audience is the web client (what the backend verifies).
  GOOGLE_CLIENT_ID: process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID ?? '',
  // iOS OAuth client ID (native only). Create an "iOS" client in Google Cloud
  // for bundle id com.tomiwaadelae.app and put its client ID here.
  GOOGLE_IOS_CLIENT_ID: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID ?? '',
  // Paystack PUBLIC key (pk_...) — safe to ship in the client. Must match the
  // same Paystack account the web app and backend use (backend verifies with
  // its secret key). Mirrors the web `NEXT_PUBLIC_PAYSTACK_KEY`.
  PAYSTACK_PUBLIC_KEY: process.env.EXPO_PUBLIC_PAYSTACK_PUBLIC_KEY ?? '',
};
