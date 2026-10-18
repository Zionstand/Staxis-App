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
import { LoginSchema, LoginSchemaType } from '@/lib/zod-schema';
import { beginSignIn, completeSignIn } from '@/store/use-auth';

type LoginResponse = {
  user: any;
  access_token: string;
  refresh_token: string;
};

export default function LoginScreen() {
  const headerHeight = useHeaderHeight();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const {
    control,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<LoginSchemaType>({
    reValidateMode: 'onChange',
    resolver: zodResolver(LoginSchema),
    defaultValues: { email: '', password: '' },
  });

  const onSubmit = async (values: LoginSchemaType) => {
    setSubmitError(null);
    setLoading(true);
    const attempt = beginSignIn();
    try {
      const data = await postData<LoginResponse>('/auth/login', values);
      await completeSignIn(attempt, data);
      router.replace('/(tabs)');
    } catch (err: unknown) {
      if ((err as { response?: { status?: number; data?: { message?: unknown } } })?.response?.status === 401 &&
          (err as { response?: { data?: { message?: unknown } } })?.response?.data?.message === 'Unauthorized') {
        setError('password', { type: 'server', message: 'The email or password is incorrect. Check both and try again.' });
      } else {
        const fieldErrors = getAuthFieldErrors(err, ["email","password"]);
        if (Object.keys(fieldErrors).length) {
          Object.entries(fieldErrors).forEach(([field, message]) => setError(field as keyof LoginSchemaType, { type: 'server', message }));
        } else {
          setSubmitError(getUserFacingError(err));
        }
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

            <StaxisText variant="displaySm" style={styles.title}>
              Welcome back
            </StaxisText>
            <StaxisText variant="bodySm" style={styles.subtitle}>
              Sign in to your STAXIS account
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

            <Controller
              control={control}
              name="password"
              render={({ field: { onChange, onBlur, value } }) => (
                <StaxisInput
                  label="Password"
                  placeholder="Enter your password"
                  secureTextEntry
                  autoComplete="password"
                  onBlur={onBlur}
                  onChangeText={onChange}
                  value={value}
                  error={errors.password?.message}
                />
              )}
            />

            <Link href="/(auth)/forgot-password" style={styles.forgotLink}>
              <StaxisText variant="cardLink">Forgot password?</StaxisText>
            </Link>

            <StaxisButton
              label={loading ? '' : 'Sign in'}
              onPress={handleSubmit(onSubmit)}
              disabled={loading}
              block
              icon={loading ? <ActivityIndicator color={Palette.bone} /> : undefined}
            />

            <View style={styles.linkRow}>
              <StaxisText variant="bodySm">
                Don&apos;t have an account?{' '}
              </StaxisText>
              <Link href="/(auth)/register">
                <StaxisText variant="cardAction">Sign up</StaxisText>
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
  title: { color: Colors.text },
  subtitle: { marginBottom: Spacing.lg },
  forgotLink: { alignSelf: 'flex-end', marginTop: -Spacing.sm },
  linkRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: Spacing.lg,
  },
});
