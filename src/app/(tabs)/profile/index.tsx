import { Image } from 'expo-image';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ErrorModal } from '@/components/error-modal';
import { StaxisButton, StaxisText } from '@/components/staxis';
import { Colors, Palette, Radius, Spacing } from '@/constants/staxis-theme';
import { fetchData, signOut } from '@/lib/api';
import type { ProfileData } from '@/lib/types';
import { getUserFacingError } from '@/lib/user-facing-error';
import { fmtDate } from '@/lib/utils';
import { useAuth } from '@/store/use-auth';

const ROLE_LABELS: Record<string, string> = {
  SUPER_ADMIN: 'Super Admin', ADMIN: 'IT Admin', MODERATOR: 'Moderator', USER: 'Account Owner', OWNER: 'Account Owner',
};

function roleLabel(role: string, position: string | null) {
  return position ? ROLE_LABELS[position] ?? position : (ROLE_LABELS[role] ?? role) || 'Client account';
}

function initials(first?: string, last?: string) {
  return ((first?.trim().charAt(0) ?? '') + (last?.trim().charAt(0) ?? '')).toUpperCase() || 'S';
}

function joinLocation(...parts: (string | null | undefined)[]) {
  return parts.filter(Boolean).join(', ');
}

function InfoField({ label, value }: { label: string; value?: string | null }) {
  return (
    <View style={styles.infoField}>
      <StaxisText variant="formHint">{label}</StaxisText>
      <StaxisText variant="bodyBase" selectable>{value || 'Not added'}</StaxisText>
    </View>
  );
}

export default function ProfileScreen() {
  const storeUser = useAuth((state) => state.user);
  const [data, setData] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [signingOut, setSigningOut] = useState(false);

  const load = useCallback(async () => {
    try {
      setData(await fetchData<ProfileData>('/user/me'));
      setError(false);
      setErrorMessage(null);
    } catch (failure) {
      setError(true);
      setErrorMessage(getUserFacingError(failure, 'Could not load profile details. Please pull down to retry.'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);
  useFocusEffect(useCallback(() => { void load(); }, [load]));

  const handleSignOut = async () => {
    setSigningOut(true);
    try {
      await signOut();
    } catch {
      setErrorMessage('Could not clear your session on this device. Please try signing out again.');
    } finally { setSigningOut(false); }
  };

  const firstName = data?.firstName ?? storeUser?.firstName ?? '';
  const lastName = data?.lastName ?? storeUser?.lastName ?? '';
  const fullName = [firstName, lastName].filter(Boolean).join(' ') || 'Your profile';
  const email = data?.email ?? storeUser?.email ?? '';
  const image = data?.image ?? storeUser?.image ?? null;
  const role = data?.role ?? storeUser?.role ?? '';
  const company = data?.company;

  if (loading && !data) return <View style={styles.centered}><ActivityIndicator color={Palette.signal} accessibilityLabel="Loading profile" /></View>;

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}
      refreshControl={<RefreshControl refreshing={refreshing} tintColor={Palette.signal} colors={[Palette.signal]} onRefresh={() => { setRefreshing(true); void load(); }} />}>
      <SafeAreaView edges={['bottom']} style={styles.content}>
        <ErrorModal message={errorMessage} onDismiss={() => setErrorMessage(null)} />
        <View style={styles.identity}>
          <View style={styles.identityRow}>
            {image ? <Image source={{ uri: image }} style={styles.avatar} contentFit="cover" accessibilityLabel="Your profile photo" /> : (
              <View style={[styles.avatar, styles.avatarFallback]} accessible={false}><StaxisText variant="displayMd" style={styles.onDark}>{initials(firstName, lastName)}</StaxisText></View>
            )}
            <View style={styles.identityCopy}>
              <StaxisText variant="displayMd" accessibilityRole="header">{fullName}</StaxisText>
              <View style={styles.roleChip}><StaxisText variant="formHint" style={styles.ink}>{roleLabel(role, data?.adminPosition ?? null)}</StaxisText></View>
            </View>
          </View>
          {!!email && <StaxisText variant="bodyBase" selectable>{email}</StaxisText>}
          {!!data?.createdAt && <StaxisText variant="formHint">Member since {fmtDate(data.createdAt)}</StaxisText>}
          <StaxisButton label="Edit profile" size="lg" onPress={() => router.push('/(tabs)/profile/edit')} style={styles.editButton} />
        </View>

        {error && (
          <View style={styles.errorNotice}>
            <StaxisText variant="bodyBase">{data ? 'Your latest details could not be refreshed.' : 'Your profile details could not be loaded.'}</StaxisText>
            <StaxisButton variant="ghost" size="sm" label="Retry loading details" onPress={() => void load()} />
          </View>
        )}

        {data && (
          <>
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <StaxisText variant="cardTitle" accessibilityRole="header">Your company</StaxisText>
                {company && <Pressable accessibilityRole="button" accessibilityLabel="Edit company details" onPress={() => router.push('/(tabs)/profile/edit-company')} style={({ pressed }) => [styles.textAction, pressed && styles.pressed]}><StaxisText variant="cardAction">Edit details →</StaxisText></Pressable>}
              </View>
              {company ? (
                <View style={styles.panel}>
                  <View style={styles.companyHeading}>
                    {company.logoUrl ? <Image source={{ uri: company.logoUrl }} contentFit="contain" style={styles.companyMark} accessibilityLabel="Company logo" /> : (
                      <View style={[styles.companyMark, styles.companyFallback]} accessible={false}><StaxisText variant="displaySm">{company.name.trim().charAt(0) || 'S'}</StaxisText></View>
                    )}
                    <View style={styles.companyCopy}><StaxisText variant="displaySm">{company.name}</StaxisText>{!!company.industry && <StaxisText variant="bodySm">{company.industry}</StaxisText>}</View>
                  </View>
                  <View style={styles.detailsGrid}>
                    <InfoField label="Team size" value={company.companySize} />
                    <InfoField label="Company phone" value={company.companyPhone} />
                    <InfoField label="Location" value={joinLocation(company.city, company.state, company.country)} />
                    <InfoField label="RC number" value={company.rcNumber} />
                  </View>
                </View>
              ) : <View style={styles.panel}><StaxisText variant="bodyBase">No company linked yet</StaxisText><StaxisText variant="bodySm">Your company details will appear here once linked to your account.</StaxisText></View>}
            </View>

            <View style={styles.section}>
              <StaxisText variant="cardTitle" accessibilityRole="header">Personal details</StaxisText>
              <View style={styles.panel}><View style={styles.detailsGrid}>
                <InfoField label="Phone number" value={data.phoneNumber} />
                <InfoField label="Username" value={data.username} />
                <InfoField label="Location" value={joinLocation(data.city, data.state, data.country)} />
              </View></View>
            </View>
          </>
        )}

        <View style={styles.section}>
          <StaxisText variant="cardTitle" accessibilityRole="header">Manage account</StaxisText>
          <View style={styles.accountPanel}>
            <Pressable accessibilityRole="button" onPress={() => router.push('/(tabs)/profile/change-password')} style={({ pressed }) => [styles.actionRow, pressed && styles.pressed]}>
              <View style={styles.actionCopy}><StaxisText variant="bodyBase">Password &amp; security</StaxisText><StaxisText variant="formHint">Change your account password</StaxisText></View>
              <StaxisText variant="displaySm" accessible={false}>›</StaxisText>
            </Pressable>
            <View style={styles.divider} />
            <Pressable accessibilityRole="button" accessibilityState={{ disabled: signingOut, busy: signingOut }} disabled={signingOut} onPress={() => void handleSignOut()} style={({ pressed }) => [styles.actionRow, pressed && styles.pressed, signingOut && styles.disabled]}>
              <View style={styles.actionCopy}><StaxisText variant="bodyBase" style={styles.danger}>{signingOut ? 'Signing out…' : 'Sign out'}</StaxisText><StaxisText variant="formHint">End your session on this device</StaxisText></View>
              {signingOut ? <ActivityIndicator size="small" color={Palette.signal} /> : <StaxisText variant="displaySm" style={styles.danger} accessible={false}>›</StaxisText>}
            </Pressable>
          </View>
        </View>
      </SafeAreaView>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: Colors.bgApp },
  scrollContent: { flexGrow: 1 },
  content: { width: '100%', maxWidth: 800, alignSelf: 'center', paddingHorizontal: Spacing.xl, paddingTop: Spacing.xl, paddingBottom: Spacing.xxxl, gap: Spacing.xxl },
  centered: { flex: 1, backgroundColor: Colors.bgApp, alignItems: 'center', justifyContent: 'center' },
  identity: { gap: Spacing.md, paddingBottom: Spacing.xl, borderBottomWidth: 1, borderBottomColor: Colors.lineStrong },
  identityRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.lg },
  identityCopy: { flex: 1, minWidth: 0, gap: Spacing.sm },
  avatar: { width: Spacing.xxxl + Spacing.xl, height: Spacing.xxxl + Spacing.xl, borderRadius: Radius.pill },
  avatarFallback: { backgroundColor: Palette.ink, alignItems: 'center', justifyContent: 'center' },
  roleChip: { alignSelf: 'flex-start', backgroundColor: Palette.bone2, paddingHorizontal: Spacing.md, paddingVertical: Spacing.xs, borderRadius: Radius.pill },
  onDark: { color: Colors.textOnDark },
  ink: { color: Colors.text },
  editButton: { alignSelf: 'flex-start', minHeight: Spacing.xxxl, borderRadius: Radius.pill, marginTop: Spacing.xs },
  errorNotice: { gap: Spacing.md, padding: Spacing.lg, borderRadius: Radius.md, backgroundColor: Palette.warnTint },
  section: { gap: Spacing.md },
  sectionHeader: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.sm },
  textAction: { minHeight: Spacing.xxxl, justifyContent: 'center' },
  panel: { backgroundColor: Colors.bgCard, borderRadius: Radius.lg, padding: Spacing.xl, gap: Spacing.lg },
  companyHeading: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, paddingBottom: Spacing.lg, borderBottomWidth: 1, borderBottomColor: Colors.line },
  companyMark: { width: Spacing.xxxl, height: Spacing.xxxl, borderRadius: Radius.sm },
  companyFallback: { backgroundColor: Palette.bone2, alignItems: 'center', justifyContent: 'center' },
  companyCopy: { flex: 1, minWidth: 0, gap: Spacing.xs },
  detailsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.lg },
  infoField: { flexGrow: 1, flexBasis: 140, minWidth: 140, gap: Spacing.xs },
  accountPanel: { backgroundColor: Colors.bgCard, borderRadius: Radius.lg, paddingHorizontal: Spacing.xl },
  actionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.md, paddingVertical: Spacing.lg, minHeight: Spacing.xxxl + Spacing.lg },
  actionCopy: { flex: 1, minWidth: 0, gap: Spacing.xs },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: Colors.line },
  danger: { color: Palette.signal },
  pressed: { opacity: 0.7 },
  disabled: { opacity: 0.6 },
});
