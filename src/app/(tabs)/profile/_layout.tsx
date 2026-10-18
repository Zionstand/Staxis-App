import { Stack } from 'expo-router';

import { Colors } from '@/constants/staxis-theme';
import { renderWorkspaceHeader } from '@/components/workspace-header';

export default function ProfileLayout() {
  return (
    <Stack
      screenOptions={{
        header: renderWorkspaceHeader,
        contentStyle: { backgroundColor: Colors.bgApp },
        animation: 'slide_from_right',
      }}>
      <Stack.Screen name="index" options={{ title: 'Profile' }} />
      <Stack.Screen name="edit" options={{ title: 'Edit Profile' }} />
      <Stack.Screen name="edit-company" options={{ title: 'Edit Company' }} />
      <Stack.Screen name="change-password" options={{ title: 'Change Password' }} />
    </Stack>
  );
}
