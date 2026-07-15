import { useFonts } from '@expo-google-fonts/outfit';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useCallback } from 'react';
import { StyleSheet, useColorScheme, View } from 'react-native';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import { OutfitFonts } from '@/constants/theme';
import { useAuth } from '@/store/use-auth';

// Hold the native Staxis splash until the app is genuinely ready to paint.
SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const { user, _hasHydrated } = useAuth();
  const [fontsLoaded] = useFonts(OutfitFonts);

  // Ready once the persisted session has rehydrated and Outfit has loaded, so
  // the first frame is fully branded — no system-font or unstyled flash.
  const ready = _hasHydrated && fontsLoaded;

  // Hide the native splash only after the app tree has laid out, so it hands
  // straight off to the (already-mounted) red overlay reveal with no gap.
  const onLayoutRootView = useCallback(() => {
    if (ready) SplashScreen.hideAsync().catch(() => {});
  }, [ready]);

  // Keep the native splash covering the screen until we're ready.
  if (!ready) return null;

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <View style={styles.flex} onLayout={onLayoutRootView}>
        <AnimatedSplashOverlay />
        <Stack screenOptions={{ headerShown: false }}>
          {/* Signed in and onboarded → the main app. */}
          <Stack.Protected guard={!!user && !!user.onboardingCompleted}>
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="notifications" options={{ headerShown: true }} />
            <Stack.Screen name="it-manager" options={{ headerShown: true }} />
          </Stack.Protected>
          {/* Signed in but not onboarded → company + plan setup. */}
          <Stack.Protected guard={!!user && !user.onboardingCompleted}>
            <Stack.Screen name="(onboarding)" />
          </Stack.Protected>
          <Stack.Protected guard={!user}>
            <Stack.Screen name="(auth)" />
          </Stack.Protected>
        </Stack>
      </View>
    </ThemeProvider>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
});
