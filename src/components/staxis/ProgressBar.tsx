import { StyleSheet, View } from 'react-native';

import { Palette } from '@/constants/staxis-theme';

export type ProgressBarProps = {
  progress: number;
  color?: string;
  trackColor?: string;
  height?: number;
};

export function ProgressBar({
  progress,
  color = Palette.signal,
  trackColor = Palette.bone2,
  height = 6,
}: ProgressBarProps) {
  const clamped = Math.max(0, Math.min(1, progress));

  return (
    <View style={[styles.track, { backgroundColor: trackColor, height }]}>
      <View
        style={[
          styles.fill,
          {
            backgroundColor: color,
            width: `${clamped * 100}%`,
            height,
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  track: { borderRadius: 3, overflow: 'hidden' },
  fill: { borderRadius: 3 },
});
