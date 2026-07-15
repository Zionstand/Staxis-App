import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';

import { PressableScale } from '@/components/ui/pressable-scale';
import { ThemedText } from '@/components/themed-text';
import { Spacing, Tints, type TintName } from '@/constants/theme';
import { useScheme } from '@/hooks/use-theme';

type StatTileProps = {
  tint: TintName;
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  sub?: string;
  onPress?: () => void;
  /** Optional node docked top-right (e.g. a small Gauge). */
  accessory?: React.ReactNode;
};

/**
 * A compact, color-tinted metric tile for the dashboard bento grid. The soft
 * tinted background + saturated icon/number come from the brand `Tints` palette
 * and adapt to light/dark automatically.
 */
export function StatTile({ tint, icon, label, value, sub, onPress, accessory }: StatTileProps) {
  const scheme = useScheme();
  const t = Tints[scheme][tint];

  const body = (
    <View style={[styles.tile, { backgroundColor: t.bg }]}>
      <View style={styles.top}>
        <View style={[styles.iconChip, { backgroundColor: `${t.fg}22` }]}>
          <Ionicons name={icon} size={18} color={t.fg} />
        </View>
        {accessory}
      </View>
      <ThemedText type="subtitle" numberOfLines={1} style={[styles.value, { color: t.fg }]}>
        {value}
      </ThemedText>
      <ThemedText type="smallBold" numberOfLines={1} style={{ color: t.fg }}>
        {label}
      </ThemedText>
      {sub ? (
        <ThemedText type="small" numberOfLines={1} style={[styles.sub, { color: t.fg }]}>
          {sub}
        </ThemedText>
      ) : null}
    </View>
  );

  if (!onPress) return body;
  return (
    <PressableScale onPress={onPress} accessibilityRole="button" accessibilityLabel={label}>
      {body}
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  tile: {
    borderRadius: Spacing.three,
    padding: Spacing.three,
    minHeight: 132,
    justifyContent: 'flex-start',
    gap: Spacing.half,
  },
  top: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: Spacing.two,
  },
  iconChip: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  value: {
    fontSize: 24,
    lineHeight: 30,
  },
  sub: {
    opacity: 0.75,
  },
});
