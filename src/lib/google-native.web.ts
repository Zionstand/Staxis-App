// Web stub — the native Google SDK isn't available in the browser bundle.
// On web the button uses the redirect/code flow instead (see google-auth.ts),
// so this is never called; it exists only to keep the native import off web.

export class GoogleSignInCancelled extends Error {}

export async function signInWithGoogleNative(): Promise<string> {
  throw new Error('Native Google sign-in is not available on web');
}
