import { router, Stack } from 'expo-router';

import { Colors } from '@/constants/staxis-theme';
import { WorkspaceHeader } from '@/components/workspace-header';

export default function SupportLayout() {
  return (
    <Stack
      screenOptions={{
        header: ({ options, navigation, route, back }) => (
          <WorkspaceHeader
            title={options.title ?? 'Support'}
            onBack={route.name === 'index' ? undefined : () => {
              if (back && navigation.canGoBack()) {
                navigation.goBack();
              } else {
                router.replace('/(tabs)/support');
              }
            }}
          />
        ),
        contentStyle: { backgroundColor: Colors.bgApp },
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="index" options={{ title: 'Support' }} />
      <Stack.Screen name="[id]" options={{ title: 'Ticket' }} />
      <Stack.Screen name="new" options={{ title: 'New request' }} />
    </Stack>
  );
}
