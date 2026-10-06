import { StyleSheet, View, type ViewProps, type ViewStyle } from 'react-native';

import {
  CardSize,
  Colors,
  Radius,
  Shadow,
  Spacing,
} from '@/constants/staxis-theme';

import { StaxisText } from './StaxisText';

export type StaxisCardProps = ViewProps & {
  size?: 'default' | 'lg';
  title?: string;
  subtitle?: string;
  headerRight?: React.ReactNode;
};

export function StaxisCard({
  size = 'default',
  title,
  subtitle,
  headerRight,
  children,
  style,
  ...rest
}: StaxisCardProps) {
  return (
    <View style={[styles.card, CardSize[size] as ViewStyle, style]} {...rest}>
      {(title || headerRight) && (
        <View style={styles.header}>
          <View>
            {title && <StaxisText variant="cardTitle">{title}</StaxisText>}
            {subtitle && (
              <StaxisText variant="cardSub" style={{ marginTop: 2 }}>
                {subtitle}
              </StaxisText>
            )}
          </View>
          {headerRight}
        </View>
      )}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.bgCard,
    borderWidth: 1,
    borderColor: Colors.line,
    borderRadius: Radius.md,
    ...Shadow.sm,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: Spacing.md,
    marginBottom: Spacing.lg,
  },
});
