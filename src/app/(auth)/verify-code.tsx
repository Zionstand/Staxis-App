import { useHeaderHeight } from 'expo-router/react-navigation';
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
import { SafeAreaView } from 'react-native-safe-area-context';

import { StaxisButton, StaxisInput, StaxisLogo, StaxisText } from '@/components/staxis';
import { Colors, Palette, Spacing, Type } from '@/constants/staxis-theme';
import { ErrorModal } from '@/components/error-modal';
import { postData } from '@/lib/api';
import { getAuthFieldErrors, getUserFacingError } from '@/lib/user-facing-error';
import { maskEmail } from '@/lib/utils';
import { VerifyCodeSchema, VerifyCodeSchemaType } from '@/lib/zod-schema';

const RESEND_COOLDOWN = 20;

export default function VerifyCodeScreen() {
  const headerHeight = useHeaderHeight();
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
    setError,
    formState: { errors },
  } = useForm<VerifyCodeSchemaType>({
    reValidateMode: 'onChange',
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
    } catch (err: unknown) {
        const fieldErrors = getAuthFieldErrors(err, ["otp"]);
        if (Object.keys(fieldErrors).length) {
          Object.entries(fieldErrors).forEach(([field, message]) => setError(field as keyof VerifyCodeSchemaType, { type: 'server', message }));
        } else {
          setSubmitError(getUserFacingError(err));
        }
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
    } catch (err: unknown) {
      setSubmitError(getUserFacingError(err, 'We could not resend your code. Please try again.'));
    } finally {
      setResending(false);
    }
  };

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
  subtitle: { marginBottom: Spacing.lg },
  otpInput: {
    textAlign: 'center',
    ...Type.verificationCode,
  },
  resendRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.xs,
    marginTop: Spacing.lg,
  },
});
