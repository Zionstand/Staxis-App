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
  View,
} from 'react-native';

import { StaxisButton, StaxisInput, StaxisText } from '@/components/staxis';
import { Colors, FontFamily, Palette, Spacing } from '@/constants/staxis-theme';
import { postData } from '@/lib/api';
import { maskEmail } from '@/lib/utils';
import { VerifyCodeSchema, VerifyCodeSchemaType } from '@/lib/zod-schema';

const RESEND_COOLDOWN = 20;

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
            Verify code
          </StaxisText>
          <StaxisText variant="bodySm" style={styles.subtitle}>
            We&apos;ve sent a 6-digit code to {maskEmail(email ?? '')}
          </StaxisText>

          <Controller
            control={control}
            name="otp"
            render={({ field: { onChange, onBlur, value } }) => (
              <StaxisInput
                label="Code"
                placeholder="000000"
                keyboardType="number-pad"
                maxLength={6}
                onBlur={onBlur}
                onChangeText={onChange}
                value={value}
                error={errors.otp?.message}
                style={styles.otpInput}
              />
            )}
          />

          {submitError && (
            <StaxisText variant="formHint" style={{ color: Palette.signal }}>
              {submitError}
            </StaxisText>
          )}

          <StaxisButton
            label={loading ? '' : 'Verify code'}
            onPress={handleSubmit(onSubmit)}
            disabled={loading}
            block
            icon={loading ? <ActivityIndicator color={Palette.bone} /> : undefined}
          />

          <View style={styles.resendRow}>
            <StaxisText variant="bodySm">
              Didn&apos;t receive the code?
            </StaxisText>
            <Pressable
              onPress={handleResend}
              disabled={resending || timeLeft > 0}
            >
              {resending ? (
                <ActivityIndicator size="small" color={Palette.signal} />
              ) : (
                <StaxisText
                  variant="cardAction"
                  style={timeLeft > 0 ? { opacity: 0.5 } : undefined}
                >
                  {timeLeft > 0 ? `Resend in ${timeLeft}s` : 'Resend code'}
                </StaxisText>
              )}
            </Pressable>
          </View>
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
  otpInput: {
    textAlign: 'center',
    fontFamily: FontFamily.monoMedium,
    fontSize: 24,
    letterSpacing: 8,
  },
  resendRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.xs,
    marginTop: Spacing.lg,
  },
});
