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

import { StaxisButton, StaxisInput, StaxisText } from '@/components/staxis';
import { Colors, Palette, Spacing } from '@/constants/staxis-theme';
import { fetchData, updateData } from '@/lib/api';
import { ProfileData } from '@/lib/types';
import { EditProfileSchema, EditProfileSchemaType } from '@/lib/zod-schema';
import { useAuth } from '@/store/use-auth';

type Field = {
  name: keyof EditProfileSchemaType;
  label: string;
  placeholder: string;
  keyboardType?: 'default' | 'phone-pad';
};

const FIELDS: Field[] = [
  { name: 'firstName', label: 'First name', placeholder: 'Jane' },
  { name: 'lastName', label: 'Last name', placeholder: 'Doe' },
  { name: 'phoneNumber', label: 'Phone', placeholder: '+2348012345678', keyboardType: 'phone-pad' },
  { name: 'address', label: 'Address', placeholder: 'Street address' },
  { name: 'city', label: 'City', placeholder: 'City' },
  { name: 'state', label: 'State', placeholder: 'State' },
  { name: 'country', label: 'Country', placeholder: 'Country' },
];

export default function EditProfileScreen() {
  const storeUser = useAuth((s) => s.user);
  const setUser = useAuth((s) => s.setUser);

  const [prefilling, setPrefilling] = useState(true);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<EditProfileSchemaType>({
    resolver: zodResolver(EditProfileSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      phoneNumber: '',
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
        reset({
          firstName: me.firstName ?? '',
          lastName: me.lastName ?? '',
          phoneNumber: me.phoneNumber ?? '',
          address: me.address ?? '',
          city: me.city ?? '',
          state: me.state ?? '',
          country: me.country ?? '',
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

  const onSubmit = async (values: EditProfileSchemaType) => {
    setSubmitError(null);
    setLoading(true);
    try {
      const updated = await updateData<ProfileData>('/user/me', values);
      if (storeUser) {
        setUser({
          ...storeUser,
          firstName: updated.firstName,
          lastName: updated.lastName,
          phoneNumber: updated.phoneNumber ?? undefined,
        });
      }
      router.back();
    } catch (err: any) {
      const message =
        err?.response?.data?.message ?? 'Could not save your changes. Try again.';
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

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.scrollContent}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="interactive"
      automaticallyAdjustKeyboardInsets
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
