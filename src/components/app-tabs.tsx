import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { Href } from 'expo-router';
import { TabList, TabSlot, TabTrigger, TabTriggerSlotProps, Tabs, type TabListProps } from 'expo-router/ui';
import { Pressable, StyleSheet, useColorScheme, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from './themed-text';

import { Colors, Spacing } from '@/constants/theme';
import { useAuth } from '@/store/use-auth';

type IconName = keyof typeof Ionicons.glyphMap;

type TabDef = {
  name: string;
  href: Href;
  label: string;
  icon: IconName;
  iconActive: IconName;
  /** The Profile tab renders the user's avatar instead of an icon. */
  profile?: boolean;
};

const TABS: TabDef[] = [
  { name: 'home', href: '/', label: 'Home', icon: 'home-outline', iconActive: 'home' },
  { name: 'services', href: '/services', label: 'Services', icon: 'construct-outline', iconActive: 'construct' },
  { name: 'tickets', href: '/tickets', label: 'Support', icon: 'chatbubbles-outline', iconActive: 'chatbubbles' },
  { name: 'billing', href: '/billing', label: 'Billing', icon: 'card-outline', iconActive: 'card' },
  { name: 'profile', href: '/profile', label: 'Profile', icon: 'person-circle-outline', iconActive: 'person-circle', profile: true },
];

// A JS tab bar (rather than the native one) so the Profile tab can show the
// user's actual, circular profile picture with an active ring.
export default function AppTabs() {
  const avatar = useAuth((s) => s.user?.image) ?? null;

  return (
    <Tabs style={styles.root}>
      <TabSlot style={styles.slot} />
      <TabList asChild>
        <CustomTabList>
          {TABS.map((tab) => (
            <TabTrigger key={tab.name} name={tab.name} href={tab.href} asChild>
              <TabButton tab={tab} avatar={avatar} />
            </TabTrigger>
          ))}
        </CustomTabList>
      </TabList>
    </Tabs>
  );
}

type TabButtonProps = TabTriggerSlotProps & { tab: TabDef; avatar: string | null };

function TabButton({ tab, avatar, isFocused, ...props }: TabButtonProps) {
  const scheme = useColorScheme();
  const colors = Colors[scheme === 'dark' ? 'dark' : 'light'];
  const color = isFocused ? colors.primary : colors.textSecondary;

  const isProfile = tab.profile && !!avatar;

  return (
    <Pressable
      {...props}
      accessibilityRole="button"
      accessibilityState={{ selected: isFocused }}
      style={({ pressed }) => [styles.tabButton, pressed && styles.pressed]}>
      <View style={styles.iconWrap}>
        {isProfile ? (
          <Image
            source={{ uri: avatar! }}
            style={[
              styles.avatar,
              { backgroundColor: colors.backgroundElement },
              isFocused && { borderWidth: 2, borderColor: colors.primary },
            ]}
            contentFit="cover"
            accessibilityLabel="Your profile picture"
          />
        ) : (
          <Ionicons name={isFocused ? tab.iconActive : tab.icon} size={24} color={color} />
        )}
      </View>
      <ThemedText
        type={isFocused ? 'smallBold' : 'small'}
        themeColor={isFocused ? 'primary' : 'textSecondary'}>
        {tab.label}
      </ThemedText>
    </Pressable>
  );
}

function CustomTabList(props: TabListProps) {
  const scheme = useColorScheme();
  const colors = Colors[scheme === 'dark' ? 'dark' : 'light'];
  const insets = useSafeAreaInsets();

  return (
    <View
      {...props}
      style={[
        styles.tabBar,
        {
          backgroundColor: colors.background,
          borderTopColor: colors.backgroundSelected,
          paddingBottom: Math.max(insets.bottom, Spacing.two),
        },
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
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: Spacing.two,
    // Lift the bar off the page so it reads as its own surface.
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
    minHeight: 44,
  },
  iconWrap: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.half,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatar: {
    width: 26,
    height: 26,
    borderRadius: 13,
  },
  pressed: {
    opacity: 0.6,
  },
});
