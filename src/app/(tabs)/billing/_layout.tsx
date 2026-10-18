import { Stack } from 'expo-router';

import { Colors } from '@/constants/staxis-theme';
import { renderWorkspaceHeader } from '@/components/workspace-header';

export default function BillingLayout() {
  return (
    <Stack
      screenOptions={{
        header: renderWorkspaceHeader,
        contentStyle: { backgroundColor: Colors.bgApp },
        animation: 'slide_from_right',
      }}>
      <Stack.Screen name="index" options={{ title: 'Billing' }} />
      <Stack.Screen name="transactions" options={{ title: 'Transactions' }} />
      <Stack.Screen name="renew" options={{ title: 'Make a payment' }} />
      <Stack.Screen name="pending" options={{ title: 'Pending payment' }} />
    </Stack>
  );
}
