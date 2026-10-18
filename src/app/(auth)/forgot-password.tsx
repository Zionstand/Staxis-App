import { useHeaderHeight } from 'expo-router/react-navigation';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, router } from 'expo-router';
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
import {
  ForgotPasswordSchema,
  ForgotPasswordSchemaType,
} from '@/lib/zod-schema';

export default function ForgotPasswordScreen() {
  const headerHeight = useHeaderHeight();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const {
    control,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<ForgotPasswordSchemaType>({
    reValidateMode: 'onChange',
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
    } catch (err: unknown) {
        const fieldErrors = getAuthFieldErrors(err, ["email"]);
        if (Object.keys(fieldErrors).length) {
          Object.entries(fieldErrors).forEach(([field, message]) => setError(field as keyof ForgotPasswordSchemaType, { type: 'server', message }));
        } else {
          setSubmitError(getUserFacingError(err));
        }
    } finally {
      setLoading(false);
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
              Reset password
            </StaxisText>
            <StaxisText variant="bodySm" style={styles.subtitle}>
              Enter your email and we&apos;ll send you a verification code.
            </StaxisText>

            <Controller
              control={control}
              name="email"
              render={({ field: { onChange, onBlur, value } }) => (
                <StaxisInput
                  label="Email"
                  placeholder="name@example.com"
                  autoCapitalize="none"
                  autoComplete="email"
                  keyboardType="email-address"
                  onBlur={onBlur}
                  onChangeText={onChange}
                  value={value}
                  error={errors.email?.message}
                />
              )}
            />

            <StaxisButton
              label={loading ? '' : 'Send code'}
              onPress={handleSubmit(onSubmit)}
              disabled={loading}
              block
              icon={loading ? <ActivityIndicator color={Palette.bone} /> : undefined}
            />

            <View style={styles.linkRow}>
              <StaxisText variant="bodySm">
                Remember your password?{' '}
              </StaxisText>
              <Link href="/(auth)/login">
                <StaxisText variant="cardAction">Sign in</StaxisText>
              </Link>
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
  linkRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: Spacing.lg,
  },
});
