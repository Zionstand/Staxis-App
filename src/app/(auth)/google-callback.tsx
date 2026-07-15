import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { postData } from '@/lib/api';
import { googleRedirectUri } from '@/lib/google-auth';
import { routeAfterAuth } from '@/lib/post-auth';
import { tokenStorage } from '@/lib/token-storage';
import { useAuth } from '@/store/use-auth';

type ExchangeResponse = {
  user: any;
  access_token: string;
  refresh_token: string;
};

// Where Google redirects back after the user picks an account. Reads the auth
// `code` from the URL and exchanges it via the backend, then stores the session
// exactly like email/password login does.
export default function GoogleCallbackScreen() {
  const setUser = useAuth((s) => s.setUser);
  const [error, setError] = useState<string | null>(null);
  const ran = useRef(false);

  useEffect(() => {
    // The exchange consumes a one-time code — never run it twice.
    if (ran.current) return;
    ran.current = true;

    (async () => {
      if (typeof window === 'undefined') return;
      const params = new URLSearchParams(window.location.search);
      const code = params.get('code');
      const oauthError = params.get('error');

      if (oauthError || !code) {
        setError('Google sign-in was cancelled.');
        return;
      }

      try {
        const data = await postData<ExchangeResponse>('/auth/google/exchange', {
          code,
          redirectUri: googleRedirectUri(),
        });
        await tokenStorage.setTokens(data.access_token, data.refresh_token);
        setUser(data.user);
        routeAfterAuth(data.user);
      } catch (err: any) {
        const message =
          err?.response?.data?.message ??
          "Couldn't complete Google sign-in. Please try again.";
        setError(Array.isArray(message) ? message[0] : message);
      }
    })();
  }, [setUser]);

  return (
    <ThemedView style={styles.container}>
      {error ? (
        <>
          <ThemedText type="default" themeColor="textSecondary" style={styles.text}>
            {error}
          </ThemedText>
          <Pressable onPress={() => router.replace('/(auth)/login')}>
            <ThemedText type="linkPrimary">Back to sign in</ThemedText>
          </Pressable>
        </>
      ) : (
        <>
          <ActivityIndicator />
          <ThemedText type="small" themeColor="textSecondary">
            Signing you in…
          </ThemedText>
        </>
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    paddingHorizontal: Spacing.four,
  },
  text: {
    textAlign: 'center',
  },
});
