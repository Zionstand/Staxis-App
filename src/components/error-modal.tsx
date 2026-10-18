import { Modal, ScrollView, StyleSheet, View } from 'react-native';

import { StaxisButton, StaxisText } from '@/components/staxis';
import { Colors, Palette, Radius, Spacing } from '@/constants/staxis-theme';

export function ErrorModal({ message, onDismiss, title = 'Something went wrong' }: {
  message: string | null;
  onDismiss: () => void;
  title?: string;
}) {
  return (
    <Modal visible={!!message} transparent animationType="fade" onRequestClose={onDismiss}>
      <View style={styles.backdrop}>
        <View style={styles.card} accessibilityViewIsModal>
          <StaxisText variant="modalTitle" accessibilityRole="header">{title}</StaxisText>
          <ScrollView style={styles.message}>
            <StaxisText variant="bodyMd" accessibilityRole="alert">{message}</StaxisText>
          </ScrollView>
          <StaxisButton label="Dismiss" onPress={onDismiss} block />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: 'center', padding: Spacing.xl, backgroundColor: Colors.modalBackdrop },
  card: { backgroundColor: Colors.bgCard, borderRadius: Radius.lg, padding: Spacing.xl, gap: Spacing.lg, borderTopWidth: 3, borderTopColor: Palette.signal },
  message: { maxHeight: 280 },
});
