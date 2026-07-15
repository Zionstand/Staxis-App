import {
  Tabs,
  TabList,
  TabTrigger,
  TabSlot,
  TabTriggerSlotProps,
  TabListProps,
} from 'expo-router/ui';
import { Href } from 'expo-router';
import { SymbolView, SymbolViewProps } from 'expo-symbols';
import { Pressable, useColorScheme, View, StyleSheet } from 'react-native';

import { ThemedText } from './themed-text';

import { Colors, Spacing } from '@/constants/theme';

type IconName = SymbolViewProps['name'];

// Native tab icons come from NativeTabs (see app-tabs.tsx). On web, SymbolView
// renders Google's Material Symbols via the `web` key — the `ios` key is kept
// for parity but isn't used in this web-only file.
const TABS: { name: string; href: Href; label: string; icon: IconName }[] = [
  { name: 'home', href: '/', label: 'Home', icon: { ios: 'house.fill', web: 'home' } },
  { name: 'tickets', href: '/tickets', label: 'Support', icon: { ios: 'bubble.left.and.bubble.right.fill', web: 'forum' } },
  { name: 'billing', href: '/billing', label: 'Billing', icon: { ios: 'creditcard.fill', web: 'credit_card' } },
  { name: 'profile', href: '/profile', label: 'Profile', icon: { ios: 'person.crop.circle.fill', web: 'person' } },
];

export default function AppTabs() {
  return (
    <Tabs style={styles.root}>
      <TabSlot style={styles.slot} />
      <TabList asChild>
        <CustomTabList>
          {TABS.map((tab) => (
            <TabTrigger key={tab.name} name={tab.name} href={tab.href} asChild>
              <TabButton icon={tab.icon} label={tab.label} />
            </TabTrigger>
          ))}
        </CustomTabList>
      </TabList>
    </Tabs>
  );
}

type TabButtonProps = TabTriggerSlotProps & { icon: IconName; label: string };

export function TabButton({ icon, label, isFocused, ...props }: TabButtonProps) {
  const scheme = useColorScheme();
  const colors = Colors[scheme === 'dark' ? 'dark' : 'light'];
  const color = isFocused ? colors.primary : colors.textSecondary;

  return (
    <Pressable
      {...props}
      style={({ pressed }) => [styles.tabButton, pressed && styles.pressed]}>
      {/* Wine "pill" behind the active tab so the current section clearly stands out. */}
      <View
        style={[
          styles.iconWrap,
          isFocused && { backgroundColor: colors.primarySoft },
        ]}>
        <SymbolView name={icon} tintColor={color} size={24} />
      </View>
      <ThemedText
        type={isFocused ? 'smallBold' : 'small'}
        themeColor={isFocused ? 'primary' : 'textSecondary'}>
        {label}
      </ThemedText>
    </Pressable>
  );
}

export function CustomTabList(props: TabListProps) {
  const scheme = useColorScheme();
  const colors = Colors[scheme === 'dark' ? 'dark' : 'light'];

  return (
    <View
      {...props}
      style={[
        styles.tabBar,
        { backgroundColor: colors.background, borderTopColor: colors.backgroundSelected },
      ]}>
      {props.children}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  slot: {
    flex: 1,
  },
  tabBar: {
    flexDirection: 'row',
    borderTopWidth: 1,
    paddingTop: Spacing.two,
    // Modest bottom padding keeps the bar clear of mobile-browser chrome.
    paddingBottom: Spacing.three,
    // Lift the bar off the page so it reads as its own surface, not part of it.
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 12,
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.half,
    minHeight: 48,
  },
  iconWrap: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.half,
    borderRadius: 999,
  },
  pressed: {
    opacity: 0.6,
  },
});
