import { router } from 'expo-router';

type AuthedUser = { onboardingCompleted?: boolean } | null | undefined;

/**
 * Route a freshly-authenticated user to the right place: the main app if they've
 * finished onboarding, otherwise into the onboarding flow. Centralised so every
 * sign-in entry point (login, register, Google) stays consistent, and mirrors the
 * root layout's onboarding gate.
 */
export function routeAfterAuth(user: AuthedUser) {
  router.replace(user?.onboardingCompleted ? '/(tabs)' : '/(onboarding)/company');
}
