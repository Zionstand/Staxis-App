import type { ReactNode } from 'react';

// Web has no WebView-based Paystack checkout — this stub keeps the web bundle
// from importing react-native-webview. Payments run in the native app; the
// subscribe screen disables the pay action when Paystack is unavailable.
export function PaystackHost({ children }: { children: ReactNode }) {
  return <>{children}</>;
}

export function usePaystack() {
  return {
    popup: {
      checkout: () => {},
      newTransaction: () => {},
    },
  };
}

export const isPaystackAvailable = false;
