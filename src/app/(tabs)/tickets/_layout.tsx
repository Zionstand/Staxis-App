import { Stack } from 'expo-router';

import { Colors, FontFamily } from '@/constants/staxis-theme';

export default function TicketsLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: Colors.bgApp },
        headerTintColor: Colors.text,
        headerShadowVisible: false,
        headerTitleStyle: { fontFamily: FontFamily.bodySemiBold, fontSize: 16 },
        contentStyle: { backgroundColor: Colors.bgApp },
      }}
    >
      <Stack.Screen name="index" options={{ title: 'Support' }} />
      <Stack.Screen name="[id]" options={{ title: 'Ticket' }} />
      <Stack.Screen name="new" options={{ title: 'New request' }} />
    </Stack>
  );
}
