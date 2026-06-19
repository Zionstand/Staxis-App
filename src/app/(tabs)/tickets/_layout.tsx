import { Stack } from 'expo-router';

import { useTheme } from '@/hooks/use-theme';

export default function TicketsLayout() {
  const theme = useTheme();

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: theme.background },
        headerTintColor: theme.text,
        headerShadowVisible: false,
        contentStyle: { backgroundColor: theme.background },
      }}>
      <Stack.Screen name="index" options={{ title: 'Support' }} />
      <Stack.Screen name="[id]" options={{ title: 'Ticket' }} />
      <Stack.Screen name="new" options={{ title: 'New Ticket' }} />
    </Stack>
  );
}
