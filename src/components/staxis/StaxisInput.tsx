import { useState } from 'react';
import {
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
  style,
  ...rest
}: StaxisInputProps) {
  const [focused, setFocused] = useState(false);

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
      <TextInput
        style={[
          styles.input,
          focused && styles.inputFocused,
          error && styles.inputError,
          style,
        ]}
        placeholderTextColor={Colors.text3}
        onFocus={(e) => {
          setFocused(true);
          rest.onFocus?.(e);
        }}
        onBlur={(e) => {
          setFocused(false);
          rest.onBlur?.(e);
        }}
        {...rest}
      />
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
  inputFocused: {
    borderColor: Palette.signal,
  },
  inputError: {
    borderColor: Palette.signal,
  },
});
