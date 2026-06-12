import { StyleSheet, View } from 'react-native';

type ProgressBarProps = {
  value: number;
  trackColor?: string;
  fillColor?: string;
};

export function ProgressBar({
  value,
  trackColor = '#e2e8f0',
  fillColor = '#208AEF',
}: ProgressBarProps) {
  const width = `${Math.max(0, Math.min(100, value))}%` as const;

  return (
    <View style={[styles.track, { backgroundColor: trackColor }]}>
      <View style={[styles.fill, { width, backgroundColor: fillColor }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: 3,
  },
});
