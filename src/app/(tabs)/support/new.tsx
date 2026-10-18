import { useHeaderHeight } from 'expo-router/react-navigation';
import { zodResolver } from '@hookform/resolvers/zod';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';

import { StaxisButton, StaxisInput, StaxisText } from '@/components/staxis';
import { ErrorModal } from '@/components/error-modal';
import { Colors, Palette, Radius, Spacing } from '@/constants/staxis-theme';
import { postData } from '@/lib/api';
import {
  CATEGORY_OPTIONS,
  categoryLabel,
} from '@/lib/tickets';
import { TicketListItem } from '@/lib/types';
import { getUserFacingError } from '@/lib/user-facing-error';
import { CreateTicketSchema, CreateTicketSchemaType } from '@/lib/zod-schema';

function ChoiceChips<T extends string>({
  options,
  value,
  onChange,
  getLabel,
}: {
  options: readonly T[];
  value: T;
  onChange: (v: T) => void;
  getLabel: (v: T) => string;
}) {
  return (
    <View style={styles.chips}>
      {options.map((opt) => {
        const active = value === opt;
        return (
          <Pressable
            key={opt}
            onPress={() => onChange(opt)}
            style={[
              styles.chip,
              { backgroundColor: active ? Palette.ink : Palette.bone2 },
            ]}
          >
            <StaxisText
              variant="tag"
              style={{ color: active ? Palette.bone : Colors.text2 }}
            >
              {getLabel(opt)}
            </StaxisText>
          </Pressable>
        );
      })}
    </View>
  );
}

export default function NewTicketScreen() {
  const headerHeight = useHeaderHeight();
  const params = useLocalSearchParams<{ quoteSubject?: string; quoteDescription?: string }>();
  const quotePrefill = CreateTicketSchema.safeParse({
    subject: params.quoteSubject,
    description: params.quoteDescription,
    category: 'BILLING',
  });
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<CreateTicketSchemaType>({
    mode: 'onChange',
    resolver: zodResolver(CreateTicketSchema),
    defaultValues: quotePrefill.success ? quotePrefill.data : {
      subject: '',
      description: '',
      category: 'GENERAL',
    },
  });

  const onSubmit = async (values: CreateTicketSchemaType) => {
    setSubmitError(null);
    setLoading(true);
    try {
      const ticket = await postData<TicketListItem>('/tickets', values);
      router.replace(`/(tabs)/support/${ticket.id}`);
    } catch (err) {
      setSubmitError(getUserFacingError(err, 'Could not create your ticket. Please try again.'));
    } finally {
      setLoading(false);
    }
  };

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
        {quotePrefill.success && <View style={styles.quoteIntro}>
          <StaxisText variant="listTitle">Request your custom quote</StaxisText>
          <StaxisText variant="bodySm">Review the plans below and add your requirements. Your request is sent only when you tap Submit ticket.</StaxisText>
        </View>}
        <Controller
          control={control}
          name="subject"
          render={({ field: { onChange, onBlur, value } }) => (
            <StaxisInput
              label="Subject"
              required
              placeholder="Brief summary of your issue"
              onBlur={onBlur}
              onChangeText={onChange}
              value={value}
              maxLength={150}
              error={errors.subject?.message}
            />
          )}
        />

        <Controller
          control={control}
          name="description"
          render={({ field: { onChange, onBlur, value } }) => (
            <StaxisInput
              label="Description"
              required
              placeholder="Tell us what's going on..."
              onBlur={onBlur}
              onChangeText={onChange}
              value={value}
              multiline
              style={{ minHeight: 120, textAlignVertical: 'top' }}
              error={errors.description?.message}
            />
          )}
        />

        <View>
          <StaxisText variant="formLabel" style={styles.fieldLabel}>
            Category
          </StaxisText>
          <Controller
            control={control}
            name="category"
            render={({ field: { onChange, value } }) => (
              <ChoiceChips
                options={CATEGORY_OPTIONS}
                value={value}
                onChange={onChange}
                getLabel={categoryLabel}
              />
            )}
          />
        </View>

        <StaxisButton
          label={loading ? '' : 'Submit ticket'}
          onPress={handleSubmit(onSubmit)}
          disabled={loading}
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
  fieldLabel: { marginBottom: Spacing.sm },
  quoteIntro: { gap: Spacing.sm, paddingBottom: Spacing.md },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  chip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderRadius: Radius.pill,
  },
});
