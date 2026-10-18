import * as WebBrowser from 'expo-web-browser';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, Platform } from 'react-native';

import { fetchData, postData } from '@/lib/api';
import { PaymentCheckout, PaymentConfirmation, isValidPaymentAmount, isTrustedPaystackCheckoutUrl, paymentError, verificationPayload } from '@/lib/billing';
import { useAuth } from '@/store/use-auth';
import { Colors } from '@/constants/staxis-theme';
import { clearPendingPayment, readPendingPayment, savePendingPayment } from '@/lib/pending-payment';
import { session } from '@/lib/session';

function checkoutFailureCode(error: unknown) {
  return (error as { response?: { data?: { code?: string } } })?.response?.data?.code;
}

function isClosedCheckout(error: unknown) {
  return ['CHECKOUT_CLOSED', 'CHECKOUT_NOT_FOUND'].includes(checkoutFailureCode(error) ?? '');
}

// Persist references only; legacy recovery payloads are encrypted by pending-payment.
export function usePaymentCheckout(onSuccess: (result?: PaymentConfirmation) => void, reference?: string) {
  const userId = useAuth((state) => state.user?.id);
  const generation = session.current();
  const [saved, setSaved] = useState<{ userId: string; checkout: PaymentCheckout } | null>(null);
  const [busy, setBusy] = useState(false);
  const [restoredKey, setRestoredKey] = useState<string | null | undefined>(undefined);
  const [restoreFailed, setRestoreFailed] = useState(false);
  const [opening, setOpening] = useState(false);
  const [canRestart, setCanRestart] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const lock = useRef(false);
  const pending = useRef<{ userId: string; checkout: PaymentCheckout } | null>(null);
  const key = userId ? `staxis-payment:${userId}` : null;
  const restoreSource = key ? `${key}:${reference ?? ''}` : null;
  const restoring = restoredKey !== restoreSource;
  const checkout = saved && saved.userId === userId ? saved.checkout : null;
  const successRef = useRef(onSuccess);
  useEffect(() => { successRef.current = onSuccess; }, [onSuccess]);

  const verify = useCallback(async (options?: { silent?: boolean }) => {
    const current = pending.current?.checkout;
    if (!current || pending.current?.userId !== userId || !key || lock.current || !session.isCurrent(generation)) return;
    lock.current = true;
    setBusy(true);
    setMessage(null);
    setErrorMessage(null);
    try {
      const result = await postData<PaymentConfirmation>('/payment/verify', verificationPayload(current));
      // A server-confirmed payment stays successful even if local cleanup fails.
      await clearPendingPayment(current.reference, userId).catch(() => undefined);
      if (!session.isCurrent(generation) || useAuth.getState().user?.id !== userId) return;
      pending.current = null;
      setSaved(null);
      setMessage(result.requiresReview ? 'Payment received. Your newer subscription stays active while Support reviews this payment.' : 'Payment confirmed. Your subscription is active.');
      successRef.current(result);
      return 'confirmed' as const;
    } catch (error) {
      if (!session.isCurrent(generation) || useAuth.getState().user?.id !== userId) return;
      if (checkoutFailureCode(error) === 'PAYMENT_NOT_SUCCESSFUL') {
        try {
          await fetchData<PaymentCheckout>(`/payment/pending/${encodeURIComponent(current.reference)}`);
        } catch (statusError) {
          if (!session.isCurrent(generation) || useAuth.getState().user?.id !== userId) return;
          const legacyCheckout = checkoutFailureCode(statusError) === 'CHECKOUT_NOT_FOUND' && !current.status;
          if (isClosedCheckout(statusError) && !legacyCheckout) {
            try { await clearPendingPayment(current.reference, userId); }
            catch {
              setErrorMessage('This checkout is closed, but its saved details could not be cleared. Reopen the app and try again.');
              return 'unconfirmed' as const;
            }
            if (!session.isCurrent(generation) || useAuth.getState().user?.id !== userId) return;
            pending.current = null;
            setSaved(null);
            setCanRestart(false);
            setMessage('This checkout was closed or removed. You can choose plans for a new payment.');
            return 'closed' as const;
          }
          // A failed status request must not discard an unconfirmed payment.
        }
      }
      if (options?.silent) setMessage('This checkout is not confirmed yet. Continue payment or check its status.');
      else setErrorMessage(paymentError(error));
      const data = (error as { response?: { data?: { code?: string; paymentStatus?: string } } })?.response?.data;
      const retryable = data?.code === 'PAYMENT_NOT_SUCCESSFUL' && ['failed', 'abandoned'].includes(data.paymentStatus ?? '');
      setCanRestart(retryable);
      return retryable ? 'retryable' as const : 'unconfirmed' as const;
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }, [key, userId, generation]);

  useEffect(() => {
    let active = true;
    pending.current = null;
    const read = userId
      ? readPendingPayment(userId).then((stored) => reference && stored?.reference !== reference ? { reference } : stored)
      : Promise.resolve(null);
    read.then(async (stored) => {
      if (!active || !session.isCurrent(generation) || useAuth.getState().user?.id !== userId) return;
      setSaved(null);
      setRestoreFailed(false);
      setCanRestart(false);
      setMessage(null);
      setErrorMessage(null);
      if (!stored) return;
      let value = stored as PaymentCheckout;
      if (!value.reference) throw new Error('Invalid saved checkout');
      if (!userId) return;
      try {
        value = await fetchData<PaymentCheckout>(`/payment/pending/${encodeURIComponent(value.reference)}`);
      } catch (error) {
        if (!active || !session.isCurrent(generation) || useAuth.getState().user?.id !== userId) return;
        const legacyCheckout = checkoutFailureCode(error) === 'CHECKOUT_NOT_FOUND' && !value.status && Array.isArray(value.selectedPlans);
        if (isClosedCheckout(error) && !legacyCheckout) {
          await clearPendingPayment(value.reference, userId);
          if (active && session.isCurrent(generation) && useAuth.getState().user?.id === userId) {
            setMessage('This checkout was closed or removed. You can choose plans for a new payment. Any money already sent can still be reconciled.');
          }
          return;
        }
        if (checkoutFailureCode(error) === 'PAYMENT_ALREADY_PAID') {
          // Device cleanup cannot turn a server-confirmed payment into failure.
          await clearPendingPayment(value.reference, userId).catch(() => undefined);
          if (active && session.isCurrent(generation) && useAuth.getState().user?.id === userId) {
            const result = (error as { response?: { data?: PaymentConfirmation } }).response?.data;
            setMessage(result?.requiresReview ? 'Payment received and awaiting review. Your newer subscription stays active.' : 'Payment confirmed. Your billing history has been updated.');
            successRef.current(result);
          }
          return;
        }
        if (!legacyCheckout) throw error;
      }
      if (!active || !session.isCurrent(generation) || useAuth.getState().user?.id !== userId) return;
      if (!Array.isArray(value.selectedPlans)) throw new Error('Invalid saved checkout');
      if (key) await savePendingPayment(userId, value, generation);
      if (!active || !session.isCurrent(generation) || useAuth.getState().user?.id !== userId) return;
      pending.current = { userId, checkout: value };
      setSaved({ userId, checkout: value });
      void verify({ silent: true });
    }).catch(() => {
      if (active) {
        setRestoreFailed(true);
        setErrorMessage('Could not restore your payment. Reopen this screen before starting a new checkout.');
      }
    }).finally(() => { if (active) setRestoredKey(restoreSource); });
    return () => { active = false; };
  }, [key, reference, restoreSource, userId, verify, generation]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') void verify();
    });
    return () => subscription.remove();
  }, [verify]);

  const openCheckout = useCallback(async (current: PaymentCheckout) => {
    if (!session.isCurrent(generation) || useAuth.getState().user?.id !== userId) return;
    setOpening(true);
    try {
      // A customer or admin may have closed the attempt since this screen loaded.
      let checkoutToOpen = current;
      try {
        checkoutToOpen = await fetchData<PaymentCheckout>(`/payment/pending/${encodeURIComponent(current.reference)}`);
      } catch (error) {
        // Keep pre-feature local checkouts recoverable through server verification.
        if (checkoutFailureCode(error) !== 'CHECKOUT_NOT_FOUND' || current.status) throw error;
      }
      if (!session.isCurrent(generation) || useAuth.getState().user?.id !== userId) return;
      if (!isValidPaymentAmount(checkoutToOpen.amount)) {
        throw new Error('Invalid checkout amount');
      }
      if (!isTrustedPaystackCheckoutUrl(checkoutToOpen.authorizationUrl)) {
        throw new Error('Invalid checkout URL');
      }
      setMessage('Complete payment in Paystack, then close the browser to return here.');
      const result = await WebBrowser.openBrowserAsync(checkoutToOpen.authorizationUrl, {
        toolbarColor: Colors.bgApp, dismissButtonStyle: 'done',
      });
      // Android resolves immediately on opening; AppState handles its return.
      if (Platform.OS === 'ios' && (result.type === 'cancel' || result.type === 'dismiss')) {
        await verify();
      }
    } catch (error) {
      if (!session.isCurrent(generation) || useAuth.getState().user?.id !== userId) return;
      if (isClosedCheckout(error)) {
        try { await clearPendingPayment(current.reference, userId); }
        catch {
          setErrorMessage('This checkout is closed, but its saved details could not be cleared on this device. Reopen the app and try again.');
          return;
        }
        if (!session.isCurrent(generation) || useAuth.getState().user?.id !== userId) return;
        pending.current = null;
        setSaved(null);
        setCanRestart(false);
        setMessage('This checkout was closed or removed. You can start a new payment.');
      } else if (checkoutFailureCode(error) === 'PAYMENT_ALREADY_PAID') {
        await verify();
      } else setErrorMessage('Could not open checkout. Please check your connection and try again. If this continues, contact Support.');
    } finally {
      setOpening(false);
    }
  }, [userId, verify, generation]);

  const saveCheckout = useCallback(async (value: PaymentCheckout) => {
    if (!key || !userId) throw new Error('Sign in to make a payment');
    if (!isValidPaymentAmount(value.amount)) throw new Error('Invalid checkout amount');
    await savePendingPayment(userId, value, generation);
    if (!session.isCurrent(generation) || useAuth.getState().user?.id !== userId) throw new Error('The signed-in account changed');
    pending.current = { userId, checkout: value };
    setSaved({ userId, checkout: value });
  }, [key, userId, generation]);

  const restart = useCallback(async () => {
    if (!canRestart || !key || lock.current) return;
    // Recheck before discarding: the checkout may have completed since the last check.
    if (await verify() !== 'retryable' || !session.isCurrent(generation) || useAuth.getState().user?.id !== userId) return;
    lock.current = true;
    setBusy(true);
    try {
      const current = pending.current?.checkout;
      if (current) await clearPendingPayment(current.reference, userId);
      if (!session.isCurrent(generation) || useAuth.getState().user?.id !== userId) return;
      pending.current = null;
      setSaved(null);
      setCanRestart(false);
      setMessage(null);
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }, [canRestart, key, userId, verify, generation]);

  return { checkout, busy: busy || opening, restoring, restoreFailed, canRestart, restart, message, setMessage, errorMessage, setErrorMessage, verify, saveCheckout, openCheckout };
}
