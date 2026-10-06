import { zodResolver } from '@hookform/resolvers/zod';
import { router } from 'expo-router';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';

import { StaxisButton, StaxisInput, StaxisText } from '@/components/staxis';
import { Colors, Palette, Radius, Spacing } from '@/constants/staxis-theme';
import { postData } from '@/lib/api';
import {
  CATEGORY_OPTIONS,
  PRIORITY_OPTIONS,
  categoryLabel,
  priorityLabel,
} from '@/lib/tickets';
import { TicketListItem } from '@/lib/types';
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
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<CreateTicketSchemaType>({
    resolver: zodResolver(CreateTicketSchema),
    defaultValues: {
      subject: '',
      description: '',
      category: 'GENERAL',
      priority: 'LOW',
    },
  });

  const onSubmit = async (values: CreateTicketSchemaType) => {
    setSubmitError(null);
    setLoading(true);
    try {
      const ticket = await postData<TicketListItem>('/tickets', values);
      router.replace(`/(tabs)/tickets/${ticket.id}`);
    } catch (err: any) {
      const message =
        err?.response?.data?.message ?? 'Could not create your ticket. Try again.';
      setSubmitError(Array.isArray(message) ? message[0] : message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.scrollContent}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="interactive"
      automaticallyAdjustKeyboardInsets
    >
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

        <View>
          <StaxisText variant="formLabel" style={styles.fieldLabel}>
            Priority
          </StaxisText>
          <Controller
            control={control}
            name="priority"
            render={({ field: { onChange, value } }) => (
              <ChoiceChips
                options={PRIORITY_OPTIONS}
                value={value}
                onChange={onChange}
                getLabel={priorityLabel}
              />
            )}
          />
        </View>

        {submitError && (
          <StaxisText variant="formHint" style={{ color: Palette.signal }}>
            {submitError}
          </StaxisText>
        )}

        <StaxisButton
          label={loading ? '' : 'Submit ticket'}
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
  fieldLabel: { marginBottom: Spacing.sm },
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
