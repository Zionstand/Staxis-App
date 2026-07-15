import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { Stack, router } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';

import { BrandTitle } from '@/components/logo';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Badge } from '@/components/ui/badge';
import { BrandPrimary, MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { fetchData } from '@/lib/api';
import { Manager } from '@/lib/types';
import { fmtDate } from '@/lib/utils';

const POSITION_LABELS: Record<string, string> = {
  SUPER_ADMIN: 'Super Admin',
  ADMIN: 'IT Admin',
  MODERATOR: 'Moderator',
};

function initials(first?: string, last?: string) {
  return `${first?.[0] ?? ''}${last?.[0] ?? ''}`.toUpperCase() || '?';
}

function ContactRow({
  icon,
  value,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  value: string;
  onPress: () => void;
}) {
  const theme = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.contactRow, pressed && styles.pressed]}>
      <Ionicons name={icon} size={16} color={theme.primary} />
      <ThemedText type="small" themeColor="textSecondary" numberOfLines={1} style={styles.flexShrink}>
        {value}
      </ThemedText>
    </Pressable>
  );
}

function ManagerCard({ manager }: { manager: Manager }) {
  const theme = useTheme();
  const name = `${manager.firstName} ${manager.lastName}`;

  return (
    <ThemedView type="backgroundElement" style={styles.card}>
      <View style={styles.headerRow}>
        {manager.image ? (
          <Image source={{ uri: manager.image }} style={styles.avatar} contentFit="cover" />
        ) : (
          <View style={[styles.avatar, styles.avatarFallback]}>
            <ThemedText type="subtitle" style={styles.avatarInitials}>
              {initials(manager.firstName, manager.lastName)}
            </ThemedText>
          </View>
        )}
        <View style={styles.flexShrink}>
          <ThemedText type="smallBold" numberOfLines={1}>
            {name}
          </ThemedText>
          <View style={styles.badgeRow}>
            <Badge
              label={POSITION_LABELS[manager.position] ?? manager.position}
              bg={theme.primarySoft}
              color={theme.primary}
            />
          </View>
          <ThemedText type="small" themeColor="textSecondary">
            Assigned {fmtDate(manager.assignedAt)}
          </ThemedText>
        </View>
      </View>

      <View style={styles.contacts}>
        <ContactRow
          icon="mail-outline"
          value={manager.email}
          onPress={() => Linking.openURL(`mailto:${manager.email}`)}
        />
        {manager.phoneNumber && (
          <ContactRow
            icon="call-outline"
            value={manager.phoneNumber}
            onPress={() => Linking.openURL(`tel:${manager.phoneNumber}`)}
          />
        )}
      </View>

      <Pressable
        onPress={() =>
          router.push({
            pathname: '/(tabs)/tickets/new',
            params: { subject: `Message for ${name}` },
          })
        }
        style={({ pressed }) => [styles.messageButton, pressed && styles.pressed]}>
        <Ionicons name="chatbubble-ellipses-outline" size={16} color="#ffffff" />
        <ThemedText type="smallBold" style={styles.messageButtonText}>
          Send a message
        </ThemedText>
      </Pressable>
    </ThemedView>
  );
}

export default function ITManagerScreen() {
  const theme = useTheme();
  const [managers, setManagers] = useState<Manager[] | null>(null);
  const [error, setError] = useState(false);

  const load = () => {
    setError(false);
    fetchData<{ managers: Manager[] }>('/user/my-managers')
      .then((res) => setManagers(res.managers))
      .catch(() => setError(true));
  };

  useEffect(() => {
    load();
  }, []);

  return (
    <ScrollView contentContainerStyle={styles.scrollContent}>
      <Stack.Screen
        options={{
          title: 'IT Manager',
          headerTitle: ({ children }) => <BrandTitle title={children} />,
        }}
      />

      {managers === null && !error ? (
        <View style={styles.centered}>
          <ActivityIndicator />
        </View>
      ) : error ? (
        <View style={styles.centered}>
          <ThemedText type="default" themeColor="textSecondary">
            Couldn&apos;t load your IT manager.
          </ThemedText>
          <Pressable onPress={load}>
            <ThemedText type="linkPrimary">Try again</ThemedText>
          </Pressable>
        </View>
      ) : managers && managers.length > 0 ? (
        <>
          <ThemedText type="small" themeColor="textSecondary">
            Your dedicated support contact{managers.length > 1 ? 's' : ''} for technical help.
          </ThemedText>
          {managers.map((m) => (
            <ManagerCard key={m.id} manager={m} />
          ))}
        </>
      ) : (
        <View style={styles.centered}>
          <View style={[styles.emptyIcon, { backgroundColor: theme.backgroundElement }]}>
            <Ionicons name="person-outline" size={26} color={theme.textSecondary} />
          </View>
          <ThemedText type="smallBold">No IT manager assigned yet</ThemedText>
          <ThemedText type="small" themeColor="textSecondary" style={styles.emptyText}>
            Your dedicated IT manager will appear here once our team assigns one. In
            the meantime, you can open a support ticket.
          </ThemedText>
          <Pressable
            onPress={() => router.push('/(tabs)/tickets/new')}
            style={({ pressed }) => [styles.messageButton, pressed && styles.pressed]}>
            <ThemedText type="smallBold" style={styles.messageButtonText}>
              Open a support ticket
            </ThemedText>
          </Pressable>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.three,
    paddingBottom: Spacing.six,
    gap: Spacing.three,
    flexGrow: 1,
  },
  centered: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    paddingTop: Spacing.six,
  },
  emptyIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.one,
  },
  emptyText: {
    textAlign: 'center',
    maxWidth: 300,
    marginBottom: Spacing.two,
  },
  card: {
    borderRadius: Spacing.three,
    padding: Spacing.three,
    gap: Spacing.three,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
  },
  avatarFallback: {
    backgroundColor: BrandPrimary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitials: {
    color: '#ffffff',
    fontSize: 22,
    lineHeight: 28,
  },
  badgeRow: {
    flexDirection: 'row',
    marginVertical: Spacing.half,
  },
  contacts: {
    gap: Spacing.two,
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  flexShrink: {
    flexShrink: 1,
  },
  messageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    height: 46,
    borderRadius: 12,
    backgroundColor: BrandPrimary,
    paddingHorizontal: Spacing.four,
  },
  messageButtonText: {
    color: '#ffffff',
  },
  pressed: {
    opacity: 0.6,
  },
});
