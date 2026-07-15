import type { ReactNode } from 'react';
import {
  PaystackProvider,
  PaystackProps,
  usePaystack,
} from 'react-native-paystack-webview';

import { env } from '@/lib/env';

// All enabled Paystack channels — card, bank, USSD, transfer, QR, mobile money —
// so mobile offers the same payment methods as the web checkout.
const CHANNELS: PaystackProps.PaymentChannels = [
  'card',
  'bank',
  'ussd',
  'qr',
  'mobile_money',
  'bank_transfer',
];

/**
 * Wraps children in the Paystack provider (native only). `usePaystack()` is
 * re-exported so screens can trigger checkout without importing the library
 * directly — the `.web` variant keeps react-native-webview out of the web bundle.
 */
export function PaystackHost({ children }: { children: ReactNode }) {
  return (
    <PaystackProvider publicKey={env.PAYSTACK_PUBLIC_KEY} currency="NGN" defaultChannels={CHANNELS}>
      {children}
    </PaystackProvider>
  );
}

export { usePaystack };
export const isPaystackAvailable = true;
