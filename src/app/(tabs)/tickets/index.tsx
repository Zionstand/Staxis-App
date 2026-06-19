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

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Badge } from '@/components/ui/badge';
import { ThemedTextInput } from '@/components/ui/themed-text-input';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
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
import { fromNow } from '@/lib/utils';

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
      <Stack.Screen options={{ headerRight: () => <HeaderNewButton /> }} />
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
                          ? theme.text
                          : theme.backgroundElement,
                      },
                    ]}>
                    <ThemedText
                      type="small"
                      style={{ color: active ? theme.background : theme.textSecondary }}>
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
              <ThemedText type="subtitle" style={styles.emptyTitle}>
                No tickets yet
              </ThemedText>
              <ThemedText
                type="small"
                themeColor="textSecondary"
                style={styles.emptyText}>
                {debounced || status
                  ? 'No tickets match your filters.'
                  : 'Need a hand? Open a ticket and our team will get back to you.'}
              </ThemedText>
              <Pressable
                style={styles.emptyButton}
                onPress={() => router.push('/(tabs)/tickets/new')}>
                <ThemedText type="smallBold" style={styles.emptyButtonText}>
                  Create a ticket
                </ThemedText>
              </Pressable>
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
    backgroundColor: '#208AEF',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.four,
    marginTop: Spacing.two,
  },
  emptyButtonText: {
    color: '#ffffff',
  },
});
