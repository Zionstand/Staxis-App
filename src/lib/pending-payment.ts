import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { useAuth } from '@/store/use-auth';
import type { PaymentCheckout } from '@/lib/billing';
import { session, serializeStorage } from '@/lib/session';

const PREFIX = 'staxis-payment:';
// SecureStore keys permit letters, numbers, periods, dashes and underscores.
const secureKey = (userId: string) => `staxis-payment-legacy.${Array.from(userId).map((char) => char.codePointAt(0)!.toString(16).padStart(6, '0')).join('')}`;
type SavedPayment = { reference: string } & Partial<PaymentCheckout>;

async function save(userId: string, checkout: SavedPayment) {
  if (!checkout.reference) throw new Error('Invalid checkout reference');
  if (!checkout.status && Array.isArray(checkout.selectedPlans)) {
    // Old checkouts have no server attempt: retain their verification payload encrypted.
    // Write this first so a failed migration never destroys recovery information.
    await SecureStore.setItemAsync(secureKey(userId), JSON.stringify(checkout));
  }
  await AsyncStorage.setItem(`${PREFIX}${userId}`, JSON.stringify({ reference: checkout.reference }));
  if (checkout.status) await SecureStore.deleteItemAsync(secureKey(userId));
}

async function read(userId: string): Promise<SavedPayment | null> {
  const key = `${PREFIX}${userId}`;
  const raw = await AsyncStorage.getItem(key);
  if (!raw) return null;
  let saved: SavedPayment;
  try {
    saved = JSON.parse(raw);
    if (!saved || typeof saved.reference !== 'string' || !saved.reference) throw new Error('Invalid checkout');
  } catch {
    await AsyncStorage.removeItem(key);
    return null;
  }
  if (Array.isArray(saved.selectedPlans)) {
    await save(userId, saved);
    return saved.status ? { reference: saved.reference } : saved;
  }
  const legacy = await SecureStore.getItemAsync(secureKey(userId));
  if (legacy) {
    try {
      const checkout: SavedPayment = JSON.parse(legacy);
      if (checkout.reference === saved.reference && Array.isArray(checkout.selectedPlans)) return checkout;
    } catch { /* A valid reference can still recover through the backend. */ }
    await SecureStore.deleteItemAsync(secureKey(userId));
  }
  // Normalize records which carry obsolete fields as well as the reference.
  await AsyncStorage.setItem(key, JSON.stringify({ reference: saved.reference }));
  return { reference: saved.reference };
}

export function savePendingPayment(userId: string, checkout: PaymentCheckout, expected = session.current()) {
  return serializeStorage(async () => {
    session.assertCurrent(expected);
    await save(userId, checkout);
    session.assertCurrent(expected);
  });
}

export function readPendingPayment(userId: string) {
  return serializeStorage(() => read(userId));
}

/** Minimize legacy records for every account, including accounts currently signed out. */
export function migratePendingPayments() {
  return serializeStorage(async () => {
    const keys = await AsyncStorage.getAllKeys();
    const failures: unknown[] = [];
    for (const key of keys.filter((value) => value.startsWith(PREFIX))) {
      try { await read(key.slice(PREFIX.length)); }
      catch (error) { failures.push(error); }
    }
    if (failures.length) throw new Error('Some saved payments could not be migrated');
  });
}

/** Called only after the backend has removed the pending item from the list. */
export async function clearPendingPayment(reference: string, userId = useAuth.getState().user?.id) {
  if (!userId) return;
  return serializeStorage(async () => {
    const key = `${PREFIX}${userId}`;
    const stored = await AsyncStorage.getItem(key);
    if (!stored) return;
    const checkout = JSON.parse(stored) as SavedPayment;
    if (checkout.reference === reference) {
      await SecureStore.deleteItemAsync(secureKey(userId));
      await AsyncStorage.removeItem(key);
    }
  });
}
