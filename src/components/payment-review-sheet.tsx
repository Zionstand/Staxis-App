import { type ReactNode, useEffect, useMemo, useState } from 'react';
import { AccessibilityInfo, Animated, Modal, PanResponder, Pressable, ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PaymentAction } from '@/components/payment-action';
import { StaxisText } from '@/components/staxis';
import { Colors, Motion, Radius, Spacing } from '@/constants/staxis-theme';

export function PaymentReviewSheet({ open, onOpen, onClose, disabled, label, title = 'Review your payment', children }: {
  open: boolean; onOpen: () => void; onClose: () => void; disabled: boolean; label: string; title?: string; children: ReactNode;
}) {
  const { height } = useWindowDimensions();
  const [offset] = useState(() => new Animated.Value(0));
  const [reducedMotion, setReducedMotion] = useState(true);
  const [closeFocused, setCloseFocused] = useState(false);
  useEffect(() => {
    let active = true;
    void AccessibilityInfo.isReduceMotionEnabled().then((value) => { if (active) setReducedMotion(value); }).catch(() => {});
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', setReducedMotion);
    return () => { active = false; subscription.remove(); offset.stopAnimation(); };
  }, [offset]);
  const reset = () => Animated.timing(offset, { toValue: 0, duration: reducedMotion ? 0 : Motion.base, useNativeDriver: true }).start();
  const railGesture = useMemo(() => PanResponder.create({
    onMoveShouldSetPanResponder: (_, gesture) => !disabled && gesture.dy < -Spacing.md && Math.abs(gesture.dy) > Math.abs(gesture.dx),
    onPanResponderRelease: (_, gesture) => { if (!disabled && gesture.dy < -Spacing.lg) onOpen(); },
  }), [disabled, onOpen]);
  const sheetGesture = PanResponder.create({
    onMoveShouldSetPanResponder: (_, gesture) => !disabled && Math.abs(gesture.dy) > Spacing.sm && Math.abs(gesture.dy) > Math.abs(gesture.dx),
    onPanResponderGrant: () => offset.stopAnimation(),
    onPanResponderMove: (_, gesture) => offset.setValue(Math.max(0, gesture.dy)),
    onPanResponderRelease: (_, gesture) => {
      if (!disabled && (gesture.dy > Spacing.xxxl || gesture.vy > 0.5)) { onClose(); offset.setValue(0); }
      else reset();
    },
    onPanResponderTerminate: reset,
  });
  return (
    <>
      <SafeAreaView edges={['bottom']} style={styles.rail} {...railGesture.panHandlers}>
        <View style={styles.handle} />
        <PaymentAction label={label} disabled={disabled} onPress={onOpen} />
        <StaxisText variant="formHint" style={styles.hint}>Swipe up to review</StaxisText>
      </SafeAreaView>
      <Modal visible={open} transparent animationType={reducedMotion ? 'none' : 'slide'} onRequestClose={() => { if (!disabled) onClose(); }}>
        <View style={styles.backdrop}>
          <Pressable style={StyleSheet.absoluteFill} disabled={disabled} accessibilityRole="button" accessibilityLabel="Close payment review" onPress={onClose} />
          <Animated.View style={[styles.sheet, { maxHeight: height * 0.85, transform: [{ translateY: offset }] }]} accessibilityViewIsModal>
            <SafeAreaView edges={['bottom']} style={styles.sheetSafe}>
              <View {...sheetGesture.panHandlers} style={styles.sheetHeader}>
                <View style={styles.handle} />
                <View style={styles.titleRow}>
                  <StaxisText variant="displaySm" accessibilityRole="header" style={styles.flex}>{title}</StaxisText>
                  <Pressable
                    disabled={disabled}
                    onPress={onClose}
                    onFocus={() => setCloseFocused(true)}
                    onBlur={() => setCloseFocused(false)}
                    accessibilityRole="button"
                    accessibilityLabel="Close payment review"
                    accessibilityState={{ disabled }}
                    style={({ pressed }) => [
                      styles.close,
                      closeFocused && styles.closeFocused,
                      pressed && styles.closePressed,
                      disabled && styles.closeDisabled,
                    ]}
                  >
                    {({ pressed }) => (
                      <View style={styles.closeIcon} pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
                        <View style={[styles.closeStroke, styles.closeStrokeForward, pressed && styles.closeStrokePressed]} />
                        <View style={[styles.closeStroke, styles.closeStrokeBack, pressed && styles.closeStrokePressed]} />
                      </View>
                    )}
                  </Pressable>
                </View>
              </View>
              <ScrollView style={[styles.sheetScroll, { maxHeight: height * 0.65 }]} contentContainerStyle={styles.content}>{children}</ScrollView>
            </SafeAreaView>
          </Animated.View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  rail: { backgroundColor: Colors.bgCard, borderTopWidth: 1, borderTopColor: Colors.lineStrong, paddingHorizontal: Spacing.xl, paddingTop: Spacing.sm },
  handle: { width: Spacing.xxxl, height: Spacing.xs, backgroundColor: Colors.lineStrong, borderRadius: Radius.pill, alignSelf: 'center', marginBottom: Spacing.sm },
  hint: { textAlign: 'center', paddingVertical: Spacing.xs },
  backdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: Colors.modalBackdrop },
  sheet: { backgroundColor: Colors.bgApp, borderTopLeftRadius: Radius.lg + Spacing.md, borderTopRightRadius: Radius.lg + Spacing.md, overflow: 'hidden' },
  sheetSafe: { flexShrink: 1 },
  sheetScroll: { flexShrink: 1 },
  sheetHeader: { paddingHorizontal: Spacing.xl, paddingTop: Spacing.md },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  close: {
    width: Spacing.xxxl + Spacing.xs,
    height: Spacing.xxxl + Spacing.xs,
    flexShrink: 0,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radius.pill,
    borderWidth: 2,
    borderColor: Colors.lineStrong,
    backgroundColor: Colors.bgCard,
  },
  closeFocused: { borderColor: Colors.text },
  closePressed: { backgroundColor: Colors.text, borderColor: Colors.text },
  closeDisabled: { opacity: 0.4 },
  closeIcon: { width: Spacing.xxl, height: Spacing.xxl, alignItems: 'center', justifyContent: 'center' },
  closeStroke: { position: 'absolute', width: Spacing.xxl, height: Spacing.xs, borderRadius: Radius.pill, backgroundColor: Colors.text },
  closeStrokeForward: { transform: [{ rotate: '45deg' }] },
  closeStrokeBack: { transform: [{ rotate: '-45deg' }] },
  closeStrokePressed: { backgroundColor: Colors.bgCard },
  content: { padding: Spacing.xl, gap: Spacing.lg },
  flex: { flex: 1 },
});
