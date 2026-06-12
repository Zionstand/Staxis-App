import { StyleSheet, TextInput, type TextInputProps } from 'react-native';

import { useTheme } from '@/hooks/use-theme';

export function ThemedTextInput({ style, ...rest }: TextInputProps) {
  const theme = useTheme();

  return (
    <TextInput
      style={[
        styles.input,
        {
          color: theme.text,
          backgroundColor: theme.backgroundElement,
          borderColor: theme.backgroundSelected,
        },
        style,
      ]}
      placeholderTextColor={theme.textSecondary}
      {...rest}
    />
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
});
