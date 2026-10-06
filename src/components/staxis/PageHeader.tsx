import { StyleSheet, View } from 'react-native';

import { Spacing } from '@/constants/staxis-theme';

import { StaxisText } from './StaxisText';

export type PageHeaderProps = {
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
};

export function PageHeader({ title, subtitle, right }: PageHeaderProps) {
  return (
    <View style={styles.header}>
      <View style={styles.left}>
        <StaxisText variant="pageTitle">{title}</StaxisText>
        {subtitle && (
          <StaxisText variant="pageSub" style={{ marginTop: 4 }}>
            {subtitle}
          </StaxisText>
        )}
      </View>
      {right}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: Spacing.xl,
    marginBottom: Spacing.xl,
    flexWrap: 'wrap',
  },
  left: { flex: 1 },
});
