import { Stack } from 'expo-router';

import { Colors, FontFamily } from '@/constants/staxis-theme';

export default function BillingLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: Colors.bgApp },
        headerTintColor: Colors.text,
        headerShadowVisible: false,
        headerTitleStyle: { fontFamily: FontFamily.bodySemiBold, fontSize: 16 },
        contentStyle: { backgroundColor: Colors.bgApp },
      }}>
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="transactions" options={{ title: 'Transactions' }} />
    </Stack>
  );
}
