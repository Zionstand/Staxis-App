import { Pressable, StyleSheet, View } from 'react-native';

import {
  BannerSize,
  Palette,
  Radius,
} from '@/constants/staxis-theme';

import { StaxisText } from './StaxisText';

type BannerVariant = 'warn' | 'danger';

export type BannerProps = {
  variant: BannerVariant;
  title: string;
  message: string;
  action?: string;
  onAction?: () => void;
  icon?: React.ReactNode;
};

const variantStyles: Record<BannerVariant, { bg: string; border: string; titleColor: string }> = {
  warn: {
    bg: Palette.warnTint,
    border: 'rgba(184,122,0,0.2)',
    titleColor: Palette.warn,
  },
  danger: {
    bg: Palette.signalTint,
    border: 'rgba(176,30,40,0.15)',
    titleColor: Palette.signal,
  },
};

export function Banner({ variant, title, message, action, onAction, icon }: BannerProps) {
  const v = variantStyles[variant];

  return (
    <View
      style={[
        styles.banner,
        { backgroundColor: v.bg, borderColor: v.border },
      ]}
    >
      {icon}
      <View style={styles.body}>
        <StaxisText variant="bannerTitle" style={{ color: v.titleColor }}>
          {title}{' '}
          <StaxisText variant="bannerBody">{message}</StaxisText>
        </StaxisText>
      </View>
      {action && onAction && (
        <Pressable onPress={onAction}>
          <StaxisText variant="bannerAction">{action}</StaxisText>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    paddingVertical: BannerSize.padding.paddingVertical,
    paddingHorizontal: BannerSize.padding.paddingHorizontal,
    borderRadius: Radius.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: BannerSize.gap,
    marginBottom: BannerSize.marginBottom,
    borderWidth: 1,
  },
  body: { flex: 1 },
});
