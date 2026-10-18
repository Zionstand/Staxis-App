import { Modal, ScrollView, StyleSheet, View } from 'react-native';
import { StaxisButton, StaxisText } from '@/components/staxis';
import { Colors, Radius, Spacing } from '@/constants/staxis-theme';

export function ConfirmDialog({ visible, title, message, confirmLabel, onConfirm, onDismiss, busy = false }: {
  visible: boolean; title: string; message: string; confirmLabel: string; onConfirm: () => void; onDismiss: () => void; busy?: boolean;
}) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={() => { if (!busy) onDismiss(); }}>
      <View style={styles.backdrop}>
        <View style={styles.card} accessibilityViewIsModal>
          <StaxisText variant="modalTitle" accessibilityRole="header">{title}</StaxisText>
          <ScrollView style={styles.message}><StaxisText variant="bodyMd">{message}</StaxisText></ScrollView>
          <StaxisButton disabled={busy} label={confirmLabel} onPress={onConfirm} block />
          <StaxisButton disabled={busy} variant="ghost" label="Go back" onPress={onDismiss} block />
        </View>
      </View>
    </Modal>
  );
}
const styles = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: 'center', padding: Spacing.xl, backgroundColor: Colors.modalBackdrop },
  card: { padding: Spacing.xl, gap: Spacing.lg, borderRadius: Radius.lg, backgroundColor: Colors.bgCard },
  message: { maxHeight: Spacing.xxxl * 5 },
});
