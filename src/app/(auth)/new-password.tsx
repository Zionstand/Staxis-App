import { zodResolver } from '@hookform/resolvers/zod';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';

import { StaxisButton, StaxisText } from '@/components/staxis';
import { StaxisInput } from '@/components/staxis';
import { Colors, Palette, Spacing } from '@/constants/staxis-theme';
import { postData } from '@/lib/api';
import { maskEmail } from '@/lib/utils';
import { NewPasswordSchema, NewPasswordSchemaType } from '@/lib/zod-schema';

export default function NewPasswordScreen() {
  const { email, otp } = useLocalSearchParams<{ email: string; otp: string }>();

  const [submitError, setSubmitError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<NewPasswordSchemaType>({
    resolver: zodResolver(NewPasswordSchema),
    defaultValues: { email, otp, newPassword: '', confirmPassword: '' },
  });

  const onSubmit = async (values: NewPasswordSchemaType) => {
    setSubmitError(null);
    setLoading(true);
    try {
      await postData('/auth/set-new-password', values);
      setSuccess(true);
    } catch (err: any) {
      const message =
        err?.response?.data?.message ?? 'Something went wrong. Please try again.';
      setSubmitError(Array.isArray(message) ? message[0] : message);
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <View style={styles.container}>
        <View style={styles.scrollContent}>
          <StaxisText variant="displaySm" style={{ color: Colors.text }}>
            Password updated
          </StaxisText>
          <StaxisText variant="bodySm" style={styles.subtitle}>
            Your password has been reset successfully. You can now sign in
            with your new password.
          </StaxisText>
          <StaxisButton
            label="Back to sign in"
            onPress={() => router.replace('/(auth)/login')}
            block
          />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <StaxisText variant="displaySm" style={{ color: Colors.text }}>
            Set new password
          </StaxisText>
          <StaxisText variant="bodySm" style={styles.subtitle}>
            Create a new password for {maskEmail(email ?? '')}
          </StaxisText>

          <Controller
            control={control}
            name="newPassword"
            render={({ field: { onChange, onBlur, value } }) => (
              <StaxisInput
                label="New password"
                placeholder="Enter new password"
                secureTextEntry
                autoComplete="password-new"
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
                label="Confirm password"
                placeholder="Re-enter new password"
                secureTextEntry
                autoComplete="password-new"
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
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bgApp },
  flex: { flex: 1 },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: Spacing.xxl,
    gap: Spacing.sm,
  },
  subtitle: { marginBottom: Spacing.lg },
});
