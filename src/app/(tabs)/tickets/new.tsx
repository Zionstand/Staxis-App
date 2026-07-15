import { zodResolver } from '@hookform/resolvers/zod';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
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
import { MessageComposer, withAttachments } from '@/components/message-composer';
import { ThemedTextInput } from '@/components/ui/themed-text-input';
import { BrandPrimary, BrandPrimaryForeground, MaxContentWidth, Spacing } from '@/constants/theme';
import { useSubscription } from '@/hooks/use-subscription';
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
                backgroundColor: active ? BrandPrimary : theme.backgroundElement,
              },
            ]}>
            <ThemedText
              type="small"
              style={{ color: active ? BrandPrimaryForeground : theme.textSecondary }}>
              {getLabel(opt)}
            </ThemedText>
          </Pressable>
        );
      })}
    </View>
  );
}

export default function NewTicketScreen() {
  const { canCreateTickets, message } = useSubscription();
  // Billing/account tickets are always allowed (even on a lapsed subscription) so
  // a customer can reach support about the payment problem locking them out — this
  // mirrors the backend guard's BILLING exemption.
  const { billing, subject } = useLocalSearchParams<{ billing?: string; subject?: string }>();
  const billingIntent = billing === '1';
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [attachments, setAttachments] = useState<string[]>([]);

  const {
    control,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<CreateTicketSchemaType>({
    resolver: zodResolver(CreateTicketSchema),
    defaultValues: {
      subject: subject ?? '',
      description: '',
      category: billingIntent ? 'BILLING' : 'GENERAL',
      priority: 'LOW',
    },
  });

  // Keep the category locked to BILLING whenever the billing intent is active —
  // including when it's flipped on after mount (via setParams from the paywall).
  useEffect(() => {
    if (billingIntent) setValue('category', 'BILLING');
  }, [billingIntent, setValue]);

  const onSubmit = async (values: CreateTicketSchemaType) => {
    setSubmitError(null);
    setLoading(true);
    try {
      const description = withAttachments(values.description, attachments);
      const ticket = await postData<TicketListItem>('/tickets', {
        ...values,
        description,
      });
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

  // Defense in depth: all entry points to this screen are gated, but a deep link
  // or back-navigation could still land a blocked user here. Show a paywall —
  // unless this is a billing ticket, which is always permitted.
  if (!canCreateTickets && !billingIntent) {
    return (
      <ThemedView style={styles.gate}>
        <ThemedText type="subtitle" style={styles.gateTitle}>
          Subscription required
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary" style={styles.gateText}>
          {message || 'Subscribe to open a support ticket.'}
        </ThemedText>
        <Pressable
          style={styles.button}
          onPress={() => router.replace('/(tabs)/billing/subscribe')}>
          <ThemedText type="smallBold" style={styles.buttonText}>
            View plans
          </ThemedText>
        </Pressable>
        <Pressable
          style={styles.gateBillingLink}
          onPress={() =>
            router.setParams({ billing: '1' })
          }>
          <ThemedText type="link" themeColor="textSecondary">
            Have a billing or payment issue? Contact us
          </ThemedText>
        </Pressable>
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
            render={({ field: { onChange, value } }) => (
              <MessageComposer
                placeholder="Tell us what's going on… you can attach a screenshot too"
                value={value}
                onChangeText={onChange}
                attachments={attachments}
                onAttachmentsChange={setAttachments}
                inputStyle={styles.textArea}
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
          {billingIntent ? (
            // Locked to BILLING — this is the always-allowed billing/account channel.
            <ThemedText type="small" themeColor="textSecondary">
              Billing &amp; payments — our billing team will get back to you.
            </ThemedText>
          ) : (
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
          )}
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
  gate: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.four,
    gap: Spacing.two,
  },
  gateTitle: {
    textAlign: 'center',
  },
  gateText: {
    textAlign: 'center',
    maxWidth: 300,
  },
  gateBillingLink: {
    marginTop: Spacing.two,
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
});
