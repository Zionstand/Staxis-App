import { useEffect } from 'react';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import { LogBox, useColorScheme } from 'react-native';

import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import { useAuth } from '@/store/use-auth';
import { migratePendingPayments } from '@/lib/pending-payment';

LogBox.ignoreLogs(['SafeAreaView has been deprecated']);

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const { user, _hasHydrated } = useAuth();
  useEffect(() => {
    // A storage failure leaves the original recoverable checkout intact; its screen retries.
    void migratePendingPayments().catch(() => undefined);
  }, []);

  const [fontsLoaded, fontError] = useFonts({
    'Fraunces-Display': require('../../assets/fonts/Fraunces-Display.ttf'),
    'Fraunces-DisplayItalic': require('../../assets/fonts/Fraunces-DisplayItalic.ttf'),
  });

  const ready = _hasHydrated && (fontsLoaded || !!fontError);

  useEffect(() => {
    if (ready) SplashScreen.hideAsync();
  }, [ready]);

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <AnimatedSplashOverlay />
      {ready && (
        <Stack screenOptions={{ headerShown: false, animation: 'fade' }}>
          <Stack.Protected guard={!!user}>
            <Stack.Screen name="(tabs)" />
          </Stack.Protected>
          <Stack.Protected guard={!user}>
            <Stack.Screen name="(auth)" />
          </Stack.Protected>
        </Stack>
      )}
    </ThemeProvider>
  );
}
