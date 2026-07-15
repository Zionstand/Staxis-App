import { Stack } from 'expo-router';
import { useEffect } from 'react';

import { BrandTitle } from '@/components/logo';
import { useTheme } from '@/hooks/use-theme';
import { useSubscriptionStore } from '@/store/use-subscription-store';

export default function TicketsLayout() {
  const theme = useTheme();
  const hydrated = useSubscriptionStore((s) => s.hydrated);
  const refresh = useSubscriptionStore((s) => s.refresh);

  // Ensure the subscription snapshot is loaded before any ticket screen gates on
  // it. Covers cold-starts that restore straight to the tickets tab or deep-link
  // into a ticket, where the dashboard screens never mounted to populate it.
  useEffect(() => {
    if (!hydrated) refresh();
  }, [hydrated, refresh]);

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: theme.background },
        headerTintColor: theme.text,
        headerShadowVisible: false,
        contentStyle: { backgroundColor: theme.background },
        headerTitle: ({ children }) => <BrandTitle title={children} />,
      }}>
      <Stack.Screen name="index" options={{ title: 'Support' }} />
      <Stack.Screen name="[id]" options={{ title: 'Ticket' }} />
      <Stack.Screen name="new" options={{ title: 'New Ticket' }} />
    </Stack>
  );
}
