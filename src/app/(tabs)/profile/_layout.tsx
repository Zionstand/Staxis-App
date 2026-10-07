import { Stack } from 'expo-router';

import { Colors, FontFamily } from '@/constants/staxis-theme';

export default function ProfileLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: Colors.bgApp },
        headerTintColor: Colors.text,
        headerShadowVisible: false,
        headerTitleStyle: { fontFamily: FontFamily.bodySemiBold, fontSize: 16 },
        contentStyle: { backgroundColor: Colors.bgApp },
      }}>
      <Stack.Screen name="index" options={{ title: 'Profile' }} />
      <Stack.Screen name="edit" options={{ title: 'Edit Profile' }} />
      <Stack.Screen name="edit-company" options={{ title: 'Edit Company' }} />
      <Stack.Screen name="change-password" options={{ title: 'Change Password' }} />
    </Stack>
  );
}
