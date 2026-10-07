import {
  Tabs,
  TabList,
  TabTrigger,
  TabSlot,
  TabTriggerSlotProps,
  TabListProps,
} from 'expo-router/ui';
import { Pressable, View, StyleSheet, Text } from 'react-native';

import { Colors, Palette, Spacing } from '@/constants/staxis-theme';

export default function AppTabs() {
  return (
    <Tabs>
      <TabSlot style={{ height: '100%' }} />
      <TabList asChild>
        <CustomTabList>
          <TabTrigger name="home" href="/" asChild>
            <TabButton>Home</TabButton>
          </TabTrigger>
          <TabTrigger name="tickets" href="/tickets" asChild>
            <TabButton>Support</TabButton>
          </TabTrigger>
          <TabTrigger name="billing" href="/billing" asChild>
            <TabButton>Billing</TabButton>
          </TabTrigger>
          <TabTrigger name="profile" href="/profile" asChild>
            <TabButton>Profile</TabButton>
          </TabTrigger>
        </CustomTabList>
      </TabList>
    </Tabs>
  );
}

export function TabButton({ children, isFocused, ...props }: TabTriggerSlotProps) {
  return (
    <Pressable {...props} style={({ pressed }) => pressed && styles.pressed}>
      <View
        style={[
          styles.tabButtonView,
          { backgroundColor: isFocused ? Palette.bone2 : 'transparent' },
        ]}
      >
        <Text style={{ fontSize: 14, color: isFocused ? Colors.text : Colors.text2 }}>
          {children}
        </Text>
      </View>
    </Pressable>
  );
}

export function CustomTabList(props: TabListProps) {
  return (
    <View {...props} style={styles.tabListContainer}>
      <View style={styles.innerContainer}>
        <Text style={styles.brandText}>STAXIS</Text>
        {props.children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  tabListContainer: {
    position: 'absolute',
    width: '100%',
    padding: Spacing.lg,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
  },
  innerContainer: {
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.xxl,
    borderRadius: Spacing.xxl,
    backgroundColor: Palette.bone2,
    flexDirection: 'row',
    alignItems: 'center',
    flexGrow: 1,
    gap: Spacing.sm,
    maxWidth: 800,
  },
  brandText: {
    marginRight: 'auto',
    fontWeight: '700',
    fontSize: 15,
    color: Colors.text,
  },
  pressed: { opacity: 0.7 },
  tabButtonView: {
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.lg,
    borderRadius: Spacing.lg,
  },
});
