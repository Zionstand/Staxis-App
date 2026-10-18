import { Stack } from 'expo-router';

import { Colors } from '@/constants/staxis-theme';
import { renderWorkspaceHeader } from '@/components/workspace-header';

export default function AuthLayout() {
  return (
    <Stack
      screenOptions={{
        header: renderWorkspaceHeader,
        contentStyle: { backgroundColor: Colors.bgApp },
        animation: 'slide_from_right',
      }}>
      <Stack.Screen name="login" options={{ title: 'Sign in' }} />
      <Stack.Screen name="register" options={{ title: 'Create account' }} />
      <Stack.Screen name="forgot-password" options={{ title: 'Reset password' }} />
      <Stack.Screen name="verify-code" options={{ title: 'Verify code' }} />
      <Stack.Screen name="new-password" options={{ title: 'New password' }} />
    </Stack>
  );
}
