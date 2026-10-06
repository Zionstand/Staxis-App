import { useState } from 'react';
import {
  Pressable,
  StyleSheet,
  TextInput,
  type TextInputProps,
  View,
} from 'react-native';
import { Eye, EyeClosed } from 'iconoir-react-native';

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
            isSecure && styles.inputWithEye,
            focused && styles.inputFocused,
            error && styles.inputError,
            style,
          ]}
          placeholderTextColor={Colors.text3}
          secureTextEntry={isSecure && !showPassword}
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
        {isSecure && (
          <Pressable
            onPress={() => setShowPassword((v) => !v)}
            style={styles.eyeButton}
            hitSlop={8}
          >
            {showPassword ? (
              <Eye width={20} height={20} color={Palette.signal} strokeWidth={1.6} />
            ) : (
              <EyeClosed width={20} height={20} color={Colors.text3} strokeWidth={1.6} />
            )}
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
  inputWithEye: { paddingRight: 44 },
  inputFocused: { borderColor: Palette.signal },
  inputError: { borderColor: Palette.signal },
  eyeButton: {
    position: 'absolute',
    right: 12,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
  },
});
