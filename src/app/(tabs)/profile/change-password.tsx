import { zodResolver } from '@hookform/resolvers/zod';
import { router } from 'expo-router';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';

import { StaxisButton, StaxisInput, StaxisText } from '@/components/staxis';
import { Colors, Palette, Spacing } from '@/constants/staxis-theme';
import { updateData } from '@/lib/api';
import { ChangePasswordSchema, ChangePasswordSchemaType } from '@/lib/zod-schema';

export default function ChangePasswordScreen() {
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<ChangePasswordSchemaType>({
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
    try {
      await updateData('/user/password', values);
      Alert.alert('Password changed', 'Your password has been updated.', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (err: any) {
      const message =
        err?.response?.data?.message ?? 'Could not change your password. Try again.';
      setSubmitError(Array.isArray(message) ? message[0] : message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.scrollContent}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="interactive"
      automaticallyAdjustKeyboardInsets
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

        {submitError && (
          <StaxisText variant="formHint" style={{ color: Palette.signal }}>
            {submitError}
          </StaxisText>
        )}

        <StaxisButton
          label={loading ? '' : 'Update password'}
          onPress={handleSubmit(onSubmit)}
          disabled={loading}
          block
          icon={loading ? <ActivityIndicator color={Palette.bone} /> : undefined}
        />
      </ScrollView>
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
