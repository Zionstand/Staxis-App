import { View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

import { ThemedText } from '@/components/themed-text';

type GaugeProps = {
  /** 0–100. */
  progress: number;
  size?: number;
  stroke?: number;
  color: string;
  trackColor: string;
  /** Optional big text in the middle of the ring. */
  centerLabel?: string;
  centerColor?: string;
};

/** A crisp circular progress ring (SVG), optionally with a centered label. */
export function Gauge({
  progress,
  size = 64,
  stroke = 7,
  color,
  trackColor,
  centerLabel,
  centerColor,
}: GaugeProps) {
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.max(0, Math.min(100, progress));
  const dashOffset = circumference - (clamped / 100) * circumference;

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      {/* Rotate -90° so the arc starts at 12 o'clock. */}
      <Svg
        width={size}
        height={size}
        style={{ position: 'absolute', transform: [{ rotate: '-90deg' }] }}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={trackColor}
          strokeWidth={stroke}
          fill="none"
        />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth={stroke}
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          strokeLinecap="round"
        />
      </Svg>
      {centerLabel ? (
        <ThemedText
          type="smallBold"
          style={{ color: centerColor ?? color, fontSize: 15, lineHeight: 18 }}>
          {centerLabel}
        </ThemedText>
      ) : null}
    </View>
  );
}
