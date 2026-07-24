import { Stack } from 'expo-router';

import { BrandTitle } from '@/components/logo';
import { useTheme } from '@/hooks/use-theme';

export default function ServicesLayout() {
  const theme = useTheme();

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: theme.background },
        headerTintColor: theme.text,
        headerShadowVisible: false,
        contentStyle: { backgroundColor: theme.background },
        headerTitle: ({ children }) => <BrandTitle title={children} />,
      }}>
      <Stack.Screen name="index" options={{ title: 'On-Demand' }} />
      <Stack.Screen name="new" options={{ title: 'Request a quote' }} />
      <Stack.Screen name="orders/[id]" options={{ title: 'Order' }} />
      <Stack.Screen name="requests/[id]" options={{ title: 'Request' }} />
    </Stack>
  );
}
