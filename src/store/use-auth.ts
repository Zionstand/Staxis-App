import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

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
  setUser: (user: User) => void;
  clearUser: () => void;
  _hasHydrated: boolean;
  setHasHydrated: (hasHydrated: boolean) => void;
};

export const useAuth = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      setUser: (user) => set({ user }),
      clearUser: () => set({ user: null }),
      _hasHydrated: false,
      setHasHydrated: (hasHydrated) => set({ _hasHydrated: hasHydrated }),
    }),
    {
      name: 'auth-user',
      storage: createJSONStorage(() => AsyncStorage),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    },
  ),
);
