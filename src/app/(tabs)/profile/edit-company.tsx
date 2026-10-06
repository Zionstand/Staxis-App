import { zodResolver } from '@hookform/resolvers/zod';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';

import {
  EmptyState,
  StaxisButton,
  StaxisInput,
  StaxisText,
} from '@/components/staxis';
import { Colors, Palette, Spacing } from '@/constants/staxis-theme';
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
  { name: 'companySize', label: 'Company size', placeholder: 'e.g. 11-50' },
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
        /* keep empty defaults */
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
      <View style={styles.centered}>
        <ActivityIndicator color={Palette.signal} />
      </View>
    );
  }

  if (noCompany) {
    return (
      <View style={styles.centered}>
        <EmptyState
          title="No company linked"
          message="You don't have a company linked to your account yet."
        />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.scrollContent}
      keyboardDismissMode="interactive"
      automaticallyAdjustKeyboardInsets
        keyboardShouldPersistTaps="handled"
      >
        {FIELDS.map((f) => (
          <Controller
            key={f.name}
            control={control}
            name={f.name}
            render={({ field: { onChange, onBlur, value } }) => (
              <StaxisInput
                label={f.label}
                placeholder={f.placeholder}
                keyboardType={f.keyboardType ?? 'default'}
                autoCapitalize={f.autoCapitalize ?? 'sentences'}
                onBlur={onBlur}
                onChangeText={onChange}
                value={value}
                error={errors[f.name]?.message}
              />
            )}
          />
        ))}

        {submitError && (
          <StaxisText variant="formHint" style={{ color: Palette.signal }}>
            {submitError}
          </StaxisText>
        )}

        <StaxisButton
          label={loading ? '' : 'Save changes'}
          onPress={handleSubmit(onSubmit)}
          disabled={loading}
          block
          icon={loading ? <ActivityIndicator color={Palette.bone} /> : undefined}
        />
      </ScrollView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scroll: { flex: 1, backgroundColor: Colors.bgApp },
  scrollContent: {
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.xl,
    paddingBottom: Spacing.xxxl,
    gap: Spacing.sm,
  },
  centered: {
    flex: 1,
    backgroundColor: Colors.bgApp,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
