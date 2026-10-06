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

import { StaxisButton, StaxisInput, StaxisText } from '@/components/staxis';
import {
  Colors,
  FontFamily,
  Palette,
  Radius,
  Spacing,
} from '@/constants/staxis-theme';
import { postData } from '@/lib/api';
import { tokenStorage } from '@/lib/token-storage';
import { LoginSchema, LoginSchemaType } from '@/lib/zod-schema';
import { useAuth } from '@/store/use-auth';

type LoginResponse = {
  user: any;
  access_token: string;
  refresh_token: string;
};

export default function LoginScreen() {
  const setUser = useAuth((s) => s.setUser);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginSchemaType>({
    resolver: zodResolver(LoginSchema),
    defaultValues: { email: '', password: '' },
  });

  const onSubmit = async (values: LoginSchemaType) => {
    setSubmitError(null);
    setLoading(true);
    try {
      const data = await postData<LoginResponse>('/auth/login', values);
      await tokenStorage.setTokens(data.access_token, data.refresh_token);
      setUser(data.user);
      router.replace('/(tabs)');
    } catch (err: any) {
      const message =
        err?.response?.data?.message ?? 'Login failed. Please try again.';
      setSubmitError(Array.isArray(message) ? message[0] : message);
    } finally {
      setLoading(false);
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
          {/* Brand mark */}
          <View style={styles.brandMark}>
            <StaxisText
              variant="bodyBase"
              style={styles.brandLetter}
            >
              S
            </StaxisText>
          </View>

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

          {submitError && (
            <StaxisText variant="formHint" style={{ color: Palette.signal }}>
              {submitError}
            </StaxisText>
          )}

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
  brandMark: {
    width: 48,
    height: 48,
    borderRadius: Radius.sm,
    backgroundColor: Palette.signal,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.lg,
  },
  brandLetter: {
    fontFamily: FontFamily.monoMedium,
    color: Palette.bone,
    fontSize: 20,
    letterSpacing: -0.6,
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
