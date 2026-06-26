import { zodResolver } from '@hookform/resolvers/zod';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
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
import { fetchData, updateData } from '@/lib/api';
import { ProfileData } from '@/lib/types';
import { EditCompanySchema, EditCompanySchemaType } from '@/lib/zod-schema';

type Field = {
  name: keyof EditCompanySchemaType;
  label: string;
  placeholder: string;
  keyboardType?: 'default' | 'phone-pad' | 'url';
  autoCapitalize?: 'none' | 'sentences' | 'words';
};

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

export default function EditCompanyScreen() {
  const [prefilling, setPrefilling] = useState(true);
  const [noCompany, setNoCompany] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const {
    control,
    handleSubmit,
    reset,
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

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const me = await fetchData<ProfileData>('/user/me');
        if (!active) return;
        const c = me.company;
        if (!c) {
          setNoCompany(true);
          return;
        }
        reset({
          companyName: c.name ?? '',
          website: c.websiteUrl ?? '',
          industry: c.industry ?? '',
          companySize: c.companySize ?? '',
          companyPhone: c.companyPhone ?? '',
          rcNumber: c.rcNumber ?? '',
          address: c.address ?? '',
          city: c.city ?? '',
          state: c.state ?? '',
          country: c.country ?? '',
        });
      } catch {
        // Keep empty defaults if prefill fails.
      } finally {
        if (active) setPrefilling(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [reset]);

  const onSubmit = async (values: EditCompanySchemaType) => {
    setSubmitError(null);
    setLoading(true);
    try {
      await updateData('/user/company', values);
      router.back();
    } catch (err: any) {
      const message =
        err?.response?.data?.message ?? 'Could not save the company. Try again.';
      setSubmitError(Array.isArray(message) ? message[0] : message);
    } finally {
      setLoading(false);
    }
  };

  if (prefilling) {
    return (
      <ThemedView style={styles.centered}>
        <ActivityIndicator />
      </ThemedView>
    );
  }

  if (noCompany) {
    return (
      <ThemedView style={styles.centered}>
        <ThemedText type="default" themeColor="textSecondary" style={styles.centerText}>
          You don&apos;t have a company linked to your account yet.
        </ThemedText>
      </ThemedView>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled">
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
              Save changes
            </ThemedText>
          )}
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.four,
  },
  centerText: {
    textAlign: 'center',
  },
  scrollContent: {
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.four,
    paddingBottom: Spacing.six,
    gap: Spacing.three,
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
});
