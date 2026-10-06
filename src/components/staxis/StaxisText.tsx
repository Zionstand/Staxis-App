import { Text, type TextProps, type TextStyle } from 'react-native';

import { Type } from '@/constants/staxis-theme';

type TypeVariant = keyof typeof Type;

export type StaxisTextProps = TextProps & {
  variant?: TypeVariant;
};

export function StaxisText({
  variant = 'bodyBase',
  style,
  ...rest
}: StaxisTextProps) {
  return (
    <Text style={[Type[variant] as TextStyle, style]} {...rest} />
  );
}
