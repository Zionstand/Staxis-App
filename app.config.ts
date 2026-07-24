import type { ExpoConfig } from '@expo/config-types';

// Migrated from app.json so a few values can be derived from the environment
// instead of being hardcoded (and going stale) — see notes below.

const backendUrl = process.env.EXPO_PUBLIC_BACKEND_URL ?? 'http://localhost:8000';

// Android blocks plain HTTP by default. We only opt out when the backend we're
// actually pointed at is HTTP — so a production build against an HTTPS API can
// never accidentally ship with cleartext enabled.
const needsCleartextTraffic = backendUrl.startsWith('http://');

// Google Sign-In on iOS needs the *reversed* iOS client ID as a URL scheme.
// Derive it from the client ID so the two can't drift apart. Until an iOS OAuth
// client exists for com.tomiwaadelae.app, this is undefined and the plugin is
// registered without iOS config (Android sign-in uses the web client ID).
const iosClientId = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID;
const iosUrlScheme = iosClientId
  ? `com.googleusercontent.apps.${iosClientId.replace('.apps.googleusercontent.com', '')}`
  : undefined;

const config: ExpoConfig = {
  name: 'STAXIS',
  slug: 'app',
  version: '1.0.0',
  orientation: 'portrait',
  icon: './assets/images/staxis-icon.png',
  scheme: 'app',
  userInterfaceStyle: 'automatic',
  ios: {
    supportsTablet: true,
    bundleIdentifier: 'com.tomiwaadelae.app',
  },
  android: {
    adaptiveIcon: {
      backgroundColor: '#ffffff',
      foregroundImage: './assets/images/staxis-icon-foreground.png',
    },
    predictiveBackGestureEnabled: false,
    package: 'com.tomiwaadelae.app',
  },
  web: {
    output: 'static',
    favicon: './assets/images/favicon.png',
  },
  plugins: [
    'expo-router',
    [
      'expo-splash-screen',
      {
        backgroundColor: '#ffffff',
        image: './assets/images/staxis-mark.png',
        imageWidth: 140,
        android: {
          image: './assets/images/staxis-mark.png',
          imageWidth: 140,
        },
      },
    ],
    'expo-secure-store',
    [
      'expo-build-properties',
      {
        android: {
          usesCleartextTraffic: needsCleartextTraffic,
        },
      },
    ],
    'expo-image',
    [
      'expo-image-picker',
      {
        photosPermission:
          'Allow $(PRODUCT_NAME) to access your photos so you can set your profile picture and attach images to support tickets.',
        cameraPermission:
          'Allow $(PRODUCT_NAME) to use the camera so you can set your profile picture and attach photos to support tickets.',
      },
    ],
    iosUrlScheme
      ? ['@react-native-google-signin/google-signin', { iosUrlScheme }]
      : '@react-native-google-signin/google-signin',
    [
      'expo-notifications',
      {
        color: '#8a0000',
      },
    ],
  ],
  experiments: {
    typedRoutes: true,
    reactCompiler: true,
  },
  extra: {
    router: {},
    eas: {
      projectId: '91774996-a58b-4bec-a081-1ee73fef1be9',
    },
  },
};

export default config;
