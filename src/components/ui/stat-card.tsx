import { StyleSheet, View, type ViewProps } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';

type StatCardProps = {
  label: string;
  title: string;
  sub?: string;
  children?: React.ReactNode;
} & Pick<ViewProps, 'style'>;

export function StatCard({ label, title, sub, children, style }: StatCardProps) {
  return (
    <ThemedView type="backgroundElement" style={[styles.card, style]}>
      <ThemedText type="small" themeColor="textSecondary">
        {label}
      </ThemedText>
      <ThemedText type="subtitle" style={styles.title} numberOfLines={1}>
        {title}
      </ThemedText>
      {sub && (
        <ThemedText type="small" themeColor="textSecondary">
          {sub}
        </ThemedText>
      )}
      {children && <View style={styles.footer}>{children}</View>}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: Spacing.three,
    padding: Spacing.three,
    gap: Spacing.half,
  },
  title: {
    fontSize: 22,
    lineHeight: 28,
  },
  footer: {
    marginTop: Spacing.two,
    gap: Spacing.two,
  },
});
