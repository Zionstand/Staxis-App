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
  View,
} from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { ThemedTextInput } from '@/components/ui/themed-text-input';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
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
  const theme = useTheme();
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
              {
                backgroundColor: active ? theme.text : theme.backgroundElement,
              },
            ]}>
            <ThemedText
              type="small"
              style={{ color: active ? theme.background : theme.textSecondary }}>
              {getLabel(opt)}
            </ThemedText>
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
      // Replace this screen with the new ticket so "back" returns to the list.
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
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled">
        <ThemedView style={styles.field}>
          <ThemedText type="smallBold">Subject</ThemedText>
          <Controller
            control={control}
            name="subject"
            render={({ field: { onChange, onBlur, value } }) => (
              <ThemedTextInput
                placeholder="Brief summary of your issue"
                onBlur={onBlur}
                onChangeText={onChange}
                value={value}
                maxLength={150}
              />
            )}
          />
          {errors.subject && (
            <ThemedText type="small" style={styles.fieldError}>
              {errors.subject.message}
            </ThemedText>
          )}
        </ThemedView>

        <ThemedView style={styles.field}>
          <ThemedText type="smallBold">Description</ThemedText>
          <Controller
            control={control}
            name="description"
            render={({ field: { onChange, onBlur, value } }) => (
              <ThemedTextInput
                placeholder="Tell us what's going on…"
                onBlur={onBlur}
                onChangeText={onChange}
                value={value}
                multiline
                style={styles.textArea}
              />
            )}
          />
          {errors.description && (
            <ThemedText type="small" style={styles.fieldError}>
              {errors.description.message}
            </ThemedText>
          )}
        </ThemedView>

        <ThemedView style={styles.field}>
          <ThemedText type="smallBold">Category</ThemedText>
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
        </ThemedView>

        <ThemedView style={styles.field}>
          <ThemedText type="smallBold">Priority</ThemedText>
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
        </ThemedView>

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
              Submit ticket
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
  textArea: {
    height: undefined,
    minHeight: 120,
    paddingTop: Spacing.three,
    textAlignVertical: 'top',
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  chip: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: Spacing.five,
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
