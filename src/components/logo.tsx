import { Image } from 'expo-image';
import { StyleSheet, View, type ImageStyle, type StyleProp, type ViewProps } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';

// Full Staxis lockup (white wordmark on its own deep-red badge). Because it
// carries its own background plate, it reads on both light and dark surfaces.
const STAXIS_LOGO = require('@/assets/images/staxis-logo.png');
const LOGO_ASPECT = 1319 / 517; // intrinsic PNG dimensions

// Standalone Staxis mark (the descending trapezoids) for compact/branded spots
// such as empty states and footers.
const STAXIS_MARK = require('@/assets/images/staxis-mark.png');

type LogoProps = ViewProps & {
  /** Rendered logo width in dp; height is derived from the aspect ratio. */
  width?: number;
};

export function Logo({ width = 176, style, ...rest }: LogoProps) {
  return (
    <View style={[styles.wrap, style]} {...rest}>
      <Image
        source={STAXIS_LOGO}
        style={{ width, height: width / LOGO_ASPECT }}
        contentFit="contain"
        accessibilityLabel="Staxis"
      />
    </View>
  );
}

type MarkProps = {
  /** Square size in dp. */
  size?: number;
  style?: StyleProp<ImageStyle>;
};

export function Mark({ size = 44, style }: MarkProps) {
  return (
    <Image
      source={STAXIS_MARK}
      style={[{ width: size, height: size }, style]}
      contentFit="contain"
      accessibilityLabel="Staxis"
    />
  );
}

/**
 * Navigation-header title: the compact Staxis mark next to the screen title, so
 * the brand stays present in the app chrome. Pass as a native-stack `headerTitle`
 * — it receives the resolved title string as `children`.
 */
export function BrandTitle({ title }: { title?: string }) {
  return (
    <View style={styles.brandTitle}>
      <Mark size={22} />
      {!!title && (
        <ThemedText type="smallBold" numberOfLines={1} style={styles.brandTitleText}>
          {title}
        </ThemedText>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
  },
  brandTitle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  brandTitleText: {
    fontSize: 16,
  },
});
