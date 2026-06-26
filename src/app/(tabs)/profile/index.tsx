import { Image } from 'expo-image';
import { Stack, router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Linking,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { fetchData, postData } from '@/lib/api';
import { tokenStorage } from '@/lib/token-storage';
import { ProfileData } from '@/lib/types';
import { fmtDate } from '@/lib/utils';
import { useAuth } from '@/store/use-auth';

const ROLE_LABELS: Record<string, string> = {
  SUPER_ADMIN: 'Super Admin',
  ADMIN: 'IT Admin',
  MODERATOR: 'Moderator',
  USER: 'Account Owner',
  OWNER: 'Account Owner',
};

function roleLabel(role: string, position: string | null) {
  if (position) return ROLE_LABELS[position] ?? position;
  return ROLE_LABELS[role] ?? role;
}

function initials(first?: string, last?: string) {
  return `${first?.[0] ?? ''}${last?.[0] ?? ''}`.toUpperCase() || '?';
}

function joinLocation(...parts: (string | null | undefined)[]) {
  return parts.filter(Boolean).join(', ');
}

function InfoRow({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <View style={styles.infoRow}>
      <ThemedText type="small" themeColor="textSecondary">
        {label}
      </ThemedText>
      <ThemedText type="small" style={styles.infoValue} numberOfLines={1}>
        {value}
      </ThemedText>
    </View>
  );
}

export default function ProfileScreen() {
  const theme = useTheme();
  const storeUser = useAuth((s) => s.user);
  const clearUser = useAuth((s) => s.clearUser);

  const [data, setData] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  const load = useCallback(async () => {
    try {
      const result = await fetchData<ProfileData>('/user/me');
      setData(result);
      setError(false);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // Reload on focus so edits made on the Edit Profile screen show on return.
  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const onRefresh = () => {
    setRefreshing(true);
    load();
  };

  const handleSignOut = async () => {
    setSigningOut(true);
    const refreshToken = await tokenStorage.getRefreshToken();
    try {
      await postData('/auth/logout', { refreshToken });
    } catch {
      // Clear the local session regardless of the server response.
    }
    await tokenStorage.clear();
    clearUser();
    router.replace('/(auth)/login');
  };

  // Fall back to the cached auth-store user while /user/me loads.
  const firstName = data?.firstName ?? storeUser?.firstName ?? '';
  const lastName = data?.lastName ?? storeUser?.lastName ?? '';
  const email = data?.email ?? storeUser?.email ?? '';
  const image = data?.image ?? storeUser?.image ?? null;
  const role = data?.role ?? storeUser?.role ?? '';

  if (loading && !data) {
    return (
      <ThemedView style={styles.centered}>
        <ActivityIndicator />
      </ThemedView>
    );
  }

  const company = data?.company;

  return (
    <ScrollView
      style={styles.scrollView}
      contentContainerStyle={styles.contentContainer}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
      <Stack.Screen
        options={{
          headerRight: () => (
            <Pressable
              onPress={() => router.push('/(tabs)/profile/edit')}
              hitSlop={8}>
              <ThemedText type="smallBold" themeColor="text">
                Edit
              </ThemedText>
            </Pressable>
          ),
        }}
      />
      <View style={styles.inner}>
        <View style={styles.identity}>
          {image ? (
            <Image source={{ uri: image }} style={styles.avatar} contentFit="cover" />
          ) : (
            <View style={[styles.avatar, styles.avatarFallback]}>
              <ThemedText type="subtitle" style={styles.avatarInitials}>
                {initials(firstName, lastName)}
              </ThemedText>
            </View>
          )}
          <ThemedText type="subtitle" style={styles.name}>
            {firstName} {lastName}
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {email}
          </ThemedText>
          <View style={[styles.roleChip, { backgroundColor: theme.backgroundElement }]}>
            <ThemedText type="small" themeColor="textSecondary">
              {roleLabel(role, data?.adminPosition ?? null)}
            </ThemedText>
          </View>
        </View>

        {error && !data && (
          <ThemedText type="small" themeColor="textSecondary" style={styles.centerText}>
            Couldn&apos;t load the latest details. Pull to refresh.
          </ThemedText>
        )}

        {/* Personal */}
        <View style={styles.section}>
          <ThemedText type="smallBold" style={styles.sectionLabel}>
            Personal
          </ThemedText>
          <ThemedView type="backgroundElement" style={styles.card}>
            <InfoRow label="Phone" value={data?.phoneNumber} />
            <InfoRow label="Username" value={data?.username} />
            <InfoRow
              label="Location"
              value={joinLocation(data?.city, data?.state, data?.country)}
            />
            <InfoRow
              label="Member since"
              value={data?.createdAt ? fmtDate(data.createdAt) : null}
            />
            {!data?.phoneNumber &&
              !data?.username &&
              !data?.city &&
              !data?.createdAt && (
                <ThemedText type="small" themeColor="textSecondary">
                  No additional details on file.
                </ThemedText>
              )}
          </ThemedView>
        </View>

        {/* Company */}
        {company && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <ThemedText type="smallBold" style={styles.sectionLabel}>
                Company
              </ThemedText>
              <Pressable
                onPress={() => router.push('/(tabs)/profile/edit-company')}
                hitSlop={8}>
                <ThemedText type="linkPrimary">Edit</ThemedText>
              </Pressable>
            </View>
            <ThemedView type="backgroundElement" style={styles.card}>
              <InfoRow label="Name" value={company.name} />
              <InfoRow label="Industry" value={company.industry} />
              <InfoRow label="Size" value={company.companySize} />
              <InfoRow label="Phone" value={company.companyPhone} />
              <InfoRow
                label="Location"
                value={joinLocation(company.city, company.state, company.country)}
              />
              <InfoRow label="RC Number" value={company.rcNumber} />
              {!!company.websiteUrl && (
                <Pressable
                  onPress={() => Linking.openURL(company.websiteUrl!)}
                  style={styles.infoRow}>
                  <ThemedText type="small" themeColor="textSecondary">
                    Website
                  </ThemedText>
                  <ThemedText type="link" themeColor="textSecondary" numberOfLines={1}>
                    {company.websiteUrl}
                  </ThemedText>
                </Pressable>
              )}
            </ThemedView>
          </View>
        )}

        {/* Account */}
        <View style={styles.section}>
          <ThemedText type="smallBold" style={styles.sectionLabel}>
            Account
          </ThemedText>
          <ThemedView type="backgroundElement" style={styles.card}>
            <Pressable
              onPress={() => router.push('/(tabs)/profile/change-password')}
              style={({ pressed }) => [styles.actionRow, pressed && styles.pressed]}>
              <ThemedText type="small">Change password</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                ›
              </ThemedText>
            </Pressable>
            <View style={[styles.divider, { backgroundColor: theme.backgroundSelected }]} />
            <Pressable
              onPress={handleSignOut}
              disabled={signingOut}
              style={({ pressed }) => [styles.actionRow, pressed && styles.pressed]}>
              <ThemedText type="small" style={styles.signOut}>
                Sign out
              </ThemedText>
              {signingOut && <ActivityIndicator size="small" color="#e5484d" />}
            </Pressable>
          </ThemedView>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    flexGrow: 1,
    flexDirection: 'row',
    justifyContent: 'center',
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inner: {
    flex: 1,
    width: '100%',
    maxWidth: MaxContentWidth,
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.three,
    paddingBottom: BottomTabInset + Spacing.three,
    gap: Spacing.four,
  },
  identity: {
    alignItems: 'center',
    gap: Spacing.one,
  },
  avatar: {
    width: 88,
    height: 88,
    borderRadius: 44,
    marginBottom: Spacing.one,
  },
  avatarFallback: {
    backgroundColor: '#208AEF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitials: {
    color: '#ffffff',
    fontSize: 32,
    lineHeight: 40,
  },
  name: {
    fontSize: 24,
    lineHeight: 30,
  },
  roleChip: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one,
    borderRadius: Spacing.five,
    marginTop: Spacing.one,
  },
  centerText: {
    textAlign: 'center',
  },
  section: {
    gap: Spacing.two,
  },
  sectionLabel: {
    marginLeft: Spacing.one,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  card: {
    borderRadius: Spacing.three,
    padding: Spacing.three,
    gap: Spacing.two,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.three,
  },
  infoValue: {
    flexShrink: 1,
    textAlign: 'right',
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.one,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginVertical: Spacing.one,
  },
  signOut: {
    color: '#e5484d',
    fontWeight: '700',
  },
  pressed: {
    opacity: 0.6,
  },
});
