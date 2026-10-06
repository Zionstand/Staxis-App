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

import {
  EmptyState,
  StaxisButton,
  StaxisInput,
  StaxisTag,
  StaxisText,
} from '@/components/staxis';
import { Colors, Palette, Radius, Spacing } from '@/constants/staxis-theme';
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

function TicketRow({ ticket }: { ticket: TicketListItem }) {
  const ss = statusStyle(ticket.status);

  return (
    <Pressable
      onPress={() => router.push(`/(tabs)/tickets/${ticket.id}`)}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      <View style={styles.cardTop}>
        <StaxisText variant="tableCellMono">#{ticket.ticketNumber}</StaxisText>
        <StaxisTag
          variant={
            ticket.status === 'RESOLVED' || ticket.status === 'CLOSED'
              ? 'success'
              : ticket.status === 'IN_PROGRESS'
                ? 'warn'
                : ticket.status === 'ON_HOLD'
                  ? 'neutral'
                  : 'info'
          }
          label={statusLabel(ticket.status)}
        />
      </View>

      <StaxisText variant="listTitle" numberOfLines={2}>
        {ticket.subject}
      </StaxisText>

      <View style={styles.cardBottom}>
        <StaxisTag
          variant={
            ticket.priority === 'URGENT'
              ? 'danger'
              : ticket.priority === 'HIGH'
                ? 'warn'
                : 'neutral'
          }
          label={priorityLabel(ticket.priority)}
        />
        <StaxisText variant="listTime">{fromNow(ticket.updatedAt)}</StaxisText>
      </View>
    </Pressable>
  );
}

export default function TicketsListScreen() {
  const [tickets, setTickets] = useState<TicketListItem[]>([]);
  const [status, setStatus] = useState<TicketStatus | undefined>(undefined);
  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(false);

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
        options={{
          headerRight: () => (
            <Pressable
              onPress={() => router.push('/(tabs)/tickets/new')}
              hitSlop={8}
            >
              <StaxisText variant="cardAction">+ New</StaxisText>
            </Pressable>
          ),
        }}
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
            <StaxisInput
              placeholder="Search tickets..."
              autoCapitalize="none"
              value={search}
              onChangeText={setSearch}
              returnKeyType="search"
            />
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.filters}
            >
              {STATUS_FILTERS.map((f) => {
                const active = status === f.value;
                return (
                  <Pressable
                    key={f.label}
                    onPress={() => setStatus(f.value)}
                    style={[
                      styles.chip,
                      active ? styles.chipActive : styles.chipInactive,
                    ]}
                  >
                    <StaxisText
                      variant="tag"
                      style={{
                        color: active ? Palette.bone : Colors.text2,
                      }}
                    >
                      {f.label}
                    </StaxisText>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        }
        ListEmptyComponent={
          loading ? (
            <View style={styles.centered}>
              <ActivityIndicator color={Palette.signal} />
            </View>
          ) : error ? (
            <EmptyState
              title="Couldn't load tickets"
              message="Check your connection and try again."
              action={{ label: 'Retry', onPress: load }}
            />
          ) : (
            <EmptyState
              title="No tickets"
              message={
                debounced || status
                  ? 'No tickets match your filters.'
                  : 'Need help? Open a ticket and our team will respond.'
              }
              action={{
                label: 'Create a ticket',
                onPress: () => router.push('/(tabs)/tickets/new'),
              }}
            />
          )
        }
      />
    </>
  );
}

const styles = StyleSheet.create({
  list: { flex: 1, backgroundColor: Colors.bgApp },
  listContent: {
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.xxxl,
    gap: Spacing.md,
    flexGrow: 1,
  },
  header: { gap: Spacing.md, paddingTop: Spacing.lg },
  filters: { gap: Spacing.sm },
  chip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderRadius: Radius.pill,
  },
  chipActive: { backgroundColor: Palette.ink },
  chipInactive: { backgroundColor: Palette.bone2 },
  card: {
    backgroundColor: Colors.bgCard,
    borderWidth: 1,
    borderColor: Colors.line,
    borderRadius: Radius.md,
    padding: Spacing.lg,
    gap: Spacing.sm,
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
    gap: Spacing.sm,
  },
  pressed: { opacity: 0.85, transform: [{ translateY: 1 }] },
  centered: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: Spacing.xxxl,
  },
});
