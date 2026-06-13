import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Alert,
  ScrollView, StatusBar, SafeAreaView, Switch, Clipboard,
} from 'react-native';
import { auth, signOut } from '../../src/auth';
import { useRouter } from 'expo-router';
import { useAuth } from '../../src/hooks/useAuth';
import { colors, fonts, radius, spacing, shadow } from '../../src/theme';

export default function Profile() {
  const router = useRouter();
  const { user, profile, isAdmin } = useAuth();
  const [notifs, setNotifs] = useState(true);

  const name    = profile?.displayName || user?.displayName || 'Member';
  const email   = profile?.email       || user?.email || '';
  const initial = name[0]?.toUpperCase() || '?';
  const uid     = user?.uid || '';
  const joined  = profile?.joinedAt?.toDate
    ? profile.joinedAt.toDate().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    : 'Recently';

  function copyUID() {
    Clipboard.setString(uid);
    Alert.alert('Copied', 'Your UID has been copied to clipboard.');
  }

  async function logout() {
    Alert.alert('Log Out', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Log Out', style: 'destructive',
        onPress: async () => { await signOut(auth); router.replace('/auth'); },
      },
    ]);
  }

  return (
    <View style={s.root}>
      <StatusBar barStyle="light-content" />
      <SafeAreaView style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

          {/* Avatar */}
          <View style={s.profileTop}>
            <View style={s.avatar}>
              <Text style={s.avatarTxt}>{initial}</Text>
            </View>
            <Text style={s.name}>{name}{isAdmin ? ' 👑' : ''}</Text>
            <Text style={s.email}>{email}</Text>
            {isAdmin && (
              <View style={s.adminBadge}>
                <Text style={s.adminBadgeTxt}>ADMIN</Text>
              </View>
            )}
          </View>

          {/* Stats */}
          <View style={s.statsRow}>
            <StatBox label="Member Since" value={joined} />
            <View style={s.statDivider} />
            <StatBox label="Status" value="Active" accent />
          </View>

          {/* UID */}
          {uid ? (
            <>
              <Text style={s.sectionLabel}>Your ID</Text>
              <TouchableOpacity style={s.uidCard} onPress={copyUID} activeOpacity={0.7}>
                <Text style={s.uidText} numberOfLines={1} ellipsizeMode="middle">{uid}</Text>
                <Text style={s.uidCopy}>Copy</Text>
              </TouchableOpacity>
            </>
          ) : null}

          {/* Settings */}
          <Text style={s.sectionLabel}>Settings</Text>
          <View style={[s.card, shadow.card]}>
            <SettingRow
              label="Push Notifications"
              sub="Live alerts and messages"
              right={
                <Switch
                  value={notifs}
                  onValueChange={setNotifs}
                  trackColor={{ true: colors.accent, false: '#1a1a1a' }}
                  thumbColor={notifs ? '#000' : colors.textMuted}
                />
              }
            />
          </View>

          {isAdmin && (
            <>
              <Text style={s.sectionLabel}>Admin</Text>
              <View style={[s.card, shadow.card]}>
                <SettingRow label="Admin Panel" sub="Send announcements, manage users" onPress={() => router.push('/admin')} arrow />
              </View>
            </>
          )}

          <Text style={s.sectionLabel}>About</Text>
          <View style={[s.card, shadow.card]}>
            <SettingRow label="Version" right={<Text style={s.verTxt}>1.0.0</Text>} />
            <View style={s.divider} />
            <SettingRow label="Terms & Privacy" arrow onPress={() => router.push('/terms')} />
          </View>

          <TouchableOpacity style={s.logoutBtn} onPress={logout}>
            <Text style={s.logoutTxt}>Log Out</Text>
          </TouchableOpacity>

          <View style={{ height: 32 }} />
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

function StatBox({ label, value, accent }) {
  return (
    <View style={st.box}>
      <Text style={[st.value, accent && st.valueAccent]}>{value}</Text>
      <Text style={st.label}>{label}</Text>
    </View>
  );
}

function SettingRow({ label, sub, right, onPress, arrow }) {
  const Inner = (
    <View style={sr.row}>
      <View style={{ flex: 1 }}>
        <Text style={sr.label}>{label}</Text>
        {sub && <Text style={sr.sub}>{sub}</Text>}
      </View>
      {right ? right : arrow ? <Text style={sr.arrow}>›</Text> : null}
    </View>
  );
  return onPress ? <TouchableOpacity onPress={onPress} activeOpacity={0.7}>{Inner}</TouchableOpacity> : Inner;
}

const s = StyleSheet.create({
  root:       { flex: 1, backgroundColor: '#000' },
  scroll:     { paddingHorizontal: spacing.lg, paddingTop: spacing.lg },
  profileTop: { alignItems: 'center', marginBottom: spacing.xl },
  avatar: {
    width: 88, height: 88, borderRadius: 44,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(0,255,135,0.1)',
    borderWidth: 2, borderColor: 'rgba(0,255,135,0.3)',
    marginBottom: spacing.md,
  },
  avatarTxt:     { fontSize: 32, color: colors.accent, fontWeight: '700' },
  name:          { fontSize: 24, color: '#FFF', fontWeight: '700', marginBottom: 4 },
  email:         { fontSize: 14, color: colors.textMuted, marginBottom: spacing.sm },
  adminBadge:    { backgroundColor: 'rgba(0,255,135,0.12)', borderRadius: radius.full, paddingHorizontal: 14, paddingVertical: 4, borderWidth: 1, borderColor: 'rgba(0,255,135,0.25)' },
  adminBadgeTxt: { fontSize: 10, color: colors.accent, letterSpacing: 2, fontWeight: '700' },
  statsRow:      { flexDirection: 'row', backgroundColor: '#0D0D0D', borderRadius: radius.lg, borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)', marginBottom: spacing.xl, overflow: 'hidden' },
  statDivider:   { width: 1, backgroundColor: 'rgba(255,255,255,0.07)' },
  sectionLabel:  { fontSize: 11, color: colors.textMuted, letterSpacing: 2, textTransform: 'uppercase', marginBottom: spacing.sm, fontWeight: '600' },
  card:          { backgroundColor: '#0D0D0D', borderRadius: radius.lg, borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)', paddingHorizontal: spacing.md, marginBottom: spacing.xl },
  divider:       { height: 1, backgroundColor: 'rgba(255,255,255,0.07)' },
  verTxt:        { fontSize: 14, color: colors.textMuted },
  uidCard:       { backgroundColor: '#0D0D0D', borderRadius: radius.lg, borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)', paddingHorizontal: spacing.md, paddingVertical: 14, flexDirection: 'row', alignItems: 'center', marginBottom: spacing.xl, gap: 10 },
  uidText:       { flex: 1, fontSize: 12, color: '#555', fontFamily: 'monospace' },
  uidCopy:       { fontSize: 12, color: colors.accent, fontWeight: '700' },
  logoutBtn:     { height: 52, backgroundColor: 'rgba(255,75,75,0.08)', borderRadius: radius.lg, borderWidth: 1, borderColor: 'rgba(255,75,75,0.2)', alignItems: 'center', justifyContent: 'center', marginBottom: spacing.md },
  logoutTxt:     { fontSize: 15, color: colors.danger, fontWeight: '600' },
});

const st = StyleSheet.create({
  box:         { flex: 1, padding: spacing.md, alignItems: 'center' },
  value:       { fontSize: 16, color: '#FFF', fontWeight: '700', marginBottom: 2 },
  valueAccent: { color: colors.accent },
  label:       { fontSize: 11, color: colors.textMuted, textAlign: 'center' },
});

const sr = StyleSheet.create({
  row:   { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, gap: spacing.sm, minHeight: 52 },
  label: { fontSize: 15, color: '#FFF', marginBottom: 1, fontWeight: '500' },
  sub:   { fontSize: 12, color: colors.textMuted },
  arrow: { fontSize: 20, color: colors.textFaint },
});
