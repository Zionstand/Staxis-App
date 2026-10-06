import { Image } from 'expo-image';
import { StyleSheet } from 'react-native';

const logos = {
  red: require('@/../assets/images/staxis-logo-red.png'),
  white: require('@/../assets/images/staxis-logo-white.png'),
} as const;

export type StaxisLogoProps = {
  variant?: 'red' | 'white';
  size?: number;
};

export function StaxisLogo({ variant = 'red', size = 48 }: StaxisLogoProps) {
  return (
    <Image
      source={logos[variant]}
      style={{ height: size, width: size * 2.5 }}
      contentFit="contain"
    />
  );
}
