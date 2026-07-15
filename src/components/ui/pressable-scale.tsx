import { useRef } from 'react';
import {
  Animated,
  Pressable,
  type PressableProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

type PressableScaleProps = Omit<PressableProps, 'style' | 'children'> & {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  /** Scale applied while pressed. */
  scaleTo?: number;
};

/**
 * A Pressable that gently scales down while pressed — adds tactile feedback to
 * dashboard cards/tiles. Uses the built-in Animated driver (native), so it needs
 * no worklet setup.
 */
export function PressableScale({
  children,
  style,
  scaleTo = 0.97,
  ...rest
}: PressableScaleProps) {
  const scale = useRef(new Animated.Value(1)).current;

  const animateTo = (value: number) =>
    Animated.spring(scale, {
      toValue: value,
      useNativeDriver: true,
      speed: 50,
      bounciness: 0,
    }).start();

  return (
    <Pressable
      onPressIn={() => animateTo(scaleTo)}
      onPressOut={() => animateTo(1)}
      {...rest}>
      <Animated.View style={[{ transform: [{ scale }] }, style]}>{children}</Animated.View>
    </Pressable>
  );
}
