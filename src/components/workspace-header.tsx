import { router } from 'expo-router';
import type { NativeStackHeaderProps } from 'expo-router/native-stack';
import { StatusBar } from 'expo-status-bar';
import { Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { StaxisText } from '@/components/staxis/StaxisText';
import { Colors, Palette, Radius, Spacing } from '@/constants/staxis-theme';
import { useAuth } from '@/store/use-auth';

export function workspaceLabel(firstName?: string) {
  const name = firstName?.trim();
  return name ? `${name}'s workspace` : 'Your workspace';
}

export function WorkspaceHeader({ title, onBack }: { title: string; onBack?: () => void }) {
  const user = useAuth((state) => state.user);
  const initials = [user?.firstName, user?.lastName].map((name) => name?.trim().charAt(0) ?? '').join('');
  return (
    <SafeAreaView edges={['top']} style={styles.safe}>
      <StatusBar style="dark" />
      <View style={styles.header}>
        {onBack && (
          <Pressable accessibilityRole="button" accessibilityLabel="Go back" onPress={onBack} style={styles.back}>
            <StaxisText variant="displaySm" style={styles.ink} accessible={false}>←</StaxisText>
          </Pressable>
        )}
        <View style={styles.titles}>
          <StaxisText variant="workspaceContext" style={styles.context}>{workspaceLabel(user?.firstName)}</StaxisText>
          <StaxisText variant="displaySm" accessibilityRole="header" style={styles.ink}>{title}</StaxisText>
        </View>
        {user && (
          <Pressable accessibilityRole="button" accessibilityLabel="Open your profile" onPress={() => router.push('/(tabs)/profile')} style={({ pressed }) => [styles.avatar, pressed && styles.pressed]}>
            <StaxisText variant="bodyBase" style={styles.ink} accessible={false}>{initials || 'S'}</StaxisText>
          </Pressable>
        )}
      </View>
    </SafeAreaView>
  );
}

export function renderWorkspaceHeader({ options, navigation, back }: NativeStackHeaderProps) {
  return <WorkspaceHeader title={options.title ?? 'Workspace'} onBack={back ? () => navigation.goBack() : undefined} />;
}

const styles = StyleSheet.create({
  safe: { backgroundColor: Colors.bgApp, borderBottomWidth: 1, borderBottomColor: Colors.line },
  header: { flexDirection: 'row', alignItems: 'center', minHeight: Spacing.xxxl + Spacing.xl, paddingHorizontal: Spacing.xl, paddingVertical: Spacing.md, gap: Spacing.md, width: '100%', maxWidth: 800, alignSelf: 'center' },
  back: { minHeight: Spacing.xxxl, minWidth: Spacing.xxxl, alignItems: 'center', justifyContent: 'center', marginLeft: -Spacing.md },
  titles: { flex: 1, minWidth: 0, gap: Spacing.xs },
  context: { color: Colors.text2 },
  ink: { color: Colors.text },
  avatar: { width: Spacing.xxxl, minHeight: Spacing.xxxl, borderRadius: Radius.pill, backgroundColor: Palette.bone2, alignItems: 'center', justifyContent: 'center', padding: Spacing.sm },
  pressed: { opacity: 0.7 },
});
