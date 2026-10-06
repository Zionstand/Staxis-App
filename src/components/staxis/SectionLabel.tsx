import { StyleSheet } from 'react-native';

import { Spacing } from '@/constants/staxis-theme';

import { StaxisText } from './StaxisText';

export type SectionLabelProps = {
  children: string;
};

export function SectionLabel({ children }: SectionLabelProps) {
  return (
    <StaxisText variant="sectionLabel" style={styles.label}>
      {children}
    </StaxisText>
  );
}

const styles = StyleSheet.create({
  label: { marginBottom: Spacing.md },
});
