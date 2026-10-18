import { useEffect, useState } from 'react';
import { AccessibilityInfo, Animated, Easing } from 'react-native';

import { StaxisButton } from '@/components/staxis';
import { Motion } from '@/constants/staxis-theme';

/** Mount only for a valid selection, so an empty checkout has no payment action. */
export function PaymentAction({ label, disabled, onPress }: { label: string; disabled: boolean; onPress: () => void }) {
  const [progress] = useState(() => new Animated.Value(0));
  useEffect(() => {
    let active = true;
    let animation: Animated.CompositeAnimation | undefined;
    const reveal = (reduced: boolean) => {
      if (!active) return;
      animation?.stop();
      if (reduced) progress.setValue(1);
      else {
        animation = Animated.timing(progress, { toValue: 1, duration: Motion.panel, easing: Easing.out(Easing.cubic), useNativeDriver: true });
        animation.start();
      }
    };
    void AccessibilityInfo.isReduceMotionEnabled().then(reveal).catch(() => reveal(true));
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', reveal);
    return () => { active = false; animation?.stop(); subscription.remove(); };
  }, [progress]);
  return (
    <Animated.View style={{ opacity: progress, transform: [{ translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [12, 0] }) }] }}>
      <StaxisButton label={label} size="lg" disabled={disabled} onPress={onPress} block />
    </Animated.View>
  );
}
