import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Modal, ScrollView, StyleSheet, View } from 'react-native';

import { ErrorModal } from '@/components/error-modal';
import { EmptyState, StaxisButton, StaxisCard, StaxisTag, StaxisText } from '@/components/staxis';
import { Colors, Palette, Radius, Spacing } from '@/constants/staxis-theme';
import { deleteData, fetchData } from '@/lib/api';
import { BILLING_OPTIONS, type PaymentCheckout } from '@/lib/billing';
import { clearPendingPayment } from '@/lib/pending-payment';
import { getUserFacingError } from '@/lib/user-facing-error';
import { fmtNaira } from '@/lib/utils';

export default function PendingPaymentScreen() {
  const { reference: referenceParam } = useLocalSearchParams<{ reference: string | string[] }>();
  const reference = Array.isArray(referenceParam) ? referenceParam[0] : referenceParam;
  const [checkout, setCheckout] = useState<PaymentCheckout | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setCheckout(null);
    if (!reference) {
      setError('This payment reference is missing. Return to payment history and try again.');
      setLoading(false);
      return;
    }
    try {
      const result = await fetchData<PaymentCheckout>(`/payment/pending/${encodeURIComponent(reference)}`);
      setCheckout(result);
      setError(null);
    } catch (failure) {
      const status = (failure as { response?: { status?: number } }).response?.status;
      setError(status === 409
        ? 'This payment is no longer pending. Return to billing to see its latest status.'
        : getUserFacingError(failure, 'Could not load this pending payment. Please try again.'));
    } finally {
      setLoading(false);
    }
  }, [reference]);

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  const remove = async () => {
    if (!reference || deleting) return;
    setDeleting(true);
    try {
      await deleteData(`/payment/pending/${encodeURIComponent(reference)}`);
      try {
        await clearPendingPayment(reference);
      } catch {
        setConfirmDelete(false);
        setCheckout(null);
        setError('The payment was removed from your history, but its saved details could not be cleared on this device. Reopen the app before starting another checkout.');
        return;
      }
      setConfirmDelete(false);
      router.replace('/(tabs)/billing');
    } catch (failure) {
      setConfirmDelete(false);
      setError(getUserFacingError(failure, 'Could not remove this pending payment. Please try again.'));
    } finally {
      setDeleting(false);
    }
  };

  const option = BILLING_OPTIONS.find((item) => item.value === checkout?.billingCycle);
  return (
    <View style={styles.page}>
      <ScrollView contentContainerStyle={styles.content}>
        {loading ? <ActivityIndicator color={Palette.signal} style={styles.loader} /> : !checkout ? (
          <EmptyState title="Payment unavailable" message="Return to billing or try loading this payment again."
            action={{ label: 'Try again', onPress: load }} />
        ) : (
          <>
            <View style={styles.heading}>
              <StaxisTag variant="warn" label="Pending" />
              <StaxisText variant="displaySm">Your payment details</StaxisText>
              <StaxisText variant="bodySm">Review the plans and amount before continuing your checkout.</StaxisText>
            </View>
            <StaxisCard title="Selected plans">
              {checkout.lineItems?.length ? checkout.lineItems.map((item) => (
                <View key={item.planId} style={styles.plan}>
                  <StaxisText variant="listTitle">{item.name}</StaxisText>
                  <StaxisText variant="listSub">{item.trackTitle}</StaxisText>
                  <View style={styles.row}>
                    <StaxisText variant="listSub">{fmtNaira(item.monthlyAmount)}/month</StaxisText>
                    <StaxisText variant="listTitle">{fmtNaira(item.periodAmount)}</StaxisText>
                  </View>
                </View>
              )) : <StaxisText variant="bodySm">{checkout.selectedPlans.length} selected plan{checkout.selectedPlans.length === 1 ? '' : 's'}. Details are unavailable for this older checkout.</StaxisText>}
            </StaxisCard>
            <StaxisCard title="Payment breakdown">
              <View style={styles.row}><StaxisText variant="bodyBase">Payment period</StaxisText><StaxisText variant="listTitle">{option?.label ?? checkout.billingCycle}</StaxisText></View>
              {checkout.subtotal !== undefined && <View style={styles.row}><StaxisText variant="bodyBase">Plan subtotal</StaxisText><StaxisText variant="listTitle">{fmtNaira(checkout.subtotal)}</StaxisText></View>}
              {checkout.bundleDiscount !== undefined && <View style={styles.row}><StaxisText variant="bodyBase">Bundle savings</StaxisText><StaxisText variant="listTitle">−{fmtNaira(checkout.bundleDiscount)}</StaxisText></View>}
              {checkout.cycleDiscount !== undefined && <View style={styles.row}><StaxisText variant="bodyBase">Period savings</StaxisText><StaxisText variant="listTitle">−{fmtNaira(checkout.cycleDiscount)}</StaxisText></View>}
              {checkout.bundleDiscount === undefined && checkout.cycleDiscount === undefined && <View style={styles.row}><StaxisText variant="bodyBase">Total savings</StaxisText><StaxisText variant="listTitle">−{fmtNaira(checkout.discountAmount)}</StaxisText></View>}
              <View style={[styles.row, styles.total]}><StaxisText variant="listTitle">Amount to pay</StaxisText><StaxisText variant="displaySm">{fmtNaira(checkout.amount)}</StaxisText></View>
              <StaxisText variant="formHint">Payment reference</StaxisText>
              <StaxisText variant="bodySm" selectable>{checkout.reference}</StaxisText>
            </StaxisCard>
            <StaxisButton label="Continue payment →" block disabled={deleting}
              onPress={() => router.push({ pathname: '/(tabs)/billing/renew', params: { reference: checkout.reference } })} />
            <StaxisButton label="Remove pending payment" variant="ghost" block disabled={deleting} onPress={() => setConfirmDelete(true)} />
            <StaxisText variant="formHint">If you already paid, continue to check the payment status before making another payment.</StaxisText>
          </>
        )}
      </ScrollView>
      <ErrorModal message={error} onDismiss={() => setError(null)} />
      <Modal visible={confirmDelete} transparent animationType="fade" onRequestClose={() => { if (!deleting) setConfirmDelete(false); }}>
        <View style={styles.backdrop}><View style={styles.confirm} accessibilityViewIsModal>
          <StaxisText variant="modalTitle">Remove this pending payment?</StaxisText>
          <StaxisText variant="bodyMd">This removes it from your activity and payment history. The payment reference is kept for reconciliation. Removing it does not cancel a payment on Paystack or issue a refund.</StaxisText>
          <StaxisButton label={deleting ? 'Removing…' : 'Remove pending payment'} disabled={deleting} block onPress={remove} />
          <StaxisButton label="Keep payment" variant="ghost" disabled={deleting} block onPress={() => setConfirmDelete(false)} />
        </View></View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: Colors.bgApp },
  content: { padding: Spacing.xl, paddingBottom: Spacing.xxxl, gap: Spacing.lg },
  loader: { marginTop: Spacing.xxxl },
  heading: { alignItems: 'flex-start', gap: Spacing.md },
  plan: { gap: Spacing.xs, paddingVertical: Spacing.md, borderBottomWidth: 1, borderBottomColor: Colors.line },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.md, flexWrap: 'wrap', paddingVertical: Spacing.sm },
  total: { borderTopWidth: 1, borderTopColor: Colors.lineStrong, marginTop: Spacing.sm, paddingTop: Spacing.lg },
  backdrop: { flex: 1, justifyContent: 'center', padding: Spacing.xl, backgroundColor: Colors.modalBackdrop },
  confirm: { backgroundColor: Colors.bgCard, borderRadius: Radius.lg, padding: Spacing.xl, gap: Spacing.lg, borderTopWidth: 3, borderTopColor: Palette.signal },
});
