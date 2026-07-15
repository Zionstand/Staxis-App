import { Image } from 'expo-image';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { postData } from '@/lib/api';
import { buildGoogleOAuthUrl } from '@/lib/google-auth';
import { GoogleSignInCancelled, signInWithGoogleNative } from '@/lib/google-native';
import { routeAfterAuth } from '@/lib/post-auth';
import { tokenStorage } from '@/lib/token-storage';
import { useAuth } from '@/store/use-auth';

type ExchangeResponse = {
  user: any;
  access_token: string;
  refresh_token: string;
};

// Google "G" mark as an inline SVG data URI so we don't ship an asset file.
const GOOGLE_G_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48">
<path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
<path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
<path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.28-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
<path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
</svg>`;
const GOOGLE_G = `data:image/svg+xml;utf8,${encodeURIComponent(GOOGLE_G_SVG)}`;

type Props = { label?: string };

/**
 * "Continue with Google". Web does a full-page redirect (code flow → the
 * `/google-callback` route). Native runs the on-device Google account picker,
 * gets an ID token, and posts it to the backend `/auth/google/id-token` route.
 */
export function GoogleAuthButton({ label = 'Continue with Google' }: Props) {
  const theme = useTheme();
  const setUser = useAuth((s) => s.setUser);
  const [loading, setLoading] = useState(false);

  const onPress = async () => {
    if (Platform.OS === 'web') {
      window.location.href = buildGoogleOAuthUrl();
      return;
    }

    setLoading(true);
    try {
      const idToken = await signInWithGoogleNative();
      const data = await postData<ExchangeResponse>('/auth/google/id-token', {
        idToken,
      });
      await tokenStorage.setTokens(data.access_token, data.refresh_token);
      setUser(data.user);
      routeAfterAuth(data.user);
    } catch (err: any) {
      if (err instanceof GoogleSignInCancelled) return; // user backed out
      const message =
        err?.response?.data?.message ??
        "Couldn't sign in with Google. Please try again.";
      Alert.alert('Google sign-in', Array.isArray(message) ? message[0] : message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Pressable
      onPress={onPress}
      disabled={loading}
      style={({ pressed }) => [
        styles.button,
        { borderColor: theme.backgroundSelected },
        (pressed || loading) && styles.pressed,
      ]}>
      {loading ? (
        <ActivityIndicator />
      ) : (
        <>
          <Image source={{ uri: GOOGLE_G }} style={styles.logo} contentFit="contain" />
          <ThemedText type="smallBold">{label}</ThemedText>
        </>
      )}
    </Pressable>
  );
}

/** "or" divider to place between the primary button and the Google button. */
export function OrDivider() {
  const theme = useTheme();
  return (
    <View style={styles.dividerRow}>
      <View style={[styles.line, { backgroundColor: theme.backgroundSelected }]} />
      <ThemedText type="small" themeColor="textSecondary">
        or
      </ThemedText>
      <View style={[styles.line, { backgroundColor: theme.backgroundSelected }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  button: {
    height: 48,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
  },
  pressed: {
    opacity: 0.6,
  },
  logo: {
    width: 18,
    height: 18,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  line: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
  },
});
