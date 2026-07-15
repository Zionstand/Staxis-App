import { Image } from 'expo-image';
import { useState } from 'react';
import {
  Pressable,
  StyleSheet,
  TextInput,
  View,
  type TextInputProps,
  type TextStyle,
} from 'react-native';

import { outfitFontFamily } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

// Feather-style eye icons as inline SVG data URIs (matches the app's
// icon-as-data-uri pattern — no vector-icon dependency).
function eyeIcon(color: string, off: boolean) {
  const inner = off
    ? `<path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/>`
    : `<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>`;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${inner}</svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

export function ThemedTextInput({ style, secureTextEntry, ...rest }: TextInputProps) {
  const theme = useTheme();
  const [hidden, setHidden] = useState(true);

  const composed = StyleSheet.flatten([
    styles.input,
    {
      color: theme.text,
      backgroundColor: theme.backgroundElement,
      borderColor: theme.backgroundSelected,
    },
    style,
  ]) as TextStyle;

  const fontFamily = composed.fontFamily ?? outfitFontFamily(composed.fontWeight);

  const input = (
    <TextInput
      style={[composed, { fontFamily }, secureTextEntry && styles.inputWithToggle]}
      placeholderTextColor={theme.textSecondary}
      secureTextEntry={secureTextEntry ? hidden : false}
      {...rest}
    />
  );

  if (!secureTextEntry) return input;

  return (
    <View style={styles.wrapper}>
      {input}
      <Pressable
        onPress={() => setHidden((h) => !h)}
        hitSlop={8}
        accessibilityRole="button"
        accessibilityLabel={hidden ? 'Show password' : 'Hide password'}
        style={styles.toggle}>
        <Image
          source={{ uri: eyeIcon(theme.textSecondary, hidden) }}
          style={styles.icon}
          contentFit="contain"
        />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  input: {
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 16,
    fontSize: 16,
  },
  inputWithToggle: {
    paddingRight: 48,
  },
  wrapper: {
    position: 'relative',
    justifyContent: 'center',
  },
  toggle: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    paddingHorizontal: 14,
    justifyContent: 'center',
  },
  icon: {
    width: 20,
    height: 20,
  },
});
