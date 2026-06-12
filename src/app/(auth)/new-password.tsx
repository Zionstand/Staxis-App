import { zodResolver } from '@hookform/resolvers/zod';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
} from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { ThemedTextInput } from '@/components/ui/themed-text-input';
import { MaxContentWidth, Spacing } from '@/constants/theme';
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
      <ThemedView style={styles.container}>
        <ThemedView style={styles.scrollContent}>
          <ThemedText type="subtitle" style={styles.title}>
            Password updated
          </ThemedText>
          <ThemedText type="default" themeColor="textSecondary">
            Your password has been reset successfully. You can now sign in
            with your new password.
          </ThemedText>
          <Pressable
            style={styles.button}
            onPress={() => router.replace('/(auth)/login')}>
            <ThemedText type="smallBold" style={styles.buttonText}>
              Back to sign in
            </ThemedText>
          </Pressable>
        </ThemedView>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled">
          <ThemedText type="subtitle" style={styles.title}>
            Set new password
          </ThemedText>
          <ThemedText type="default" themeColor="textSecondary">
            Create a new password for {maskEmail(email ?? '')}
          </ThemedText>

          <ThemedView style={styles.field}>
            <ThemedText type="smallBold">New password</ThemedText>
            <Controller
              control={control}
              name="newPassword"
              render={({ field: { onChange, onBlur, value } }) => (
                <ThemedTextInput
                  placeholder="••••••••"
                  secureTextEntry
                  autoComplete="password-new"
                  onBlur={onBlur}
                  onChangeText={onChange}
                  value={value}
                />
              )}
            />
            {errors.newPassword && (
              <ThemedText type="small" style={styles.fieldError}>
                {errors.newPassword.message}
              </ThemedText>
            )}
          </ThemedView>

          <ThemedView style={styles.field}>
            <ThemedText type="smallBold">Confirm password</ThemedText>
            <Controller
              control={control}
              name="confirmPassword"
              render={({ field: { onChange, onBlur, value } }) => (
                <ThemedTextInput
                  placeholder="••••••••"
                  secureTextEntry
                  autoComplete="password-new"
                  onBlur={onBlur}
                  onChangeText={onChange}
                  value={value}
                />
              )}
            />
            {errors.confirmPassword && (
              <ThemedText type="small" style={styles.fieldError}>
                {errors.confirmPassword.message}
              </ThemedText>
            )}
          </ThemedView>

          {submitError && (
            <ThemedText type="small" style={styles.fieldError}>
              {submitError}
            </ThemedText>
          )}

          <Pressable
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleSubmit(onSubmit)}
            disabled={loading}>
            {loading ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <ThemedText type="smallBold" style={styles.buttonText}>
                Update password
              </ThemedText>
            )}
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: Spacing.four,
    gap: Spacing.three,
    alignSelf: 'center',
    width: '100%',
    maxWidth: MaxContentWidth,
  },
  title: {
    marginBottom: -Spacing.two,
  },
  field: {
    gap: Spacing.one,
  },
  fieldError: {
    color: '#e5484d',
  },
  button: {
    height: 48,
    borderRadius: 12,
    backgroundColor: '#208AEF',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.two,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#ffffff',
  },
});
