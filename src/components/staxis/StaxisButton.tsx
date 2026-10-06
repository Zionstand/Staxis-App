import { Pressable, type PressableProps, StyleSheet, type ViewStyle } from 'react-native';

import {
  ButtonSize,
  Colors,
  Palette,
  Radius,
  Type,
} from '@/constants/staxis-theme';

import { StaxisText } from './StaxisText';

type ButtonVariant = 'primary' | 'ghost' | 'danger' | 'outlineDanger';
type ButtonSizeKey = 'default' | 'sm' | 'lg';

export type StaxisButtonProps = Omit<PressableProps, 'children'> & {
  variant?: ButtonVariant;
  size?: ButtonSizeKey;
  label: string;
  icon?: React.ReactNode;
  block?: boolean;
};

const variantStyles: Record<ButtonVariant, ViewStyle> = {
  primary: { backgroundColor: Palette.signal },
  ghost: {
    backgroundColor: Colors.bgCard,
    borderWidth: 1,
    borderColor: Colors.lineStrong,
  },
  danger: { backgroundColor: Palette.signal },
  outlineDanger: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: Palette.signal,
  },
};

const variantTextColor: Record<ButtonVariant, string> = {
  primary: Palette.bone,
  ghost: Colors.text,
  danger: Palette.bone,
  outlineDanger: Palette.signal,
};

const sizeTextVariant: Record<ButtonSizeKey, keyof typeof Type> = {
  default: 'btn',
  sm: 'btnSm',
  lg: 'btnLg',
};

export function StaxisButton({
  variant = 'primary',
  size = 'default',
  label,
  icon,
  block,
  style,
  ...rest
}: StaxisButtonProps) {
  const pad = ButtonSize[size];

  return (
    <Pressable
      style={({ pressed }) => {
        const padStyle: ViewStyle =
          'padding' in pad
            ? { padding: (pad as { padding: number }).padding }
            : (pad as ViewStyle);
        return [
          styles.base,
          variantStyles[variant],
          padStyle,
          block ? styles.block : undefined,
          pressed ? styles.pressed : undefined,
          style as ViewStyle,
        ];
      }}
      {...rest}
    >
      {icon}
      <StaxisText
        variant={sizeTextVariant[size]}
        style={{ color: variantTextColor[variant] }}
      >
        {label}
      </StaxisText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: Radius.sm,
  },
  block: { width: '100%' },
  pressed: { opacity: 0.85, transform: [{ translateY: 1 }] },
});
