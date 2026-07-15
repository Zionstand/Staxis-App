import { env } from '@/lib/env';

// The native Google Sign-In package is a TurboModule (RNGoogleSignin) that only
// exists in a custom dev build / production build — it is NOT bundled into Expo
// Go. Importing it at module top-level therefore crashes Expo Go the moment any
// screen that references this file is evaluated. Load it lazily instead so the
// crash (if any) only happens when the user actually taps "Continue with
// Google", where it can be surfaced as a friendly message.
type GoogleSigninModule = typeof import('@react-native-google-signin/google-signin');

let mod: GoogleSigninModule | null = null;

function loadModule(): GoogleSigninModule {
  if (mod) return mod;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    mod = require('@react-native-google-signin/google-signin') as GoogleSigninModule;
  } catch {
    throw new Error(
      'Google sign-in requires a development build — it is not available in Expo Go.',
    );
  }
  return mod;
}

let configured = false;

function ensureConfigured() {
  if (configured) return;
  const { GoogleSignin } = loadModule();
  GoogleSignin.configure({
    // serverClientId = web client id → the ID token's `aud` is the web client,
    // which is exactly what the backend verifies against.
    webClientId: env.GOOGLE_CLIENT_ID,
    iosClientId: env.GOOGLE_IOS_CLIENT_ID || undefined,
    scopes: ['openid', 'email', 'profile'],
    offlineAccess: false,
  });
  configured = true;
}

// Thrown when the user dismisses the Google account picker — callers should
// treat this as a no-op, not an error to surface.
export class GoogleSignInCancelled extends Error {}

// Runs the native Google account picker and returns a verified ID token for the
// backend to exchange. Throws GoogleSignInCancelled if the user backs out.
export async function signInWithGoogleNative(): Promise<string> {
  const { GoogleSignin, isErrorWithCode, statusCodes } = loadModule();
  ensureConfigured();
  await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });

  try {
    const response = await GoogleSignin.signIn();

    // v13+ returns { type: 'success' | 'cancelled', data }. Support both the
    // newer shape and any older flat shape defensively.
    if ((response as any)?.type === 'cancelled') {
      throw new GoogleSignInCancelled('Google sign-in was cancelled');
    }
    const idToken =
      (response as any)?.data?.idToken ?? (response as any)?.idToken ?? null;

    if (!idToken) {
      throw new Error('Google did not return an ID token');
    }
    return idToken;
  } catch (err) {
    if (isErrorWithCode(err) && err.code === statusCodes.SIGN_IN_CANCELLED) {
      throw new GoogleSignInCancelled('Google sign-in was cancelled');
    }
    throw err;
  }
}
