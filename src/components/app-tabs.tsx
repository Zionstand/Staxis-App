import { NativeTabs } from 'expo-router/unstable-native-tabs';

import { Colors, Palette } from '@/constants/staxis-theme';

export default function AppTabs() {
  return (
    <NativeTabs
      backgroundColor={Colors.bgApp}
      indicatorColor={Palette.bone2}
      labelStyle={{ selected: { color: Colors.text } }}>
      <NativeTabs.Trigger name="index">
        <NativeTabs.Trigger.Label>Home</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          sf={{ default: 'house', selected: 'house.fill' }}
          md="home"
        />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="tickets">
        <NativeTabs.Trigger.Label>Support</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          sf={{ default: 'bubble.left.and.bubble.right', selected: 'bubble.left.and.bubble.right.fill' }}
          md="forum"
        />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="billing">
        <NativeTabs.Trigger.Label>Billing</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          sf={{ default: 'creditcard', selected: 'creditcard.fill' }}
          md="credit_card"
        />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="profile">
        <NativeTabs.Trigger.Label>Profile</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          sf={{ default: 'person.crop.circle', selected: 'person.crop.circle.fill' }}
          md="person"
        />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
