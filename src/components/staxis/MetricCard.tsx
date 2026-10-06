import { Pressable, StyleSheet, View } from 'react-native';

import {
  Colors,
  MetricSize,
  Palette,
  Radius,
  Shadow,
} from '@/constants/staxis-theme';

import { StaxisText } from './StaxisText';

export type MetricCardProps = {
  label: string;
  value: string;
  footer?: string;
  trend?: 'up' | 'warn';
  icon?: React.ReactNode;
  highlight?: boolean;
  onPress?: () => void;
};

export function MetricCard({
  label,
  value,
  footer,
  trend,
  icon,
  highlight,
  onPress,
}: MetricCardProps) {
  const Wrapper = onPress ? Pressable : View;

  return (
    <Wrapper
      style={[styles.card, highlight && styles.highlight]}
      {...(onPress ? { onPress } : {})}
    >
      <View style={styles.head}>
        <StaxisText variant="metricLabel">{label}</StaxisText>
        {icon}
      </View>
      <StaxisText variant="metricValue" style={styles.value}>
        {value}
      </StaxisText>
      {footer && (
        <StaxisText
          variant="metricFoot"
          style={trend === 'up' ? styles.trendUp : trend === 'warn' ? styles.trendWarn : undefined}
        >
          {footer}
        </StaxisText>
      )}
    </Wrapper>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.bgCard,
    borderWidth: 1,
    borderColor: Colors.line,
    borderRadius: Radius.md,
    padding: MetricSize.padding,
    ...Shadow.sm,
  },
  highlight: {
    borderColor: Palette.warn,
  },
  head: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: MetricSize.headMarginBottom,
  },
  value: { marginBottom: MetricSize.valueMarginBottom },
  trendUp: { color: Palette.success },
  trendWarn: { color: Palette.warn },
});
