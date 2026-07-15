import { Stack, router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';

import { Mark } from '@/components/logo';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Badge } from '@/components/ui/badge';
import { ThemedTextInput } from '@/components/ui/themed-text-input';
import { BrandPrimary, BrandPrimaryForeground, BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { useSubscription } from '@/hooks/use-subscription';
import { useTheme } from '@/hooks/use-theme';
import { fetchData } from '@/lib/api';
import {
  STATUS_FILTERS,
  categoryLabel,
  priorityLabel,
  priorityStyle,
  statusLabel,
  statusStyle,
} from '@/lib/tickets';
import { TicketListItem, TicketStatus } from '@/lib/types';
import { fmtDate, fromNow } from '@/lib/utils';

function HeaderNewButton() {
  return (
    <Pressable
      onPress={() => router.push('/(tabs)/tickets/new')}
      hitSlop={8}>
      <ThemedText type="smallBold" themeColor="text">
        + New
      </ThemedText>
    </Pressable>
  );
}

// PAST_DUE but still in grace: tickets keep working, but nudge to settle before
// the window closes and access is cut off.
function GraceBanner({ endsAt, daysLeft }: { endsAt: string | null; daysLeft: number | null }) {
  const detail =
    endsAt !== null
      ? `Renew by ${fmtDate(endsAt)}${daysLeft !== null ? ` (${daysLeft}d left)` : ''} to keep support access.`
      : 'Renew soon to keep support access.';
  return (
    <ThemedView style={styles.graceCard}>
      <ThemedText type="smallBold" style={styles.graceTitle}>
        ⚠️ Payment past due
      </ThemedText>
      <ThemedText type="small" style={styles.graceText}>
        {detail}
      </ThemedText>
      <Pressable
        onPress={() => router.push('/(tabs)/billing/subscribe')}
        style={({ pressed }) => [styles.graceButton, pressed && styles.pressed]}>
        <ThemedText type="smallBold" style={styles.upsellButtonText}>
          Settle payment →
        </ThemedText>
      </Pressable>
    </ThemedView>
  );
}

// Shown when the subscription doesn't allow opening tickets. Reads stay open, so
// this sits above the (still-visible) ticket history and routes to billing.
function UpsellBanner({ message }: { message: string }) {
  return (
    <ThemedView style={styles.upsellCard}>
      <ThemedText type="smallBold" style={styles.upsellTitle}>
        🔒 Subscription required
      </ThemedText>
      <ThemedText type="small" style={styles.upsellText}>
        {message || 'Subscribe to open a support ticket.'}
      </ThemedText>
      <Pressable
        onPress={() => router.push('/(tabs)/billing/subscribe')}
        style={({ pressed }) => [styles.upsellButton, pressed && styles.pressed]}>
        <ThemedText type="smallBold" style={styles.upsellButtonText}>
          View plans →
        </ThemedText>
      </Pressable>
      {/* Billing/account issues are always reachable, even while lapsed. */}
      <Pressable
        onPress={() =>
          router.push({ pathname: '/(tabs)/tickets/new', params: { billing: '1' } })
        }
        style={styles.billingLink}>
        <ThemedText type="small" style={styles.upsellText}>
          Have a billing or payment issue? Contact us →
        </ThemedText>
      </Pressable>
    </ThemedView>
  );
}

function TicketRow({ ticket }: { ticket: TicketListItem }) {
  const ss = statusStyle(ticket.status);
  const ps = priorityStyle(ticket.priority);

  return (
    <Pressable
      onPress={() => router.push(`/(tabs)/tickets/${ticket.id}`)}
      style={({ pressed }) => pressed && styles.pressed}>
      <ThemedView type="backgroundElement" style={styles.card}>
        <View style={styles.cardTop}>
          <ThemedText type="small" themeColor="textSecondary">
            #{ticket.ticketNumber}
          </ThemedText>
          <Badge label={statusLabel(ticket.status)} bg={ss.bg} color={ss.color} />
        </View>

        <ThemedText type="smallBold" numberOfLines={2}>
          {ticket.subject}
        </ThemedText>

        <View style={styles.cardBottom}>
          <View style={styles.cardMeta}>
            <Badge
              label={priorityLabel(ticket.priority)}
              bg={ps.bg}
              color={ps.color}
            />
            <ThemedText type="small" themeColor="textSecondary">
              {categoryLabel(ticket.category)}
            </ThemedText>
          </View>
          <ThemedText type="small" themeColor="textSecondary">
            {fromNow(ticket.updatedAt)}
          </ThemedText>
        </View>
      </ThemedView>
    </Pressable>
  );
}

export default function TicketsListScreen() {
  const theme = useTheme();
  const { canCreateTickets, inGrace, graceEndsAt, graceDaysLeft, message } =
    useSubscription();

  const [tickets, setTickets] = useState<TicketListItem[]>([]);
  const [status, setStatus] = useState<TicketStatus | undefined>(undefined);
  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(false);

  // Debounce the search box so we don't hit the API on every keystroke.
  useEffect(() => {
    const t = setTimeout(() => setDebounced(search.trim()), 350);
    return () => clearTimeout(t);
  }, [search]);

  const load = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (status) params.append('status', status);
      if (debounced) params.append('search', debounced);
      const qs = params.toString();
      const result = await fetchData<TicketListItem[]>(
        `/tickets/my${qs ? `?${qs}` : ''}`,
      );
      setTickets(result);
      setError(false);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [status, debounced]);

  // Reload on focus (e.g. returning from a reply/new ticket) and on filter change.
  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const onRefresh = () => {
    setRefreshing(true);
    load();
  };

  return (
    <>
      <Stack.Screen
        options={{ headerRight: () => (canCreateTickets ? <HeaderNewButton /> : null) }}
      />
      <FlatList
        data={tickets}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <TicketRow ticket={item} />}
        style={styles.list}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListHeaderComponent={
          <View style={styles.header}>
            {!canCreateTickets && <UpsellBanner message={message} />}
            {canCreateTickets && inGrace && (
              <GraceBanner endsAt={graceEndsAt} daysLeft={graceDaysLeft} />
            )}
            <ThemedTextInput
              placeholder="Search tickets"
              autoCapitalize="none"
              value={search}
              onChangeText={setSearch}
              returnKeyType="search"
            />
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.filters}>
              {STATUS_FILTERS.map((f) => {
                const active = status === f.value;
                return (
                  <Pressable
                    key={f.label}
                    onPress={() => setStatus(f.value)}
                    style={[
                      styles.chip,
                      {
                        backgroundColor: active
                          ? BrandPrimary
                          : theme.backgroundElement,
                      },
                    ]}>
                    <ThemedText
                      type="small"
                      style={{ color: active ? BrandPrimaryForeground : theme.textSecondary }}>
                      {f.label}
                    </ThemedText>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        }
        ListEmptyComponent={
          loading ? (
            <View style={styles.centered}>
              <ActivityIndicator />
            </View>
          ) : error ? (
            <View style={styles.centered}>
              <ThemedText type="default" themeColor="textSecondary">
                Couldn&apos;t load your tickets.
              </ThemedText>
              <Pressable onPress={load}>
                <ThemedText type="linkPrimary">Try again</ThemedText>
              </Pressable>
            </View>
          ) : (
            <View style={styles.centered}>
              <Mark size={56} style={styles.emptyMark} />
              <ThemedText type="subtitle" style={styles.emptyTitle}>
                No tickets yet
              </ThemedText>
              <ThemedText
                type="small"
                themeColor="textSecondary"
                style={styles.emptyText}>
                {debounced || status
                  ? 'No tickets match your filters.'
                  : canCreateTickets
                    ? 'Need a hand? Open a ticket and our team will get back to you.'
                    : 'Subscribe to open a ticket and our team will get back to you.'}
              </ThemedText>
              {canCreateTickets ? (
                <Pressable
                  style={styles.emptyButton}
                  onPress={() => router.push('/(tabs)/tickets/new')}>
                  <ThemedText type="smallBold" style={styles.emptyButtonText}>
                    Create a ticket
                  </ThemedText>
                </Pressable>
              ) : (
                <Pressable
                  style={styles.emptyButton}
                  onPress={() => router.push('/(tabs)/billing/subscribe')}>
                  <ThemedText type="smallBold" style={styles.emptyButtonText}>
                    View plans
                  </ThemedText>
                </Pressable>
              )}
            </View>
          )
        }
      />
    </>
  );
}

const styles = StyleSheet.create({
  list: {
    flex: 1,
  },
  listContent: {
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    paddingHorizontal: Spacing.four,
    paddingBottom: BottomTabInset + Spacing.four,
    gap: Spacing.three,
    flexGrow: 1,
  },
  header: {
    gap: Spacing.three,
    paddingTop: Spacing.three,
  },
  upsellCard: {
    borderRadius: Spacing.three,
    padding: Spacing.three,
    gap: Spacing.one,
    backgroundColor: '#fffbeb',
    borderWidth: 1,
    borderColor: '#fde68a',
  },
  upsellTitle: {
    color: '#92400e',
  },
  upsellText: {
    color: '#b45309',
  },
  upsellButton: {
    alignSelf: 'flex-start',
    height: 40,
    borderRadius: 10,
    paddingHorizontal: Spacing.three,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.one,
    backgroundColor: BrandPrimary,
  },
  upsellButtonText: {
    color: '#ffffff',
  },
  billingLink: {
    marginTop: Spacing.two,
  },
  graceCard: {
    borderRadius: Spacing.three,
    padding: Spacing.three,
    gap: Spacing.one,
    backgroundColor: '#fff1f2',
    borderWidth: 1,
    borderColor: '#fecdd3',
  },
  graceTitle: {
    color: '#9f1239',
  },
  graceText: {
    color: '#be123c',
  },
  graceButton: {
    alignSelf: 'flex-start',
    height: 40,
    borderRadius: 10,
    paddingHorizontal: Spacing.three,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.one,
    backgroundColor: '#be123c',
  },
  filters: {
    gap: Spacing.two,
    paddingRight: Spacing.four,
  },
  chip: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one,
    borderRadius: Spacing.five,
  },
  card: {
    borderRadius: Spacing.three,
    padding: Spacing.three,
    gap: Spacing.two,
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  cardMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    flexShrink: 1,
  },
  pressed: {
    opacity: 0.7,
  },
  centered: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: Spacing.six,
    gap: Spacing.two,
  },
  emptyMark: {
    opacity: 0.55,
    marginBottom: Spacing.two,
  },
  emptyTitle: {
    fontSize: 22,
    lineHeight: 28,
  },
  emptyText: {
    textAlign: 'center',
    maxWidth: 280,
  },
  emptyButton: {
    height: 48,
    borderRadius: 12,
    backgroundColor: BrandPrimary,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.four,
    marginTop: Spacing.two,
  },
  emptyButtonText: {
    color: '#ffffff',
  },
});
