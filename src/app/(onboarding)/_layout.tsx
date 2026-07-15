import { Stack } from 'expo-router';

import { useTheme } from '@/hooks/use-theme';

export default function OnboardingLayout() {
  const theme = useTheme();

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: theme.background },
        headerTintColor: theme.text,
        headerShadowVisible: false,
        contentStyle: { backgroundColor: theme.background },
        // No swipe-back to the previous step's stale state; steps advance forward.
        gestureEnabled: false,
      }}>
      <Stack.Screen name="company" options={{ title: 'Set up your company' }} />
      <Stack.Screen name="plan" options={{ title: 'Choose a plan' }} />
    </Stack>
  );
}
