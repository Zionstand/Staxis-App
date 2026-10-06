import { Pressable, StyleSheet, View, type ViewStyle } from 'react-native';

import { Colors, Spacing } from '@/constants/staxis-theme';

import { StaxisText } from './StaxisText';

export type ListItemProps = {
  icon?: React.ReactNode;
  title: string;
  subtitle?: string;
  trailing?: string;
  onPress?: () => void;
  showBorder?: boolean;
};

export function ListItem({
  icon,
  title,
  subtitle,
  trailing,
  onPress,
  showBorder = true,
}: ListItemProps) {
  const Wrapper = onPress ? Pressable : View;
  const borderStyle: ViewStyle | undefined = showBorder
    ? { borderBottomWidth: 1, borderBottomColor: Colors.line }
    : undefined;

  return (
    <Wrapper
      style={[styles.row, borderStyle]}
      {...(onPress ? { onPress } : {})}
    >
      {icon && <View style={styles.icon}>{icon}</View>}
      <View style={styles.body}>
        <StaxisText variant="listTitle">{title}</StaxisText>
        {subtitle && (
          <StaxisText variant="listSub" style={{ marginTop: 2 }}>
            {subtitle}
          </StaxisText>
        )}
      </View>
      {trailing && <StaxisText variant="listTime">{trailing}</StaxisText>}
    </Wrapper>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingVertical: Spacing.md,
  },
  icon: {
    width: 32,
    height: 32,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: { flex: 1, minWidth: 0 },
});
