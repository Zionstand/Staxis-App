import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Badge } from '@/components/ui/badge';
import { Spacing } from '@/constants/theme';
import { Transaction } from '@/lib/types';
import { fmtDate, fmtNaira } from '@/lib/utils';

const TXN_STYLES: Record<string, { bg: string; color: string }> = {
  Paid: { bg: '#dcfce7', color: '#15803d' },
  Pending: { bg: '#fef3c7', color: '#b45309' },
  Failed: { bg: '#ffe4e6', color: '#be123c' },
};

export function txnStyle(status: string) {
  return TXN_STYLES[status] ?? { bg: '#f1f5f9', color: '#64748b' };
}

export function TxnRow({ txn }: { txn: Transaction }) {
  const ts = txnStyle(txn.status);
  return (
    <View style={styles.txnRow}>
      <View style={styles.txnInfo}>
        <ThemedText type="small" numberOfLines={1}>
          {txn.description}
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {fmtDate(txn.date)}
        </ThemedText>
      </View>
      <View style={styles.txnRight}>
        <ThemedText type="smallBold">{fmtNaira(txn.amount)}</ThemedText>
        <Badge label={txn.status} bg={ts.bg} color={ts.color} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  txnRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
    paddingVertical: Spacing.one,
  },
  txnInfo: {
    flexShrink: 1,
    gap: Spacing.half,
  },
  txnRight: {
    alignItems: 'flex-end',
    gap: Spacing.half,
  },
});
