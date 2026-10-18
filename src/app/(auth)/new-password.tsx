import { useHeaderHeight } from 'expo-router/react-navigation';
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
import { SafeAreaView } from 'react-native-safe-area-context';

import { StaxisButton, StaxisInput, StaxisLogo, StaxisText } from '@/components/staxis';
import { Colors, Palette, Spacing } from '@/constants/staxis-theme';
import { ErrorModal } from '@/components/error-modal';
import { postData } from '@/lib/api';
import { getAuthFieldErrors, getUserFacingError } from '@/lib/user-facing-error';
import { maskEmail } from '@/lib/utils';
import { NewPasswordSchema, NewPasswordSchemaType } from '@/lib/zod-schema';

export default function NewPasswordScreen() {
  const headerHeight = useHeaderHeight();
  const { email, otp } = useLocalSearchParams<{ email: string; otp: string }>();

  const [submitError, setSubmitError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const {
    control,
    handleSubmit,
    trigger,
    setError,
    formState: { errors },
  } = useForm<NewPasswordSchemaType>({
    reValidateMode: 'onChange',
    resolver: zodResolver(NewPasswordSchema),
    defaultValues: { email, otp, newPassword: '', confirmPassword: '' },
  });

  const onSubmit = async (values: NewPasswordSchemaType) => {
    setSubmitError(null);
    setLoading(true);
    try {
      await postData('/auth/set-new-password', values);
      setSuccess(true);
    } catch (err: unknown) {
        const fieldErrors = getAuthFieldErrors(err, ["newPassword","confirmPassword"]);
        if (Object.keys(fieldErrors).length) {
          Object.entries(fieldErrors).forEach(([field, message]) => setError(field as keyof NewPasswordSchemaType, { type: 'server', message }));
        } else {
          setSubmitError(getUserFacingError(err));
        }
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <View style={styles.successInner}>
          <StaxisLogo variant="red" size={40} />

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
        <ErrorModal message={submitError} onDismiss={() => setSubmitError(null)} />
    </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={headerHeight}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
        >
          <View style={styles.inner}>
            <StaxisLogo variant="red" size={40} />

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
                  onChangeText={(text) => { onChange(text); if (errors.confirmPassword) void trigger('confirmPassword'); }}
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

            <StaxisButton
              label={loading ? '' : 'Update password'}
              onPress={handleSubmit(onSubmit)}
              disabled={loading}
              block
              icon={loading ? <ActivityIndicator color={Palette.bone} /> : undefined}
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
      <ErrorModal message={submitError} onDismiss={() => setSubmitError(null)} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bgApp },
  flex: { flex: 1 },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: Spacing.xxl,
  },
  inner: {
    flexGrow: 1,
    justifyContent: 'center',
    gap: Spacing.sm,
  },
  successInner: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: Spacing.xxl,
    gap: Spacing.sm,
  },
  subtitle: { marginBottom: Spacing.lg },
});
