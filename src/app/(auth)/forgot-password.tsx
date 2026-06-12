import { zodResolver } from '@hookform/resolvers/zod';
import { Link, router } from 'expo-router';
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
import {
  ForgotPasswordSchema,
  ForgotPasswordSchemaType,
} from '@/lib/zod-schema';

export default function ForgotPasswordScreen() {
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordSchemaType>({
    resolver: zodResolver(ForgotPasswordSchema),
    defaultValues: { email: '' },
  });

  const onSubmit = async (values: ForgotPasswordSchemaType) => {
    setSubmitError(null);
    setLoading(true);
    try {
      await postData('/auth/forgot-password', values);
      router.push({
        pathname: '/(auth)/verify-code',
        params: { email: values.email },
      });
    } catch (err: any) {
      const message =
        err?.response?.data?.message ?? 'Something went wrong. Please try again.';
      setSubmitError(Array.isArray(message) ? message[0] : message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ThemedView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled">
          <ThemedText type="subtitle" style={styles.title}>
            Reset password
          </ThemedText>
          <ThemedText type="default" themeColor="textSecondary">
            Enter your email address and we&apos;ll send you a verification
            code to reset your password.
          </ThemedText>

          <ThemedView style={styles.field}>
            <ThemedText type="smallBold">Email</ThemedText>
            <Controller
              control={control}
              name="email"
              render={({ field: { onChange, onBlur, value } }) => (
                <ThemedTextInput
                  placeholder="name@example.com"
                  autoCapitalize="none"
                  autoComplete="email"
                  keyboardType="email-address"
                  onBlur={onBlur}
                  onChangeText={onChange}
                  value={value}
                />
              )}
            />
            {errors.email && (
              <ThemedText type="small" style={styles.fieldError}>
                {errors.email.message}
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
                Send code
              </ThemedText>
            )}
          </Pressable>

          <ThemedView style={styles.linkRow}>
            <ThemedText type="link" themeColor="textSecondary">
              Remember your password?{' '}
            </ThemedText>
            <Link href="/(auth)/login">
              <ThemedText type="linkPrimary">Sign in</ThemedText>
            </Link>
          </ThemedView>
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
  linkRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: Spacing.two,
  },
});
