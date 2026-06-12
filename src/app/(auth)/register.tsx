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
  Switch,
} from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { ThemedTextInput } from '@/components/ui/themed-text-input';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
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
  const theme = useTheme();
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
    <ThemedView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled">
          <ThemedText type="subtitle" style={styles.title}>
            Create an account
          </ThemedText>
          <ThemedText type="default" themeColor="textSecondary">
            Get started with Care+
          </ThemedText>

          <ThemedView style={styles.row}>
            <ThemedView style={[styles.field, styles.flex]}>
              <ThemedText type="smallBold">First name</ThemedText>
              <Controller
                control={control}
                name="firstName"
                render={({ field: { onChange, onBlur, value } }) => (
                  <ThemedTextInput
                    placeholder="Jane"
                    autoComplete="given-name"
                    onBlur={onBlur}
                    onChangeText={onChange}
                    value={value}
                  />
                )}
              />
              {errors.firstName && (
                <ThemedText type="small" style={styles.fieldError}>
                  {errors.firstName.message}
                </ThemedText>
              )}
            </ThemedView>

            <ThemedView style={[styles.field, styles.flex]}>
              <ThemedText type="smallBold">Last name</ThemedText>
              <Controller
                control={control}
                name="lastName"
                render={({ field: { onChange, onBlur, value } }) => (
                  <ThemedTextInput
                    placeholder="Doe"
                    autoComplete="family-name"
                    onBlur={onBlur}
                    onChangeText={onChange}
                    value={value}
                  />
                )}
              />
              {errors.lastName && (
                <ThemedText type="small" style={styles.fieldError}>
                  {errors.lastName.message}
                </ThemedText>
              )}
            </ThemedView>
          </ThemedView>

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

          <ThemedView style={styles.field}>
            <ThemedText type="smallBold">Phone number</ThemedText>
            <Controller
              control={control}
              name="phoneNumber"
              render={({ field: { onChange, onBlur, value } }) => (
                <ThemedTextInput
                  placeholder="+2348012345678"
                  autoComplete="tel"
                  keyboardType="phone-pad"
                  onBlur={onBlur}
                  onChangeText={onChange}
                  value={value}
                />
              )}
            />
            {errors.phoneNumber && (
              <ThemedText type="small" style={styles.fieldError}>
                {errors.phoneNumber.message}
              </ThemedText>
            )}
          </ThemedView>

          <ThemedView style={styles.field}>
            <ThemedText type="smallBold">Password</ThemedText>
            <Controller
              control={control}
              name="password"
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
            {errors.password && (
              <ThemedText type="small" style={styles.fieldError}>
                {errors.password.message}
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

          <ThemedView style={styles.field}>
            <ThemedView style={styles.termsRow}>
              <Controller
                control={control}
                name="acceptTerms"
                render={({ field: { onChange, value } }) => (
                  <Switch
                    value={!!value}
                    onValueChange={onChange}
                    trackColor={{ true: '#208AEF' }}
                  />
                )}
              />
              <ThemedText type="small" style={styles.termsText}>
                I accept the Terms of Service and Privacy Policy
              </ThemedText>
            </ThemedView>
            {errors.acceptTerms && (
              <ThemedText type="small" style={styles.fieldError}>
                {errors.acceptTerms.message}
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
                Create account
              </ThemedText>
            )}
          </Pressable>

          <ThemedView style={styles.linkRow}>
            <ThemedText type="link" themeColor="textSecondary">
              Already have an account?{' '}
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
    paddingVertical: Spacing.four,
    gap: Spacing.three,
    alignSelf: 'center',
    width: '100%',
    maxWidth: MaxContentWidth,
  },
  title: {
    marginBottom: -Spacing.two,
  },
  row: {
    flexDirection: 'row',
    gap: Spacing.three,
  },
  field: {
    gap: Spacing.one,
  },
  fieldError: {
    color: '#e5484d',
  },
  termsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  termsText: {
    flex: 1,
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
