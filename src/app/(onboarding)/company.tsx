import { zodResolver } from '@hookform/resolvers/zod';
import { router } from 'expo-router';
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

import { Logo } from '@/components/logo';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { ThemedTextInput } from '@/components/ui/themed-text-input';
import { BrandPrimary, MaxContentWidth, Spacing } from '@/constants/theme';
import { postData } from '@/lib/api';
import { tokenStorage } from '@/lib/token-storage';
import { EditCompanySchema, EditCompanySchemaType } from '@/lib/zod-schema';
import { useAuth } from '@/store/use-auth';

type Field = {
  name: keyof EditCompanySchemaType;
  label: string;
  placeholder: string;
  keyboardType?: 'default' | 'phone-pad' | 'url';
  autoCapitalize?: 'none' | 'sentences' | 'words';
};

// Mirrors the company fields collected on web onboarding / profile edit. Only the
// company name is required (see EditCompanySchema); the rest can be filled later.
const FIELDS: Field[] = [
  { name: 'companyName', label: 'Company name', placeholder: 'Acme Inc.' },
  { name: 'industry', label: 'Industry', placeholder: 'e.g. Fintech' },
  { name: 'companySize', label: 'Company size', placeholder: 'e.g. 11–50' },
  {
    name: 'website',
    label: 'Website',
    placeholder: 'https://acme.com',
    keyboardType: 'url',
    autoCapitalize: 'none',
  },
  { name: 'companyPhone', label: 'Phone', placeholder: '+2348012345678', keyboardType: 'phone-pad' },
  { name: 'rcNumber', label: 'RC number', placeholder: 'RC123456' },
  { name: 'address', label: 'Address', placeholder: 'Street address' },
  { name: 'city', label: 'City', placeholder: 'City' },
  { name: 'state', label: 'State', placeholder: 'State' },
  { name: 'country', label: 'Country', placeholder: 'Country' },
];

export default function OnboardingCompanyScreen() {
  const clearUser = useAuth((s) => s.clearUser);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<EditCompanySchemaType>({
    resolver: zodResolver(EditCompanySchema),
    defaultValues: {
      companyName: '',
      website: '',
      industry: '',
      companySize: '',
      companyPhone: '',
      rcNumber: '',
      address: '',
      city: '',
      state: '',
      country: '',
    },
  });

  const onSubmit = async (values: EditCompanySchemaType) => {
    setSubmitError(null);
    setLoading(true);
    try {
      await postData('/onboarding/company', values);
      router.push('/(onboarding)/plan');
    } catch (err: any) {
      const message =
        err?.response?.data?.message ?? 'Could not save your company. Try again.';
      setSubmitError(Array.isArray(message) ? message[0] : message);
    } finally {
      setLoading(false);
    }
  };

  // Let a user out of onboarding without being trapped — signing out returns to auth.
  const signOut = async () => {
    await tokenStorage.clear();
    clearUser();
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled">
        <Logo width={132} style={styles.logo} />
        <ThemedText type="small" themeColor="textSecondary">
          Step 1 of 2
        </ThemedText>
        <ThemedText type="subtitle">Tell us about your company</ThemedText>
        <ThemedText type="small" themeColor="textSecondary" style={styles.intro}>
          We&apos;ll use this to set up your workspace and support account.
        </ThemedText>

        {FIELDS.map((f) => (
          <ThemedView key={f.name} style={styles.field}>
            <ThemedText type="smallBold">{f.label}</ThemedText>
            <Controller
              control={control}
              name={f.name}
              render={({ field: { onChange, onBlur, value } }) => (
                <ThemedTextInput
                  placeholder={f.placeholder}
                  keyboardType={f.keyboardType ?? 'default'}
                  autoCapitalize={f.autoCapitalize ?? 'sentences'}
                  onBlur={onBlur}
                  onChangeText={onChange}
                  value={value}
                />
              )}
            />
            {errors[f.name] && (
              <ThemedText type="small" style={styles.fieldError}>
                {errors[f.name]?.message}
              </ThemedText>
            )}
          </ThemedView>
        ))}

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
              Continue
            </ThemedText>
          )}
        </Pressable>

        <Pressable onPress={signOut} style={styles.signOut}>
          <ThemedText type="link" themeColor="textSecondary">
            Sign out
          </ThemedText>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  scrollContent: {
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.three,
    paddingBottom: Spacing.six,
    gap: Spacing.three,
  },
  logo: {
    alignItems: 'flex-start',
    marginBottom: Spacing.one,
  },
  intro: {
    marginTop: -Spacing.two,
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
    backgroundColor: BrandPrimary,
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
  signOut: {
    alignItems: 'center',
    marginTop: Spacing.one,
  },
});
