import { useHeaderHeight } from 'expo-router/react-navigation';
import { zodResolver } from '@hookform/resolvers/zod';
import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';

import { ErrorModal } from '@/components/error-modal';
import { StaxisButton, StaxisInput } from '@/components/staxis';
import { Colors, Palette, Spacing } from '@/constants/staxis-theme';
import { fetchData, updateData } from '@/lib/api';
import { ProfileData } from '@/lib/types';
import { getUserFacingError } from '@/lib/user-facing-error';
import { EditProfileSchema, EditProfileSchemaType } from '@/lib/zod-schema';
import { useAuth } from '@/store/use-auth';
import { session } from '@/lib/session';

type Field = {
  name: keyof EditProfileSchemaType;
  label: string;
  placeholder: string;
  keyboardType?: 'default' | 'phone-pad';
  required?: boolean;
};

const FIELDS: Field[] = [
  { name: 'firstName', label: 'First name', placeholder: 'Jane', required: true },
  { name: 'lastName', label: 'Last name', placeholder: 'Doe', required: true },
  { name: 'phoneNumber', label: 'Phone', placeholder: '+2348012345678', keyboardType: 'phone-pad' },
  { name: 'address', label: 'Address', placeholder: 'Street address' },
  { name: 'city', label: 'City', placeholder: 'City' },
  { name: 'state', label: 'State', placeholder: 'State' },
  { name: 'country', label: 'Country', placeholder: 'Country' },
];

export default function EditProfileScreen() {
  const headerHeight = useHeaderHeight();
  const mounted = useRef(true);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  const storeUser = useAuth((s) => s.user);
  const setUser = useAuth((s) => s.setUser);

  const [prefilling, setPrefilling] = useState(true);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [prefillFailed, setPrefillFailed] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<EditProfileSchemaType>({
    mode: 'onChange',
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
      } catch (error) {
        if (active) {
          setPrefillFailed(true);
          setSubmitError(getUserFacingError(error, 'Could not load your profile. Please retry before editing.'));
        }
      } finally {
        if (active) setPrefilling(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [reset, reloadKey]);

  const onSubmit = async (values: EditProfileSchemaType) => {
    setSubmitError(null);
    setLoading(true);
    const expected = session.current();
    try {
      const updated = await updateData<ProfileData>('/user/me', values);
      if (!mounted.current || !session.isCurrent(expected)) return;
      if (storeUser) {
        await setUser({
          ...storeUser,
          firstName: updated.firstName,
          lastName: updated.lastName,
          phoneNumber: updated.phoneNumber ?? undefined,
        }, expected);
      }
      if (mounted.current && session.isCurrent(expected)) router.back();
    } catch (err) {
      if (!mounted.current || !session.isCurrent(expected)) return;
      setSubmitError(getUserFacingError(err, 'Could not save your changes. Please try again.'));
    } finally {
      if (mounted.current) setLoading(false);
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
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    keyboardVerticalOffset={headerHeight}
    >
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.scrollContent}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="interactive"
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
                required={f.required}
                onBlur={onBlur}
                onChangeText={onChange}
                value={value}
                error={errors[f.name]?.message}
              />
            )}
          />
        ))}

        {prefillFailed && <StaxisButton label="Retry loading profile" onPress={() => {
          setPrefilling(true);
          setPrefillFailed(false);
          setReloadKey((value) => value + 1);
        }} block />}

        <StaxisButton
          label={loading ? '' : 'Save changes'}
          onPress={() => { void handleSubmit(onSubmit)(); }}
          disabled={loading || prefillFailed}
          block
          icon={loading ? <ActivityIndicator color={Palette.bone} /> : undefined}
        />
      </ScrollView>
      <ErrorModal message={submitError} onDismiss={() => setSubmitError(null)} />
    </KeyboardAvoidingView>
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
