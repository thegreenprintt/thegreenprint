import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  StatusBar, SafeAreaView, Linking, RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { doc, onSnapshot, collection, query, orderBy, limit, getDoc } from 'firebase/firestore';
import { db } from '../../src/firebase';
import { useAuth } from '../../src/hooks/useAuth';
import { registerForPushNotifications } from '../../src/hooks/useNotifications';
import { colors, radius } from '../../src/theme';

const MINDSET = [
  "Discipline is the bridge between goals and accomplishment.",
  "The market rewards patience. Trade the plan, not the emotion.",
  "Every loss is a lesson. Every win is a confirmation.",
  "Risk management isn't optional — it's the whole game.",
  "Your edge is consistency. Show up every single day.",
  "The best trade is sometimes no trade at all.",
  "Process over profits. The results will follow.",
];

const dailyQuote = MINDSET[new Date().getDay() % MINDSET.length];

export default function Home() {
  const router = useRouter();
  const { user, profile, isAdmin } = useAuth();
  const [isLive,        setIsLive]        = useState(false);
  const [liveTitle,     setLiveTitle]     = useState('');
  const [announcements, setAnnouncements] = useState([]);
  const [refreshing,    setRefreshing]    = useState(false);

  // Register push notifications when user logs in
  useEffect(() => {
    if (!user) return;
    registerForPushNotifications(user.uid);
  }, [user]);

  // Stream status — NO auth guard so the live banner shows for everyone
  useEffect(() => {
    const unsub = onSnapshot(
      doc(db, 'stream', 'status'),
      (snap) => {
        if (snap.exists()) {
          setIsLive(snap.data().isLive || false);
          setLiveTitle(snap.data().title || 'Live Now');
        } else {
          setIsLive(false);
        }
      },
      () => { /* silently ignore errors */ },
    );
    return unsub;
  }, []); // no dependency on user — runs immediately on mount

  // Announcements — only load when authenticated
  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, 'announcements'), orderBy('createdAt', 'desc'), limit(5));
    const unsub = onSnapshot(q, (snap) => {
      setAnnouncements(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, () => {});
    return unsub;
  }, [user]);

  // Pull-to-refresh — force re-read stream status
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      const snap = await getDoc(doc(db, 'stream', 'status'));
      if (snap.exists()) {
        setIsLive(snap.data().isLive || false);
        setLiveTitle(snap.data().title || 'Live Now');
      } else {
        setIsLive(false);
      }
    } catch (_) {}
    setRefreshing(false);
  }, []);

  const name = profile?.displayName || user?.displayName || '';

  return (
    <View style={s.root}>
      <StatusBar barStyle="light-content" />
      <SafeAreaView style={{ flex: 1 }}>
        <ScrollView
          contentContainerStyle={s.scroll}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.accent}
              colors={[colors.accent]}
            />
          }
        >

          {/* Header */}
          <View style={s.header}>
            <View>
              <Text style={s.logoLabel}>THE GREENPRINT</Text>
              {name ? <Text style={s.greeting}>Welcome back, {name} 👋</Text> : null}
            </View>
            {isAdmin && (
              <TouchableOpacity style={s.adminBtn} onPress={() => router.push('/admin')}>
                <Text style={s.adminTxt}>👑 Admin</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Live Banner */}
          {isLive ? (
            <TouchableOpacity style={s.liveBanner} onPress={() => router.push('/(tabs)/live')} activeOpacity={0.85}>
              <View style={s.livePill}>
                <View style={s.liveDot} />
                <Text style={s.livePillTxt}>LIVE NOW</Text>
              </View>
              <Text style={s.liveTitle}>{liveTitle}</Text>
              <Text style={s.liveAction}>Tap to Join Stream →</Text>
            </TouchableOpacity>
          ) : (
            <View style={s.offlineBanner}>
              <Text style={s.offlineIcon}>◎</Text>
              <Text style={s.offlineTitle}>Not streaming yet</Text>
              <Text style={s.offlineSub}>You'll be notified the moment we go live.</Text>
            </View>
          )}

          {/* Member Onboarding */}
          <TouchableOpacity style={s.onboardCard} onPress={() => router.push('/(tabs)/member-onboarding')} activeOpacity={0.85}>
            <View style={s.onboardLeft}>
              <View style={s.onboardTag}><Text style={s.onboardTagTxt}>START HERE</Text></View>
              <Text style={s.onboardTitle}>Member Onboarding</Text>
              <Text style={s.onboardSub}>7 steps to get fully set up and ready to trade.</Text>
            </View>
            <Text style={s.onboardArrow}>→</Text>
          </TouchableOpacity>

          {/* Daily Mindset */}
          <View style={s.mindsetCard}>
            <Text style={s.mindsetLabel}>DAILY MINDSET</Text>
            <Text style={s.mindsetQuote}>"{dailyQuote}"</Text>
            <Text style={s.mindsetSig}>— The Greenprint</Text>
          </View>

          {/* Feature Cards Row */}
          <Text style={s.sectionLabel}>TOOLS & FEATURES</Text>
          <View style={s.featureRow}>
            <TouchableOpacity style={s.featureCard} onPress={() => router.push('/(tabs)/journal')} activeOpacity={0.8}>
              <Text style={s.featureIcon}>📒</Text>
              <Text style={s.featureTitle}>Trade Journal</Text>
              <Text style={s.featureSub}>Log & track every trade</Text>
              <View style={s.featureBadge}><Text style={s.featureBadgeTxt}>ACTIVE</Text></View>
            </TouchableOpacity>

            <View style={[s.featureCard, s.featureCardDim]}>
              <Text style={s.featureIcon}>🔍</Text>
              <Text style={s.featureTitle}>Scanner</Text>
              <Text style={s.featureSub}>AI market scanner</Text>
              <View style={[s.featureBadge, s.featureBadgeSoon]}><Text style={[s.featureBadgeTxt, { color: '#FFD166' }]}>SOON</Text></View>
            </View>
          </View>

          <View style={s.featureRow}>
            <View style={[s.featureCard, s.featureCardDim]}>
              <Text style={s.featureIcon}>⚡</Text>
              <Text style={s.featureTitle}>Signals</Text>
              <Text style={s.featureSub}>Live trade alerts</Text>
              <View style={[s.featureBadge, s.featureBadgeSoon]}><Text style={[s.featureBadgeTxt, { color: '#FFD166' }]}>SOON</Text></View>
            </View>

            <View style={[s.featureCard, s.featureCardDim]}>
              <Text style={s.featureIcon}>🎓</Text>
              <Text style={s.featureTitle}>Education</Text>
              <Text style={s.featureSub}>Full course library</Text>
              <View style={[s.featureBadge, s.featureBadgeSoon]}><Text style={[s.featureBadgeTxt, { color: '#FFD166' }]}>SOON</Text></View>
            </View>
          </View>

          {/* Broker Setup */}
          <Text style={s.sectionLabel}>RECOMMENDED BROKER</Text>
          <TouchableOpacity
            style={s.brokerCard}
            onPress={() => Linking.openURL('https://dashboard.genesisfxmarkets.com/auth/register?ref=JACWAL843')}
            activeOpacity={0.85}
          >
            <View style={s.brokerLeft}>
              <Text style={s.brokerName}>GenesisFX Markets</Text>
              <Text style={s.brokerSub}>The Greenprint's recommended broker. Use our referral link to get started with a demo or live account.</Text>
              <Text style={s.brokerLink}>Open Account →</Text>
            </View>
            <Text style={s.brokerIcon}>🏦</Text>
          </TouchableOpacity>

          {/* Community Links */}
          <Text style={s.sectionLabel}>COMMUNITY</Text>
          <View style={s.linksRow}>
            <TouchableOpacity style={s.linkCard} onPress={() => Linking.openURL('https://t.me/+Hz_sp0s32jVjNDQx')} activeOpacity={0.8}>
              <Text style={s.linkIcon}>✈️</Text>
              <Text style={s.linkLabel}>Telegram</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.linkCard} onPress={() => Linking.openURL('https://thegreenprint.trade')} activeOpacity={0.8}>
              <Text style={s.linkIcon}>🌐</Text>
              <Text style={s.linkLabel}>Website</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.linkCard} onPress={() => router.push('/(tabs)/chat')} activeOpacity={0.8}>
              <Text style={s.linkIcon}>💬</Text>
              <Text style={s.linkLabel}>Chat</Text>
            </TouchableOpacity>
          </View>

          {/* Announcements */}
          {announcements.length > 0 && (
            <View style={{ marginBottom: 20 }}>
              <Text style={s.sectionLabel}>ANNOUNCEMENTS</Text>
              {announcements.map(a => (
                <View key={a.id} style={s.card}>
                  <Text style={s.cardSender}>📢 The Greenprint</Text>
                  <Text style={s.cardText}>{a.message || a.text || ''}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Legal Disclaimer */}
          <View style={s.disclaimer}>
            <Text style={s.disclaimerTxt}>
              ⚖️  For educational purposes only. Not financial advice. Trading involves risk. See Terms & Privacy for full disclaimer.
            </Text>
          </View>

        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const s = StyleSheet.create({
  root:   { flex: 1, backgroundColor: '#000' },
  scroll: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 40 },

  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 },
  logoLabel: { fontSize: 10, fontWeight: '700', letterSpacing: 3, color: colors.accent, marginBottom: 4 },
  greeting:  { fontSize: 18, fontWeight: '700', color: '#FFF' },
  adminBtn:  { paddingHorizontal: 14, paddingVertical: 7, backgroundColor: 'rgba(0,255,135,0.08)', borderRadius: 99, borderWidth: 1, borderColor: 'rgba(0,255,135,0.2)' },
  adminTxt:  { fontSize: 12, fontWeight: '600', color: colors.accent },

  liveBanner: { backgroundColor: 'rgba(0,255,135,0.06)', borderRadius: 16, borderWidth: 1, borderColor: 'rgba(0,255,135,0.25)', padding: 20, marginBottom: 16 },
  livePill:   { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 },
  liveDot:    { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.accent },
  livePillTxt:{ fontSize: 10, fontWeight: '700', letterSpacing: 2, color: colors.accent },
  liveTitle:  { fontSize: 20, fontWeight: '700', color: '#FFF', marginBottom: 10 },
  liveAction: { fontSize: 13, fontWeight: '600', color: colors.accent },

  offlineBanner: { backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)', padding: 20, marginBottom: 16, alignItems: 'center' },
  offlineIcon:   { fontSize: 24, color: 'rgba(255,255,255,0.12)', marginBottom: 8 },
  offlineTitle:  { fontSize: 15, fontWeight: '600', color: 'rgba(255,255,255,0.35)', marginBottom: 4 },
  offlineSub:    { fontSize: 12, color: 'rgba(255,255,255,0.2)', textAlign: 'center' },

  onboardCard:   { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(0,255,135,0.06)', borderRadius: 16, borderWidth: 1, borderColor: 'rgba(0,255,135,0.2)', padding: 18, marginBottom: 16 },
  onboardLeft:   { flex: 1 },
  onboardTag:    { backgroundColor: 'rgba(0,255,135,0.12)', borderRadius: 99, paddingHorizontal: 8, paddingVertical: 3, alignSelf: 'flex-start', marginBottom: 8 },
  onboardTagTxt: { fontSize: 9, fontWeight: '700', letterSpacing: 2, color: colors.accent },
  onboardTitle:  { fontSize: 17, fontWeight: '800', color: '#FFF', marginBottom: 4 },
  onboardSub:    { fontSize: 12, color: 'rgba(255,255,255,0.4)' },
  onboardArrow:  { fontSize: 20, color: colors.accent, fontWeight: '700' },

  mindsetCard: { backgroundColor: '#0A0A0A', borderRadius: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)', padding: 20, marginBottom: 24, borderLeftWidth: 3, borderLeftColor: colors.accent },
  mindsetLabel: { fontSize: 9, fontWeight: '700', letterSpacing: 2.5, color: colors.accent, marginBottom: 10 },
  mindsetQuote: { fontSize: 15, color: 'rgba(255,255,255,0.75)', lineHeight: 24, fontStyle: 'italic', marginBottom: 8 },
  mindsetSig:   { fontSize: 11, color: 'rgba(255,255,255,0.25)', fontWeight: '600' },

  sectionLabel: { fontSize: 9, fontWeight: '700', letterSpacing: 2.5, color: 'rgba(255,255,255,0.25)', marginBottom: 12 },

  featureRow:     { flexDirection: 'row', gap: 10, marginBottom: 10 },
  featureCard:    { flex: 1, backgroundColor: '#0D0D0D', borderRadius: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)', padding: 16, gap: 4 },
  featureCardDim: { opacity: 0.6 },
  featureIcon:    { fontSize: 24, marginBottom: 4 },
  featureTitle:   { fontSize: 14, fontWeight: '700', color: '#FFF' },
  featureSub:     { fontSize: 11, color: '#555', marginBottom: 8 },
  featureBadge:   { backgroundColor: 'rgba(0,255,135,0.1)', borderRadius: 99, paddingHorizontal: 8, paddingVertical: 3, alignSelf: 'flex-start', borderWidth: 1, borderColor: 'rgba(0,255,135,0.2)' },
  featureBadgeSoon: { backgroundColor: 'rgba(255,209,102,0.08)', borderColor: 'rgba(255,209,102,0.2)' },
  featureBadgeTxt:  { fontSize: 8, fontWeight: '700', letterSpacing: 1.5, color: colors.accent },

  brokerCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#0D0D0D', borderRadius: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)', padding: 18, marginBottom: 24 },
  brokerLeft: { flex: 1 },
  brokerName: { fontSize: 16, fontWeight: '700', color: '#FFF', marginBottom: 6 },
  brokerSub:  { fontSize: 12, color: '#555', lineHeight: 18, marginBottom: 10 },
  brokerLink: { fontSize: 13, fontWeight: '700', color: colors.accent },
  brokerIcon: { fontSize: 32, marginLeft: 12 },

  linksRow: { flexDirection: 'row', gap: 10, marginBottom: 24 },
  linkCard: { flex: 1, backgroundColor: '#0D0D0D', borderRadius: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)', paddingVertical: 16, alignItems: 'center', gap: 6 },
  linkIcon:  { fontSize: 22 },
  linkLabel: { fontSize: 11, fontWeight: '600', color: '#555' },

  card:       { backgroundColor: '#0D0D0D', borderRadius: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)', padding: 16, marginBottom: 10 },
  cardSender: { fontSize: 11, fontWeight: '700', color: colors.accent, marginBottom: 6 },
  cardText:   { fontSize: 14, color: 'rgba(255,255,255,0.7)', lineHeight: 22 },

  disclaimer:    { backgroundColor: 'rgba(255,255,255,0.02)', borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)', padding: 16, marginBottom: 8 },
  disclaimerTxt: { fontSize: 11, color: 'rgba(255,255,255,0.2)', lineHeight: 18, textAlign: 'center' },
});
