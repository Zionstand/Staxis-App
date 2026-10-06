import { Image } from 'expo-image';
import { Stack, router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';

import {
  EmptyState,
  SectionLabel,
  StaxisCard,
  StaxisText,
} from '@/components/staxis';
import { Colors, Palette, Radius, Spacing } from '@/constants/staxis-theme';
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
      <StaxisText variant="listSub">{label}</StaxisText>
      <StaxisText variant="listTitle" style={styles.infoValue} numberOfLines={1}>
        {value}
      </StaxisText>
    </View>
  );
}

export default function ProfileScreen() {
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
      /* clear local session regardless */
    }
    await tokenStorage.clear();
    clearUser();
    router.replace('/(auth)/login');
  };

  const firstName = data?.firstName ?? storeUser?.firstName ?? '';
  const lastName = data?.lastName ?? storeUser?.lastName ?? '';
  const email = data?.email ?? storeUser?.email ?? '';
  const image = data?.image ?? storeUser?.image ?? null;
  const role = data?.role ?? storeUser?.role ?? '';

  if (loading && !data) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={Palette.signal} />
      </View>
    );
  }

  const company = data?.company;

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      <Stack.Screen
        options={{
          headerRight: () => (
            <Pressable
              onPress={() => router.push('/(tabs)/profile/edit')}
              hitSlop={8}
            >
              <StaxisText variant="cardAction">Edit</StaxisText>
            </Pressable>
          ),
        }}
      />

      {/* Identity */}
      <View style={styles.identity}>
        {image ? (
          <Image source={{ uri: image }} style={styles.avatar} contentFit="cover" />
        ) : (
          <View style={[styles.avatar, styles.avatarFallback]}>
            <StaxisText
              variant="displaySm"
              style={{ color: Palette.bone }}
            >
              {initials(firstName, lastName)}
            </StaxisText>
          </View>
        )}
        <StaxisText variant="displaySm">{firstName} {lastName}</StaxisText>
        <StaxisText variant="bodySm">{email}</StaxisText>
        <View style={styles.roleChip}>
          <StaxisText variant="tag" style={{ color: Colors.text2 }}>
            {roleLabel(role, data?.adminPosition ?? null)}
          </StaxisText>
        </View>
      </View>

      {error && !data && (
        <StaxisText variant="formHint" style={{ textAlign: 'center' }}>
          Couldn&apos;t load the latest details. Pull to refresh.
        </StaxisText>
      )}

      {/* Personal */}
      <View style={styles.section}>
        <SectionLabel>Personal</SectionLabel>
        <StaxisCard>
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
              <StaxisText variant="bodySm">
                No additional details on file.
              </StaxisText>
            )}
        </StaxisCard>
      </View>

      {/* Company */}
      {company && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <SectionLabel>Company</SectionLabel>
            <Pressable
              onPress={() => router.push('/(tabs)/profile/edit-company')}
              hitSlop={8}
            >
              <StaxisText variant="cardAction">Edit</StaxisText>
            </Pressable>
          </View>
          <StaxisCard>
            <InfoRow label="Name" value={company.name} />
            <InfoRow label="Industry" value={company.industry} />
            <InfoRow label="Size" value={company.companySize} />
            <InfoRow label="Phone" value={company.companyPhone} />
            <InfoRow
              label="Location"
              value={joinLocation(company.city, company.state, company.country)}
            />
            <InfoRow label="RC Number" value={company.rcNumber} />
          </StaxisCard>
        </View>
      )}

      {/* Account */}
      <View style={styles.section}>
        <SectionLabel>Account</SectionLabel>
        <StaxisCard>
          <Pressable
            onPress={() => router.push('/(tabs)/profile/change-password')}
            style={({ pressed }) => [
              styles.actionRow,
              pressed && styles.pressed,
            ]}
          >
            <StaxisText variant="bodyBase">Change password</StaxisText>
            <StaxisText variant="bodyBase" style={{ color: Colors.text3 }}>
              ›
            </StaxisText>
          </Pressable>
          <View style={styles.divider} />
          <Pressable
            onPress={handleSignOut}
            disabled={signingOut}
            style={({ pressed }) => [
              styles.actionRow,
              pressed && styles.pressed,
            ]}
          >
            <StaxisText variant="bodyBase" style={{ color: Palette.signal }}>
              Sign out
            </StaxisText>
            {signingOut && (
              <ActivityIndicator size="small" color={Palette.signal} />
            )}
          </Pressable>
        </StaxisCard>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: Colors.bgApp },
  content: {
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.xxxl,
    gap: Spacing.xl,
  },
  centered: {
    flex: 1,
    backgroundColor: Colors.bgApp,
    alignItems: 'center',
    justifyContent: 'center',
  },
  identity: { alignItems: 'center', gap: Spacing.xs },
  avatar: {
    width: 88,
    height: 88,
    borderRadius: 44,
    marginBottom: Spacing.xs,
  },
  avatarFallback: {
    backgroundColor: Palette.signal,
    alignItems: 'center',
    justifyContent: 'center',
  },
  roleChip: {
    backgroundColor: Palette.bone2,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: Radius.pill,
    marginTop: Spacing.xs,
  },
  section: { gap: Spacing.sm },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.lg,
    paddingVertical: Spacing.xs,
  },
  infoValue: { flexShrink: 1, textAlign: 'right' },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.xs,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: Colors.line,
    marginVertical: Spacing.xs,
  },
  pressed: { opacity: 0.6 },
});
