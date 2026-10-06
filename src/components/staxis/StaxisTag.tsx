import { StyleSheet, View } from 'react-native';

import { Palette, Radius, TagSize } from '@/constants/staxis-theme';

import { StaxisText } from './StaxisText';

type TagVariant = 'warn' | 'danger' | 'success' | 'info' | 'neutral';

export type StaxisTagProps = {
  variant?: TagVariant;
  label: string;
};

const variantColors: Record<TagVariant, { bg: string; fg: string }> = {
  warn: { bg: Palette.warnTint, fg: Palette.warn },
  danger: { bg: Palette.signalTint, fg: Palette.signal },
  success: { bg: Palette.successTint, fg: Palette.success },
  info: { bg: Palette.infoTint, fg: Palette.info },
  neutral: { bg: Palette.bone2, fg: 'rgba(10,10,15,0.65)' },
};

export function StaxisTag({ variant = 'neutral', label }: StaxisTagProps) {
  const { bg, fg } = variantColors[variant];

  return (
    <View style={[styles.tag, { backgroundColor: bg }]}>
      <StaxisText variant="tag" style={{ color: fg }}>
        {label}
      </StaxisText>
    </View>
  );
}

const styles = StyleSheet.create({
  tag: {
    paddingVertical: TagSize.paddingVertical,
    paddingHorizontal: TagSize.paddingHorizontal,
    borderRadius: Radius.pill,
    alignSelf: 'flex-start',
  },
});
