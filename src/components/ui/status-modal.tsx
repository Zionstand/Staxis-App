import { Modal, Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeIn, ZoomIn } from 'react-native-reanimated';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type StatusVariant = 'success' | 'error';

export type StatusAction = {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary';
};

type StatusModalProps = {
  visible: boolean;
  variant: StatusVariant;
  title: string;
  message?: string;
  actions: StatusAction[];
  /** Fired on Android back button / backdrop tap. */
  onRequestClose?: () => void;
};

const VARIANTS: Record<StatusVariant, { accent: string; badge: string; symbol: string }> = {
  success: { accent: '#15803d', badge: '#dcfce7', symbol: '✓' },
  error: { accent: '#be123c', badge: '#ffe4e6', symbol: '✕' },
};

/**
 * A branded, theme-aware result dialog used in place of the native
 * `Alert.alert` for payment (and similar) outcomes.
 */
export function StatusModal({
  visible,
  variant,
  title,
  message,
  actions,
  onRequestClose,
}: StatusModalProps) {
  const theme = useTheme();
  const v = VARIANTS[variant];

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onRequestClose}>
      <Animated.View entering={FadeIn.duration(150)} style={styles.backdrop}>
        {/* Tapping outside dismisses when a close handler is provided. */}
        <Pressable style={StyleSheet.absoluteFill} onPress={onRequestClose} />

        <Animated.View
          entering={ZoomIn.duration(180)}
          style={[styles.card, { backgroundColor: theme.background }]}>
          <View style={[styles.iconBadge, { backgroundColor: v.badge }]}>
            <ThemedText style={[styles.icon, { color: v.accent }]}>{v.symbol}</ThemedText>
          </View>

          <ThemedText style={styles.title}>{title}</ThemedText>
          {!!message && (
            <ThemedText type="small" themeColor="textSecondary" style={styles.message}>
              {message}
            </ThemedText>
          )}

          <View style={styles.actions}>
            {actions.map((action) => {
              const secondary = action.variant === 'secondary';
              return (
                <Pressable
                  key={action.label}
                  onPress={action.onPress}
                  style={({ pressed }) => [
                    styles.button,
                    secondary
                      ? { backgroundColor: theme.backgroundElement }
                      : { backgroundColor: v.accent },
                    pressed && styles.pressed,
                  ]}>
                  <ThemedText
                    type="smallBold"
                    style={secondary ? { color: theme.text } : styles.primaryText}>
                    {action.label}
                  </ThemedText>
                </Pressable>
              );
            })}
          </View>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    padding: Spacing.four,
  },
  card: {
    width: '100%',
    maxWidth: 360,
    borderRadius: 20,
    padding: Spacing.four,
    alignItems: 'center',
    gap: Spacing.two,
  },
  iconBadge: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.one,
  },
  icon: {
    fontSize: 30,
    lineHeight: 36,
    fontWeight: '700',
  },
  title: {
    fontSize: 20,
    lineHeight: 26,
    fontWeight: '700',
    textAlign: 'center',
  },
  message: {
    textAlign: 'center',
  },
  actions: {
    width: '100%',
    gap: Spacing.two,
    marginTop: Spacing.two,
  },
  button: {
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryText: {
    color: '#ffffff',
  },
  pressed: {
    opacity: 0.7,
  },
});
