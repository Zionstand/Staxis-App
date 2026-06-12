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
    <ThemedView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled">
          <ThemedText type="subtitle" style={styles.title}>
            Welcome back
          </ThemedText>
          <ThemedText type="default" themeColor="textSecondary">
            Sign in to your Care+ account
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

          <ThemedView style={styles.field}>
            <ThemedText type="smallBold">Password</ThemedText>
            <Controller
              control={control}
              name="password"
              render={({ field: { onChange, onBlur, value } }) => (
                <ThemedTextInput
                  placeholder="••••••••"
                  secureTextEntry
                  autoComplete="password"
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

          <Link href="/(auth)/forgot-password" style={styles.forgotLink}>
            <ThemedText type="link" themeColor="textSecondary">
              Forgot password?
            </ThemedText>
          </Link>

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
                Sign in
              </ThemedText>
            )}
          </Pressable>

          <ThemedView style={styles.linkRow}>
            <ThemedText type="link" themeColor="textSecondary">
              Don&apos;t have an account?{' '}
            </ThemedText>
            <Link href="/(auth)/register">
              <ThemedText type="linkPrimary">Sign up</ThemedText>
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
  forgotLink: {
    alignSelf: 'flex-end',
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
