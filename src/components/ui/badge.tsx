import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';

type BadgeProps = {
  label: string;
  bg: string;
  color: string;
};

export function Badge({ label, bg, color }: BadgeProps) {
  return (
    <View style={[styles.badge, { backgroundColor: bg }]}>
      <ThemedText type="small" style={[styles.text, { color }]}>
        {label}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  text: {
    fontSize: 10,
    lineHeight: 14,
    fontWeight: '700',
  },
});
