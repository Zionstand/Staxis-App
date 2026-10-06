import { StyleSheet, View } from 'react-native';

import { Colors, EmptyStateSize } from '@/constants/staxis-theme';

import { StaxisButton, type StaxisButtonProps } from './StaxisButton';
import { StaxisText } from './StaxisText';

export type EmptyStateProps = {
  icon?: React.ReactNode;
  title: string;
  message: string;
  action?: Pick<StaxisButtonProps, 'label' | 'onPress' | 'variant'>;
};

export function EmptyState({ icon, title, message, action }: EmptyStateProps) {
  return (
    <View style={styles.container}>
      {icon && <View style={styles.icon}>{icon}</View>}
      <StaxisText variant="emptyTitle">{title}</StaxisText>
      <StaxisText variant="emptySub" style={styles.sub}>
        {message}
      </StaxisText>
      {action && (
        <StaxisButton
          variant={action.variant ?? 'primary'}
          label={action.label}
          onPress={action.onPress}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: EmptyStateSize.paddingVertical,
    paddingHorizontal: EmptyStateSize.paddingHorizontal,
    alignItems: 'center',
  },
  icon: {
    marginBottom: EmptyStateSize.iconMarginBottom,
    width: EmptyStateSize.iconSize,
    height: EmptyStateSize.iconSize,
    alignItems: 'center',
    justifyContent: 'center',
    tintColor: Colors.text3,
  },
  sub: {
    maxWidth: EmptyStateSize.subMaxWidth,
    textAlign: 'center',
    marginTop: 6,
    marginBottom: EmptyStateSize.subMarginBottom,
  },
});
