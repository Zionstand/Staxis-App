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
        // Keep the empty defaults if we can't prefill.
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
      // Keep the cached auth user in sync (drives the dashboard greeting, etc.).
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
      <ThemedView style={styles.centered}>
        <ActivityIndicator />
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
