import { useHeaderHeight } from 'expo-router/react-navigation';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import {
  AccessibilityInfo,
  ActivityIndicator,
  Animated,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  StaxisButton,
  StaxisInput,
  StaxisLogo,
  StaxisPhoneInput,
  StaxisText,
} from '@/components/staxis';
import { Colors, Palette, Spacing } from '@/constants/staxis-theme';
import { ErrorModal } from '@/components/error-modal';
import { postData } from '@/lib/api';
import { getAuthFieldErrors, getUserFacingError } from '@/lib/user-facing-error';
import { RegisterSchema, RegisterSchemaType } from '@/lib/zod-schema';
import { beginSignIn, completeSignIn } from '@/store/use-auth';

type RegisterResponse = {
  user: any;
  access_token: string;
  refresh_token: string;
};

export default function RegisterScreen() {
  const headerHeight = useHeaderHeight();

  const scrollRef = useRef<ScrollView>(null);
  const fieldPositions = useRef<Record<string, number>>({});
  const [shake] = useState(() => new Animated.Value(0));
  useEffect(() => () => shake.stopAnimation(), [shake]);
  const revealErrors = (fieldErrors: Record<string, unknown>) => {
    const first = ['firstName', 'lastName', 'email', 'phoneNumber', 'password', 'confirmPassword', 'acceptTerms'].find((field) => field in fieldErrors);
    if (first) scrollRef.current?.scrollTo({ y: Math.max((fieldPositions.current[first] ?? 0) - Spacing.lg, 0), animated: true });
    shakeButton();
  };
  const shakeButton = () => {
    void AccessibilityInfo.isReduceMotionEnabled().then((reduceMotion) => {
      if (reduceMotion) return;
      shake.stopAnimation();
      shake.setValue(0);
      Animated.sequence([8, -8, 6, -6, 0].map((toValue) => Animated.timing(shake, { toValue, duration: 65, useNativeDriver: true }))).start();
    }).catch(() => {});
  };
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const {
    control,
    handleSubmit,
    trigger,
    setError,
    formState: { errors },
  } = useForm<RegisterSchemaType>({
    reValidateMode: 'onChange',
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
    const attempt = beginSignIn();
    try {
      const data = await postData<RegisterResponse>('/auth/register', values);
      await completeSignIn(attempt, data);
      router.replace('/(tabs)');
    } catch (err: unknown) {
        const fieldErrors = getAuthFieldErrors(err, ["firstName","lastName","email","password","confirmPassword","phoneNumber","acceptTerms"]);
        if (Object.keys(fieldErrors).length) {
          Object.entries(fieldErrors).forEach(([field, message]) => setError(field as keyof RegisterSchemaType, { type: 'server', message }));
          revealErrors(fieldErrors);
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
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={headerHeight}
      >
        <ScrollView
          ref={scrollRef}
          style={styles.flex}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
        >
          <View style={styles.inner}>
            <StaxisLogo variant="red" size={40} />

            <StaxisText variant="displaySm" style={{ color: Colors.text }}>
              Create an account
            </StaxisText>
            <StaxisText variant="bodySm" style={styles.subtitle}>
              Get started with STAXIS
            </StaxisText>

            <View style={styles.nameRow} onLayout={(event) => { fieldPositions.current.firstName = event.nativeEvent.layout.y; fieldPositions.current.lastName = event.nativeEvent.layout.y; }}>
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

            <View onLayout={(event) => { fieldPositions.current.email = event.nativeEvent.layout.y; }}>
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
            </View>

            <View onLayout={(event) => { fieldPositions.current.phoneNumber = event.nativeEvent.layout.y; }}>
            <Controller
              control={control}
              name="phoneNumber"
              render={({ field: { onChange, value } }) => (
                <StaxisPhoneInput
                  label="Phone number"
                  value={value}
                  onChangeText={onChange}
                  onChangeFormattedText={onChange}
                  defaultCode="NG"
                  error={errors.phoneNumber?.message}
                />
              )}
            />
            </View>

            <View onLayout={(event) => { fieldPositions.current.password = event.nativeEvent.layout.y; }}>
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
                  onChangeText={(text) => { onChange(text); if (errors.confirmPassword) void trigger('confirmPassword'); }}
                  value={value}
                  error={errors.password?.message}
                />
              )}
            />
            </View>

            <View onLayout={(event) => { fieldPositions.current.confirmPassword = event.nativeEvent.layout.y; }}>
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
            </View>

            <View style={styles.termsRow} onLayout={(event) => { fieldPositions.current.acceptTerms = event.nativeEvent.layout.y; }}>
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

            <Animated.View style={{ transform: [{ translateX: shake }] }}>
            <StaxisButton
              label={loading ? '' : 'Create account'}
              onPress={() => { void handleSubmit(onSubmit, revealErrors)(); }}
              disabled={loading}
              block
              icon={loading ? <ActivityIndicator color={Palette.bone} /> : undefined}
            />
            </Animated.View>

            <View style={styles.linkRow}>
              <StaxisText variant="bodySm">
                Already have an account?{' '}
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
    paddingVertical: Spacing.xxl,
  },
  inner: {
    flexGrow: 1,
    justifyContent: 'center',
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
