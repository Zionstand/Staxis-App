import { env } from '@/lib/env';

// Web-only Google OAuth (authorization-code flow) — mirrors the web app.
//
// The backend exchanges the returned `code` using the confidential web client
// (client id + SECRET) at `POST /auth/google/exchange`. That means:
//   • we must NOT use PKCE (the backend exchange has no code_verifier), and
//   • the `redirect_uri` sent to Google must EXACTLY match the one the backend
//     uses on exchange — so both sides derive it from the same helper below.
//
// The redirect lands back on our own `/google-callback` route, which reads the
// `code` from the URL and posts it to the backend.

export function googleRedirectUri(): string {
  if (typeof window === 'undefined') return '';
  return `${window.location.origin}/google-callback`;
}

export function buildGoogleOAuthUrl(): string {
  const params = new URLSearchParams({
    client_id: env.GOOGLE_CLIENT_ID,
    redirect_uri: googleRedirectUri(),
    response_type: 'code',
    scope: 'openid email profile',
    access_type: 'offline',
    prompt: 'select_account',
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}
