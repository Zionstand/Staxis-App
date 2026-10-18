import { useHeaderHeight } from 'expo-router/react-navigation';
import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
} from 'react-native';

import { StaxisButton, StaxisInput, StaxisText } from '@/components/staxis';
import { ErrorModal } from '@/components/error-modal';
import { Colors, Palette, Spacing } from '@/constants/staxis-theme';
import { updateData, logoutAndRedirect } from '@/lib/api';
import { session } from '@/lib/session';
import { getUserFacingError } from '@/lib/user-facing-error';
import { ChangePasswordSchema, ChangePasswordSchemaType } from '@/lib/zod-schema';

export default function ChangePasswordScreen() {
  const headerHeight = useHeaderHeight();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<ChangePasswordSchemaType>({
    mode: 'onChange',
    resolver: zodResolver(ChangePasswordSchema),
    defaultValues: {
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    },
  });

  const onSubmit = async (values: ChangePasswordSchemaType) => {
    setSubmitError(null);
    setLoading(true);
    const expected = session.current();
    try {
      await updateData('/user/password', values);
      if (!session.isCurrent(expected)) return;
      await logoutAndRedirect(expected);
      Alert.alert('Password changed', 'Your password has been updated. Sign in again with your new password.');
    } catch (err) {
      setSubmitError(getUserFacingError(err, 'Could not change your password. Check your current password and try again.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    keyboardVerticalOffset={headerHeight}
    >
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.scrollContent}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="interactive"
    >
        <StaxisText variant="formHint">
          Choose a strong password you don&apos;t use anywhere else.
        </StaxisText>

        <Controller
          control={control}
          name="currentPassword"
          render={({ field: { onChange, onBlur, value } }) => (
            <StaxisInput
              label="Current password"
              placeholder="Enter current password"
              secureTextEntry
              autoCapitalize="none"
              onBlur={onBlur}
              onChangeText={onChange}
              value={value}
              error={errors.currentPassword?.message}
            />
          )}
        />

        <Controller
          control={control}
          name="newPassword"
          render={({ field: { onChange, onBlur, value } }) => (
            <StaxisInput
              label="New password"
              placeholder="Enter new password"
              secureTextEntry
              autoCapitalize="none"
              onBlur={onBlur}
              onChangeText={onChange}
              value={value}
              error={errors.newPassword?.message}
            />
          )}
        />

        <Controller
          control={control}
          name="confirmPassword"
          render={({ field: { onChange, onBlur, value } }) => (
            <StaxisInput
              label="Confirm new password"
              placeholder="Re-enter new password"
              secureTextEntry
              autoCapitalize="none"
              onBlur={onBlur}
              onChangeText={onChange}
              value={value}
              error={errors.confirmPassword?.message}
            />
          )}
        />

        <StaxisButton
          label={loading ? '' : 'Update password'}
          onPress={handleSubmit(onSubmit)}
          disabled={loading}
          block
          icon={loading ? <ActivityIndicator color={Palette.bone} /> : undefined}
        />
      </ScrollView>
      <ErrorModal message={submitError} onDismiss={() => setSubmitError(null)} />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scroll: { flex: 1, backgroundColor: Colors.bgApp },
  scrollContent: {
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.xl,
    paddingBottom: Spacing.xxxl,
    gap: Spacing.sm,
  },
});
