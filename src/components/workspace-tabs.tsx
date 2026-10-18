import { Tabs } from 'expo-router';
import { PlatformPressable } from 'expo-router/react-navigation';
import type { BottomTabBarButtonProps } from 'expo-router/tabs';
import { StyleSheet, View, useWindowDimensions, type ColorValue } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { StaxisText } from '@/components/staxis/StaxisText';

import { Colors, Palette, Radius, Spacing, Type } from '@/constants/staxis-theme';

type IconName = 'home' | 'billing' | 'support' | 'profile';

function RoundedTabButton({ style, ...props }: BottomTabBarButtonProps) {
  return <PlatformPressable {...props} pressOpacity={0.8} android_ripple={{ color: Colors.hover, borderless: false }} style={[style, styles.tabButton]} />;
}

function TabIcon({ name, color }: { name: IconName; color: ColorValue }) {
  const stroke = { borderColor: color };
  return (
    <View style={styles.icon} accessible={false}>
      {name === 'home' && <><View style={[styles.roof, stroke]} /><View style={[styles.house, stroke]} /><View style={[styles.door, stroke]} /></>}
      {name === 'billing' && <><View style={[styles.card, stroke]} /><View style={[styles.cardStripe, { backgroundColor: color }]} /><View style={[styles.cardDetail, { backgroundColor: color }]} /></>}
      {name === 'support' && <><View style={[styles.bubble, stroke]} /><View style={[styles.bubbleTail, stroke]} /><View style={[styles.bubbleLine, { backgroundColor: color }]} /></>}
      {name === 'profile' && <><View style={[styles.personHead, stroke]} /><View style={[styles.personBody, stroke]} /></>}
    </View>
  );
}

export default function WorkspaceTabs() {
  const insets = useSafeAreaInsets();
  const { width, fontScale } = useWindowDimensions();
  const labelLines = width < Spacing.xxxl * 10 && fontScale > 1.15 ? 2 : 1;
  const itemHeight = Spacing.xxl + (Type.navigationLabel.lineHeight ?? 20) * Math.max(1, fontScale) * labelLines + Spacing.lg;
  return (
    <Tabs screenOptions={{
      headerShown: false,
      tabBarActiveTintColor: Colors.textOnDark,
      tabBarActiveBackgroundColor: Palette.ink,
      tabBarInactiveTintColor: Colors.text2,
      tabBarInactiveBackgroundColor: 'transparent',
      tabBarHideOnKeyboard: true,
      tabBarLabelPosition: 'below-icon',
      tabBarLabel: ({ children, color }) => <StaxisText variant="navigationLabel" allowFontScaling numberOfLines={labelLines} style={[styles.tabLabel, { color }]}>{children}</StaxisText>,
      tabBarAllowFontScaling: true,
      tabBarButton: RoundedTabButton,
      tabBarItemStyle: [styles.tabItem, { minHeight: itemHeight }],
      tabBarStyle: [styles.bar, { height: itemHeight + Spacing.lg + insets.bottom, paddingBottom: Math.max(insets.bottom, Spacing.sm) }],
      sceneStyle: { backgroundColor: Colors.bgApp },
    }}>
      <Tabs.Screen name="index" options={{ title: 'Home', tabBarIcon: ({ color }) => <TabIcon name="home" color={color} /> }} />
      <Tabs.Screen name="billing" options={{ title: 'Billing', tabBarIcon: ({ color }) => <TabIcon name="billing" color={color} /> }} />
      <Tabs.Screen name="support" options={{ title: 'Support', tabBarIcon: ({ color }) => <TabIcon name="support" color={color} /> }} />
      <Tabs.Screen name="profile" options={{ title: 'Profile', tabBarIcon: ({ color }) => <TabIcon name="profile" color={color} /> }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  bar: { backgroundColor: Colors.bgCard, borderTopWidth: 1, borderTopColor: Colors.line, paddingTop: Spacing.sm, paddingHorizontal: Spacing.md, elevation: 0 },
  tabItem: { borderRadius: Radius.pill, marginHorizontal: Spacing.xs, overflow: 'hidden' },
  tabButton: { borderRadius: Radius.pill, overflow: 'hidden', paddingVertical: Spacing.sm, justifyContent: 'center' },
  tabLabel: { alignSelf: 'stretch', paddingHorizontal: Spacing.xs, textAlign: 'center' },
  icon: { width: Spacing.xl, height: Spacing.xl },
  roof: { position: 'absolute', width: 14, height: 14, top: 4, left: 5, borderTopWidth: 2, borderLeftWidth: 2, transform: [{ rotate: '45deg' }] },
  house: { position: 'absolute', width: 16, height: 12, top: 10, left: 4, borderBottomWidth: 2, borderLeftWidth: 2, borderRightWidth: 2, borderBottomLeftRadius: Radius.sm / 4, borderBottomRightRadius: Radius.sm / 4 },
  door: { position: 'absolute', height: 7, top: 15, left: 11, borderLeftWidth: 2 },
  card: { position: 'absolute', width: 22, height: 17, top: 4, left: 1, borderWidth: 2, borderRadius: Radius.sm / 2 },
  cardStripe: { position: 'absolute', width: 20, height: 2, top: 9, left: 2 },
  cardDetail: { position: 'absolute', width: 5, height: 2, top: 15, left: 5 },
  bubble: { position: 'absolute', width: 21, height: 16, top: 3, left: 1, borderWidth: 2, borderRadius: Radius.sm / 2 },
  bubbleTail: { position: 'absolute', width: 5, height: 6, top: 16, left: 4, borderLeftWidth: 2, transform: [{ rotate: '30deg' }] },
  bubbleLine: { position: 'absolute', width: 10, height: 2, top: 10, left: 6 },
  personHead: { position: 'absolute', width: 9, height: 9, top: 1, left: 7, borderWidth: 2, borderRadius: Radius.pill },
  personBody: { position: 'absolute', width: 19, height: 10, top: 13, left: 2, borderWidth: 2, borderTopLeftRadius: Radius.md, borderTopRightRadius: Radius.md, borderBottomLeftRadius: Radius.sm / 4, borderBottomRightRadius: Radius.sm / 4 },
});
