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
  Switch,
  View,
} from 'react-native';

import { StaxisButton, StaxisInput, StaxisText } from '@/components/staxis';
import { Colors, Palette, Spacing } from '@/constants/staxis-theme';
import { postData } from '@/lib/api';
import { tokenStorage } from '@/lib/token-storage';
import { RegisterSchema, RegisterSchemaType } from '@/lib/zod-schema';
import { useAuth } from '@/store/use-auth';

type RegisterResponse = {
  user: any;
  access_token: string;
  refresh_token: string;
};

export default function RegisterScreen() {
  const setUser = useAuth((s) => s.setUser);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterSchemaType>({
    resolver: zodResolver(RegisterSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      email: '',
      password: '',
      confirmPassword: '',
      phoneNumber: '',
      acceptTerms: false as unknown as true,
    },
  });

  const onSubmit = async (values: RegisterSchemaType) => {
    setSubmitError(null);
    setLoading(true);
    try {
      const data = await postData<RegisterResponse>('/auth/register', values);
      await tokenStorage.setTokens(data.access_token, data.refresh_token);
      setUser(data.user);
      router.replace('/(tabs)');
    } catch (err: any) {
      const message =
        err?.response?.data?.message ?? 'Registration failed. Please try again.';
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
          <StaxisText variant="displaySm" style={{ color: Colors.text }}>
            Create an account
          </StaxisText>
          <StaxisText variant="bodySm" style={styles.subtitle}>
            Get started with STAXIS
          </StaxisText>

          <View style={styles.nameRow}>
            <View style={styles.flex}>
              <Controller
                control={control}
                name="firstName"
                render={({ field: { onChange, onBlur, value } }) => (
                  <StaxisInput
                    label="First name"
                    placeholder="Jane"
                    autoComplete="given-name"
                    onBlur={onBlur}
                    onChangeText={onChange}
                    value={value}
                    error={errors.firstName?.message}
                  />
                )}
              />
            </View>
            <View style={styles.flex}>
              <Controller
                control={control}
                name="lastName"
                render={({ field: { onChange, onBlur, value } }) => (
                  <StaxisInput
                    label="Last name"
                    placeholder="Doe"
                    autoComplete="family-name"
                    onBlur={onBlur}
                    onChangeText={onChange}
                    value={value}
                    error={errors.lastName?.message}
                  />
                )}
              />
            </View>
          </View>

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
            name="phoneNumber"
            render={({ field: { onChange, onBlur, value } }) => (
              <StaxisInput
                label="Phone number"
                placeholder="+2348012345678"
                autoComplete="tel"
                keyboardType="phone-pad"
                onBlur={onBlur}
                onChangeText={onChange}
                value={value}
                error={errors.phoneNumber?.message}
              />
            )}
          />

          <Controller
            control={control}
            name="password"
            render={({ field: { onChange, onBlur, value } }) => (
              <StaxisInput
                label="Password"
                placeholder="Create a strong password"
                secureTextEntry
                autoComplete="password-new"
                onBlur={onBlur}
                onChangeText={onChange}
                value={value}
                error={errors.password?.message}
              />
            )}
          />

          <Controller
            control={control}
            name="confirmPassword"
            render={({ field: { onChange, onBlur, value } }) => (
              <StaxisInput
                label="Confirm password"
                placeholder="Re-enter your password"
                secureTextEntry
                autoComplete="password-new"
                onBlur={onBlur}
                onChangeText={onChange}
                value={value}
                error={errors.confirmPassword?.message}
              />
            )}
          />

          <View style={styles.termsRow}>
            <Controller
              control={control}
              name="acceptTerms"
              render={({ field: { onChange, value } }) => (
                <Switch
                  value={!!value}
                  onValueChange={onChange}
                  trackColor={{ true: Palette.signal }}
                />
              )}
            />
            <StaxisText variant="bodySm" style={styles.termsText}>
              I accept the Terms of Service and Privacy Policy
            </StaxisText>
          </View>
          {errors.acceptTerms && (
            <StaxisText variant="formHint" style={{ color: Palette.signal }}>
              {errors.acceptTerms.message}
            </StaxisText>
          )}

          {submitError && (
            <StaxisText variant="formHint" style={{ color: Palette.signal }}>
              {submitError}
            </StaxisText>
          )}

          <StaxisButton
            label={loading ? '' : 'Create account'}
            onPress={handleSubmit(onSubmit)}
            disabled={loading}
            block
            icon={loading ? <ActivityIndicator color={Palette.bone} /> : undefined}
          />

          <View style={styles.linkRow}>
            <StaxisText variant="bodySm">
              Already have an account?{' '}
            </StaxisText>
            <Link href="/(auth)/login">
              <StaxisText variant="cardAction">Sign in</StaxisText>
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
    paddingVertical: Spacing.xxl,
    gap: Spacing.sm,
  },
  subtitle: { marginBottom: Spacing.lg },
  nameRow: { flexDirection: 'row', gap: Spacing.md },
  termsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  termsText: { flex: 1 },
  linkRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: Spacing.lg,
  },
});
