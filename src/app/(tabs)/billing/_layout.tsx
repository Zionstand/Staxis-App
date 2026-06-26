import { Stack } from 'expo-router';

import { useTheme } from '@/hooks/use-theme';

export default function BillingLayout() {
  const theme = useTheme();

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: theme.background },
        headerTintColor: theme.text,
        headerShadowVisible: false,
        contentStyle: { backgroundColor: theme.background },
      }}>
      {/* The overview keeps its own in-screen header. */}
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="transactions" options={{ title: 'Transactions' }} />
    </Stack>
  );
}
