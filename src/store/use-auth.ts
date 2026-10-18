import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import { session, serializeStorage } from '@/lib/session';
import { tokenStorage } from '@/lib/token-storage';

export type User = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  username?: string;
  phoneNumber?: string;
  image?: string | null;
  role: string;
  adminPosition?: string | null;
  onboardingCompleted?: boolean;
} | null;

type AuthState = {
  user: User;
  setUser: (user: User, expected?: number) => Promise<void>;
  clearUser: () => Promise<string | null>;
  _hasHydrated: boolean;
  setHasHydrated: (hasHydrated: boolean) => void;
};

const USER_KEY = 'staxis-auth-user';

export const useAuth = create<AuthState>()((set) => ({
  user: null,
  async setUser(user, expected = session.current()) {
    await serializeStorage(async () => {
      session.assertCurrent(expected);
      if (user) await SecureStore.setItemAsync(USER_KEY, JSON.stringify(user));
      else await SecureStore.deleteItemAsync(USER_KEY);
      session.assertCurrent(expected);
      set({ user });
    });
  },
  clearUser() {
    session.advance();
    set({ user: null });
    const credentials = tokenStorage.clear();
    const account = serializeStorage(async () => {
      await SecureStore.deleteItemAsync(USER_KEY);
      await AsyncStorage.removeItem('auth-user');
    });
    return Promise.all([credentials, account]).then(([refreshToken]) => refreshToken);
  },
  _hasHydrated: false,
  setHasHydrated: (hasHydrated) => set({ _hasHydrated: hasHydrated }),
}));

/** Invalidates earlier login/refresh/profile work before beginning an account change. */
export function beginSignIn() {
  const cleared = useAuth.getState().clearUser();
  // The sign-in completion awaits this cleanup; avoid an unhandled rejection meanwhile.
  void cleared.catch(() => undefined);
  return { generation: session.current(), cleared };
}

export async function completeSignIn(
  attempt: ReturnType<typeof beginSignIn>,
  data: { user: User; access_token: string; refresh_token: string },
) {
  await attempt.cleared;
  session.assertCurrent(attempt.generation);
  try {
    await tokenStorage.setTokens(data.access_token, data.refresh_token, attempt.generation);
    await useAuth.getState().setUser(data.user, attempt.generation);
    session.assertCurrent(attempt.generation);
  } catch (error) {
    if (session.isCurrent(attempt.generation)) await useAuth.getState().clearUser();
    throw error;
  }
}

const startupGeneration = session.current();
void serializeStorage(async () => {
  try {
    const secureUser = await SecureStore.getItemAsync(USER_KEY);
    const legacy = await AsyncStorage.getItem('auth-user');
    const access = await SecureStore.getItemAsync('accessToken');
    const refresh = await SecureStore.getItemAsync('refreshToken');
    const user: User = access && refresh
      ? secureUser ? JSON.parse(secureUser) : legacy ? JSON.parse(legacy)?.state?.user : null
      : null;
    if (!user || typeof user.id !== 'string' || !user.id || typeof user.email !== 'string') {
      throw new Error('No valid saved account');
    }
    if (session.isCurrent(startupGeneration)) {
      await SecureStore.setItemAsync(USER_KEY, JSON.stringify(user));
      session.assertCurrent(startupGeneration);
      useAuth.setState({ user });
    }
  } catch {
    // Run within the queue so corrupt or incomplete credentials cannot survive hydration.
    await Promise.all([
      SecureStore.deleteItemAsync(USER_KEY),
      SecureStore.deleteItemAsync('accessToken'),
      SecureStore.deleteItemAsync('refreshToken'),
    ]);
  } finally {
    await AsyncStorage.removeItem('auth-user');
  }
}).catch(() => {
  // Corrupt or unavailable local data never grants a session.
}).finally(() => useAuth.getState().setHasHydrated(true));
