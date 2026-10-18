import { useState } from 'react';
import {
  Pressable,
  StyleSheet,
  TextInput,
  type TextInputProps,
  View,
} from 'react-native';

import {
  Colors,
  FormSize,
  Palette,
  Radius,
  Type,
} from '@/constants/staxis-theme';

import { StaxisText } from './StaxisText';

export type StaxisInputProps = TextInputProps & {
  label?: string;
  hint?: string;
  required?: boolean;
  error?: string;
};

export function StaxisInput({
  label,
  hint,
  required,
  error,
  secureTextEntry,
  style,
  onFocus,
  onBlur,
  ...rest
}: StaxisInputProps) {
  const [focused, setFocused] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const isSecure = !!secureTextEntry;

  return (
    <View style={styles.group}>
      {label && (
        <StaxisText variant="formLabel" style={styles.label}>
          {label}
          {required && (
            <StaxisText variant="formLabel" style={{ color: Palette.signal }}>
              {' *'}
            </StaxisText>
          )}
        </StaxisText>
      )}
      <View>
        <TextInput
          style={[
            styles.input,
            isSecure && styles.inputWithVisibilityButton,
            focused && styles.inputFocused,
            error && styles.inputError,
            style,
          ]}
          placeholderTextColor={Colors.text3}
          secureTextEntry={isSecure && !showPassword}
          onFocus={(e) => {
            setFocused(true);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            onBlur?.(e);
          }}
          {...rest}
        />
        {isSecure && (
          <Pressable
            onPress={() => setShowPassword((v) => !v)}
            style={styles.visibilityButton}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
          >
            <StaxisText variant="cardAction">
              {showPassword ? 'Hide' : 'Show'}
            </StaxisText>
          </Pressable>
        )}
      </View>
      {error && (
        <StaxisText variant="formHint" style={{ color: Palette.signal, marginTop: FormSize.hint.marginTop }}>
          {error}
        </StaxisText>
      )}
      {!error && hint && (
        <StaxisText variant="formHint" style={{ marginTop: FormSize.hint.marginTop }}>
          {hint}
        </StaxisText>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  group: { marginBottom: FormSize.group.marginBottom },
  label: { marginBottom: FormSize.label.marginBottom },
  input: {
    ...Type.formInput,
    paddingVertical: FormSize.input.paddingVertical,
    paddingHorizontal: FormSize.input.paddingHorizontal,
    borderWidth: 1,
    borderColor: Colors.lineStrong,
    borderRadius: Radius.sm,
    backgroundColor: Colors.bgCard,
  },
  inputWithVisibilityButton: { paddingRight: 64 },
  inputFocused: { borderColor: Palette.signal },
  inputError: { borderColor: Palette.signal },
  visibilityButton: {
    position: 'absolute',
    right: 12,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
  },
});
