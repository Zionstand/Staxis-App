/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import '@/global.css';

import {
  Outfit_400Regular,
  Outfit_500Medium,
  Outfit_600SemiBold,
  Outfit_700Bold,
} from '@expo-google-fonts/outfit';
import { Platform, type TextStyle } from 'react-native';

// Brand primary — matches the web app's `--primary` (oklch hue 29, a deep red).
// Web light `oklch(0.39 0.17 29)` → #8a0000, dark `oklch(0.5 0.18 29)` → #b3241b,
// on-primary text `oklch(0.98 0 0)` → #f8f8f8.
export const BrandPrimary = '#8a0000';
export const BrandPrimaryForeground = '#f8f8f8';

export const Colors = {
  light: {
    text: '#000000',
    background: '#ffffff',
    backgroundElement: '#F0F0F3',
    backgroundSelected: '#E0E1E6',
    textSecondary: '#60646C',
    primary: '#8a0000',
    primaryForeground: '#f8f8f8',
    // Soft wine wash — used behind the active tab / selected states.
    primarySoft: '#f3dedd',
  },
  dark: {
    text: '#ffffff',
    background: '#000000',
    backgroundElement: '#212225',
    backgroundSelected: '#2E3135',
    textSecondary: '#B0B4BA',
    primary: '#b3241b',
    primaryForeground: '#f8f8f8',
    primarySoft: '#3a1614',
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

/**
 * Brand-led accent tints for dashboard stat tiles. Each entry is a soft
 * background + a saturated foreground (used for the icon and the headline
 * number). Light/dark pairs follow the same `primarySoft` philosophy: gentle
 * wash in light mode, deep muted wash in dark mode with a bright accent on top.
 */
export const Tints = {
  light: {
    wine: { bg: '#f3dedd', fg: '#8a0000' },
    blue: { bg: '#dbeafe', fg: '#1d4ed8' },
    green: { bg: '#dcfce7', fg: '#15803d' },
    amber: { bg: '#fef3c7', fg: '#b45309' },
    rose: { bg: '#ffe4e6', fg: '#be123c' },
  },
  dark: {
    wine: { bg: '#3a1614', fg: '#fca5a5' },
    blue: { bg: '#172554', fg: '#93c5fd' },
    green: { bg: '#0b2e1a', fg: '#86efac' },
    amber: { bg: '#3a2607', fg: '#fcd34d' },
    rose: { bg: '#4c0519', fg: '#fda4af' },
  },
} as const;

export type TintName = keyof typeof Tints.light;

/** Hero header gradient — deep wine anchor, per scheme. */
export const HeroGradient = {
  light: ['#8a0000', '#b3241b', '#6d0000'] as const,
  dark: ['#5c0000', '#8a0000', '#3a1614'] as const,
};

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: 'var(--font-display)',
    serif: 'var(--font-serif)',
    rounded: 'var(--font-rounded)',
    mono: 'var(--font-mono)',
  },
});

/**
 * Outfit is the app's brand typeface. We load static weight files (rather than a
 * variable font) so bold text renders from the real bold glyphs on Android, where
 * `fontWeight` is ignored for custom families. Pass this map to `useFonts`.
 */
export const OutfitFonts = {
  Outfit_400Regular,
  Outfit_500Medium,
  Outfit_600SemiBold,
  Outfit_700Bold,
} as const;

/** Resolve a numeric/keyword `fontWeight` to the matching loaded Outfit family. */
export function outfitFontFamily(weight?: TextStyle['fontWeight']): string {
  switch (String(weight ?? '400')) {
    case '500':
      return 'Outfit_500Medium';
    case '600':
      return 'Outfit_600SemiBold';
    case '700':
    case '800':
    case '900':
    case 'bold':
      return 'Outfit_700Bold';
    default:
      return 'Outfit_400Regular';
  }
}

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

// The JS tab bar (see app-tabs.tsx) sits below content instead of overlapping it,
// and it applies its own bottom safe-area inset — so screens need no extra
// clearance beyond their own bottom padding.
export const BottomTabInset = 0;
export const MaxContentWidth = 800;
