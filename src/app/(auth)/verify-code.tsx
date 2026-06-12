import { zodResolver } from '@hookform/resolvers/zod';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
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
import { VerifyCodeSchema, VerifyCodeSchemaType } from '@/lib/zod-schema';

const RESEND_COOLDOWN = 20; // seconds

export default function VerifyCodeScreen() {
  const { email } = useLocalSearchParams<{ email: string }>();

  const [submitError, setSubmitError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [timeLeft, setTimeLeft] = useState(RESEND_COOLDOWN);

  useEffect(() => {
    if (timeLeft <= 0) return;
    const interval = setInterval(() => {
      setTimeLeft((prev) => Math.max(prev - 1, 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [timeLeft]);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<VerifyCodeSchemaType>({
    resolver: zodResolver(VerifyCodeSchema),
    defaultValues: { email, otp: '' },
  });

  const onSubmit = async (values: VerifyCodeSchemaType) => {
    setSubmitError(null);
    setLoading(true);
    try {
      await postData('/auth/verify-code', values);
      router.push({
        pathname: '/(auth)/new-password',
        params: { email: values.email, otp: values.otp },
      });
    } catch (err: any) {
      const message =
        err?.response?.data?.message ?? 'Invalid or expired code.';
      setSubmitError(Array.isArray(message) ? message[0] : message);
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setSubmitError(null);
    setResending(true);
    try {
      await postData('/auth/forgot-password', { email });
      setTimeLeft(RESEND_COOLDOWN);
    } catch (err: any) {
      const message =
        err?.response?.data?.message ?? 'Could not resend code.';
      setSubmitError(Array.isArray(message) ? message[0] : message);
    } finally {
      setResending(false);
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
            Verify code
          </ThemedText>
          <ThemedText type="default" themeColor="textSecondary">
            We&apos;ve sent a 6-digit verification code to{' '}
            {maskEmail(email ?? '')}
          </ThemedText>

          <ThemedView style={styles.field}>
            <ThemedText type="smallBold">Code</ThemedText>
            <Controller
              control={control}
              name="otp"
              render={({ field: { onChange, onBlur, value } }) => (
                <ThemedTextInput
                  placeholder="000000"
                  keyboardType="number-pad"
                  maxLength={6}
                  style={styles.otpInput}
                  onBlur={onBlur}
                  onChangeText={onChange}
                  value={value}
                />
              )}
            />
            {errors.otp && (
              <ThemedText type="small" style={styles.fieldError}>
                {errors.otp.message}
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
                Verify code
              </ThemedText>
            )}
          </Pressable>

          <ThemedView style={styles.resendRow}>
            <ThemedText type="small" themeColor="textSecondary">
              Didn&apos;t receive the code?
            </ThemedText>
            <Pressable
              onPress={handleResend}
              disabled={resending || timeLeft > 0}>
              {resending ? (
                <ActivityIndicator />
              ) : (
                <ThemedText
                  type="linkPrimary"
                  style={timeLeft > 0 && styles.linkDisabled}>
                  {timeLeft > 0 ? `Resend in ${timeLeft}s` : 'Resend code'}
                </ThemedText>
              )}
            </Pressable>
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
  otpInput: {
    textAlign: 'center',
    fontSize: 24,
    letterSpacing: 8,
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
  resendRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.one,
    marginTop: Spacing.two,
  },
  linkDisabled: {
    opacity: 0.5,
  },
});
