import { useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import PhoneInput from 'react-native-phone-number-input';

import {
  Colors,
  FontFamily,
  FormSize,
  Palette,
  Radius,
  Type,
} from '@/constants/staxis-theme';

import { StaxisText } from './StaxisText';

export type StaxisPhoneInputProps = {
  label?: string;
  required?: boolean;
  error?: string;
  hint?: string;
  value: string;
  onChangeText: (text: string) => void;
  onChangeFormattedText?: (text: string) => void;
  defaultCode?: string;
};

export function StaxisPhoneInput({
  label,
  required,
  error,
  hint,
  value,
  onChangeText,
  onChangeFormattedText,
  defaultCode = 'NG',
}: StaxisPhoneInputProps) {
  const phoneInput = useRef<PhoneInput>(null);
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
      <PhoneInput
        ref={phoneInput}
        defaultCode={defaultCode as any}
        layout="first"
        value={value}
        onChangeText={onChangeText}
        onChangeFormattedText={onChangeFormattedText}
        containerStyle={[
          styles.container,
          focused && styles.containerFocused,
          error ? styles.containerError : undefined,
        ]}
        textContainerStyle={styles.textContainer}
        textInputStyle={styles.textInput}
        codeTextStyle={styles.codeText}
        flagButtonStyle={styles.flagButton}
        countryPickerButtonStyle={styles.countryPicker}
        placeholder="Phone number"
        textInputProps={{
          placeholderTextColor: Colors.text3,
          onFocus: () => setFocused(true),
          onBlur: () => setFocused(false),
        }}
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
  container: {
    width: '100%',
    borderWidth: 1,
    borderColor: Colors.lineStrong,
    borderRadius: Radius.sm,
    backgroundColor: Colors.bgCard,
    height: 50,
  },
  containerFocused: { borderColor: Palette.signal },
  containerError: { borderColor: Palette.signal },
  textContainer: {
    backgroundColor: 'transparent',
    borderTopRightRadius: Radius.sm,
    borderBottomRightRadius: Radius.sm,
    paddingVertical: 0,
  },
  textInput: {
    fontFamily: FontFamily.body,
    fontSize: Type.formInput.fontSize,
    color: Colors.text,
    height: 48,
    padding: 0,
  },
  codeText: {
    fontFamily: FontFamily.body,
    fontSize: Type.formInput.fontSize,
    color: Colors.text,
  },
  flagButton: { width: 60 },
  countryPicker: {
    borderTopLeftRadius: Radius.sm,
    borderBottomLeftRadius: Radius.sm,
  },
});
