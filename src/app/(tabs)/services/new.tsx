import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  View,
} from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { StatusModal } from '@/components/ui/status-modal';
import { ThemedTextInput } from '@/components/ui/themed-text-input';
import { BottomTabInset, BrandPrimary, MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { fetchData, postData } from '@/lib/api';
import { type ServiceCategory } from '@/lib/ondemand';
import { fmtNaira } from '@/lib/utils';

export default function NewRequestScreen() {
  const theme = useTheme();

  const [catalogue, setCatalogue] = useState<ServiceCategory[]>([]);
  const [summary, setSummary] = useState('');
  const [details, setDetails] = useState('');
  const [afterHours, setAfterHours] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [submitting, setSubmitting] = useState(false);
  const [errorModal, setErrorModal] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const cat = await fetchData<ServiceCategory[]>('/services/catalogue');
      setCatalogue(cat.filter((c) => c.tasks.length > 0));
    } catch {
      // Catalogue is optional context for a quote — a failure shouldn't block it.
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const submit = async () => {
    if (summary.trim().length < 5) {
      setErrorModal('Add a short summary of what you need (at least 5 characters).');
      return;
    }
    setSubmitting(true);
    try {
      const request = await postData<{ id: string }>('/services/requests/mine', {
        summary: summary.trim(),
        details: details.trim() || undefined,
        afterHours,
        taskIds: Array.from(selected),
      });
      router.replace(`/(tabs)/services/requests/${request.id}`);
    } catch (e: any) {
      setErrorModal(e?.response?.data?.message ?? 'Could not submit your request. Try again.');
      setSubmitting(false);
    }
  };

  return (
    <>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled">
        <View style={styles.inner}>
          <View style={styles.header}>
            <ThemedText type="subtitle">Request a service</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              Tell us what you need. We&apos;ll scope it and send a quote before any work starts.
            </ThemedText>
          </View>

          <View style={styles.field}>
            <ThemedText type="smallBold">
              What do you need? <ThemedText type="smallBold" themeColor="primary">*</ThemedText>
            </ThemedText>
            <ThemedTextInput
              placeholder="e.g. Set up email security for our domain"
              value={summary}
              onChangeText={setSummary}
              maxLength={150}
            />
          </View>

          <View style={styles.field}>
            <ThemedText type="smallBold">Details (optional)</ThemedText>
            <ThemedTextInput
              placeholder="Anything that helps us scope it — domains, number of users, deadlines…"
              value={details}
              onChangeText={setDetails}
              multiline
              numberOfLines={4}
              style={styles.textarea}
            />
          </View>

          {catalogue.length > 0 && (
            <View style={styles.field}>
              <ThemedText type="smallBold">Related tasks (optional)</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                Pick any that apply. Prices are guides — we confirm the final quote.
              </ThemedText>
              {catalogue.map((cat) => (
                <View key={cat.id} style={styles.catBlock}>
                  <ThemedText type="small" themeColor="textSecondary" style={styles.catName}>
                    {cat.name}
                  </ThemedText>
                  {cat.tasks.map((t) => {
                    const on = selected.has(t.id);
                    return (
                      <Pressable
                        key={t.id}
                        onPress={() => toggle(t.id)}
                        style={({ pressed }) => pressed && styles.pressed}>
                        <ThemedView type="backgroundElement" style={styles.taskRow}>
                          <View
                            style={[
                              styles.check,
                              {
                                borderColor: on ? BrandPrimary : theme.backgroundSelected,
                                backgroundColor: on ? BrandPrimary : 'transparent',
                              },
                            ]}>
                            {on && <ThemedText style={styles.checkTick}>✓</ThemedText>}
                          </View>
                          <ThemedText type="small" style={styles.taskName} numberOfLines={2}>
                            {t.name}
                          </ThemedText>
                          {t.pricingType === 'FIXED' && t.fixedPrice != null && (
                            <ThemedText type="small" themeColor="textSecondary">
                              {fmtNaira(t.fixedPrice)}
                            </ThemedText>
                          )}
                        </ThemedView>
                      </Pressable>
                    );
                  })}
                </View>
              ))}
            </View>
          )}

          <ThemedView type="backgroundElement" style={styles.toggleRow}>
            <View style={styles.toggleText}>
              <ThemedText type="smallBold">After-hours / urgent</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                Outside business hours or over a weekend (a surcharge may apply).
              </ThemedText>
            </View>
            <Switch
              value={afterHours}
              onValueChange={setAfterHours}
              trackColor={{ true: BrandPrimary }}
            />
          </ThemedView>

          <Pressable
            onPress={submit}
            disabled={submitting}
            style={[styles.submitBtn, submitting && styles.disabled]}>
            {submitting ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <ThemedText type="smallBold" style={styles.submitText}>
                Submit request
              </ThemedText>
            )}
          </Pressable>
        </View>
      </ScrollView>

      {errorModal && (
        <StatusModal
          visible
          variant="error"
          title="Check your request"
          message={errorModal}
          actions={[{ label: 'OK', onPress: () => setErrorModal(null) }]}
          onRequestClose={() => setErrorModal(null)}
        />
      )}
    </>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  content: { flexDirection: 'row', justifyContent: 'center' },
  inner: {
    flex: 1,
    width: '100%',
    maxWidth: MaxContentWidth,
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.three,
    paddingBottom: BottomTabInset + Spacing.four,
    gap: Spacing.three,
  },
  header: { gap: Spacing.one },
  field: { gap: Spacing.two },
  textarea: { minHeight: 96, textAlignVertical: 'top' },
  catBlock: { gap: Spacing.two, marginTop: Spacing.one },
  catName: { textTransform: 'uppercase', letterSpacing: 0.5 },
  taskRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    borderRadius: Spacing.three,
    padding: Spacing.three,
  },
  check: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkTick: { color: '#ffffff', fontSize: 12, lineHeight: 14 },
  taskName: { flex: 1 },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
    borderRadius: Spacing.three,
    padding: Spacing.three,
  },
  toggleText: { flex: 1, gap: Spacing.half },
  submitBtn: {
    height: 52,
    borderRadius: 14,
    backgroundColor: BrandPrimary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitText: { color: '#ffffff' },
  disabled: { opacity: 0.5 },
  pressed: { opacity: 0.7 },
});
